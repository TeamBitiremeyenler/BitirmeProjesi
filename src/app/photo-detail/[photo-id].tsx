import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ActivityIndicator,
    Alert,
    AppState,
    Dimensions,
    FlatList,
    Image as RNImage,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { ChevronLeft, Pencil, Share2, Trash2, Sparkles } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { uploadSearchablePhoto } from '@/src/lib/api/upload';
import { getGalleryCacheSnapshot, subscribeGalleryCache, warmRemainingLibraryAssets } from '@/src/lib/gallery-cache';
import { getPickedAsset, listPickedAssets, type PickedAssetEntry } from '@/src/lib/local-sync-store';
import { getAssetById, getVersionedMediaUri, type Asset, type AssetInfo } from '@/src/lib/media-library';
import { MOCK_PHOTOS } from '@/src/lib/mock-photos';
import { goBackOrReplace } from '@/src/lib/navigation';
import { removeSavedLibraryAsset } from '@/src/lib/saved-assets-store';

type BasicMeta = {
    creationTime: number;
    width: number;
    height: number;
};

type GalleryPhoto = {
    id: string;
    uri: string;
    filename?: string | null;
    creationTime: number;
    modificationTime: number;
    width: number;
    height: number;
    source: 'library' | 'picked' | 'mock';
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAGE_WIDTH = SCREEN_WIDTH;
const STAGE_WIDTH = SCREEN_WIDTH - 24;
const STAGE_HEIGHT = Math.max(220, Math.min(SCREEN_HEIGHT * 0.38, STAGE_WIDTH));
const THUMB_SIZE = 64;
const THUMB_GAP = 10;
const THUMB_ITEM_STRIDE = THUMB_SIZE + THUMB_GAP;
const THUMB_CONTENT_HORIZONTAL_PADDING = 12;

function toGalleryPhotoFromAsset(
    asset: Pick<Asset, 'id' | 'uri' | 'filename' | 'creationTime' | 'modificationTime' | 'width' | 'height'>,
    source: GalleryPhoto['source']
): GalleryPhoto {
    return {
        id: asset.id,
        uri: asset.uri,
        filename: asset.filename,
        creationTime: asset.creationTime ?? Date.now(),
        modificationTime: asset.modificationTime ?? asset.creationTime ?? Date.now(),
        width: asset.width ?? 0,
        height: asset.height ?? 0,
        source,
    };
}

function mergeCurrentPhotoIntoGallery(photos: GalleryPhoto[], currentPhoto: GalleryPhoto | null): GalleryPhoto[] {
    if (!currentPhoto) return photos;

    let found = false;
    const merged = photos.map((photo) => {
        if (photo.id !== currentPhoto.id) return photo;
        found = true;
        return {
            ...photo,
            uri: currentPhoto.uri,
            width: currentPhoto.width || photo.width,
            height: currentPhoto.height || photo.height,
            creationTime: currentPhoto.creationTime || photo.creationTime,
            modificationTime: currentPhoto.modificationTime || photo.modificationTime,
            filename: currentPhoto.filename ?? photo.filename,
        };
    });

    return found ? merged : [currentPhoto, ...merged];
}

function toGalleryPhotoFromPicked(entry: PickedAssetEntry): GalleryPhoto | null {
    if (!entry.asset.uri) return null;

    return {
        id: entry.id,
        uri: entry.asset.uri,
        filename: entry.asset.filename,
        creationTime: entry.asset.creationTime ?? Date.now(),
        modificationTime: entry.asset.creationTime ?? Date.now(),
        width: 0,
        height: 0,
        source: 'picked',
    };
}

function formatDate(ms: number) {
    return new Date(ms).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export default function PhotoDetail() {
    const router = useRouter();
    const { 'photo-id': photoId } = useLocalSearchParams<{ 'photo-id': string }>();
    const insets = useSafeAreaInsets();
    const pagerRef = useRef<FlatList<GalleryPhoto>>(null);
    const thumbRef = useRef<FlatList<GalleryPhoto>>(null);
    const appStateRef = useRef(AppState.currentState);
    const lastSyncedGallerySignatureRef = useRef('');
    const assetInfoCacheRef = useRef<Record<string, AssetInfo>>({});
    const lastAssetRefreshAtRef = useRef(0);
    const lastPagerPreviewIndexRef = useRef(0);
    const isPagerDraggingRef = useRef(false);
    const hasInitializedThumbRailRef = useRef(false);
    const lastThumbRailIndexRef = useRef(0);
    const isThumbDraggingRef = useRef(false);
    const lastThumbCenterIndexRef = useRef(0);

    const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
    const [currentPhotoId, setCurrentPhotoId] = useState(photoId ?? '');
    const [currentAsset, setCurrentAsset] = useState<AssetInfo | null>(null);
    const [measuredSize, setMeasuredSize] = useState<{ width: number; height: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isIndexing, setIsIndexing] = useState(false);
    const [indexStatus, setIndexStatus] = useState<string | null>(null);
    const [thumbPreviewIndex, setThumbPreviewIndex] = useState<number | null>(null);
    const [isThumbRailReady, setIsThumbRailReady] = useState(false);
    const [assetRefreshTick, setAssetRefreshTick] = useState(0);
    const gallerySignature = useMemo(
        () => galleryPhotos.map((photo) => photo.id).join('|'),
        [galleryPhotos]
    );

    const handleBack = useCallback(() => {
        goBackOrReplace(router, '/home');
    }, [router]);

    useEffect(() => {
        if (photoId) {
            setCurrentPhotoId(photoId);
        }
    }, [photoId]);

    useEffect(() => {
        lastSyncedGallerySignatureRef.current = '';
        lastPagerPreviewIndexRef.current = 0;
        isPagerDraggingRef.current = false;
        isThumbDraggingRef.current = false;
        lastThumbCenterIndexRef.current = 0;
        hasInitializedThumbRailRef.current = false;
        lastThumbRailIndexRef.current = 0;
        initialThumbOffsetRef.current = null;
        setThumbPreviewIndex(null);
        setIsThumbRailReady(false);
    }, [photoId]);

    useEffect(() => {
        let isMounted = true;
        let bootstrapped = false;

        async function loadGallery() {
            if (!photoId) return;

            setIsLoading(true);
            setError(null);
            setGalleryPhotos([]);
            setCurrentAsset(null);

            try {
                const mock = MOCK_PHOTOS.find((photo) => photo.id === photoId);
                if (mock) {
                    if (isMounted) {
                        setGalleryPhotos(MOCK_PHOTOS.map((photo) => toGalleryPhotoFromAsset(photo, 'mock')));
                        setIsLoading(false);
                        bootstrapped = true;
                    }
                    return;
                }

                if (photoId.startsWith('picked:')) {
                    const cachedPickedPhotos = getGalleryCacheSnapshot()
                        .pickedAssets
                        .map(toGalleryPhotoFromPicked)
                        .filter((photo): photo is GalleryPhoto => photo !== null);

                    if (cachedPickedPhotos.length > 0 && isMounted) {
                        setGalleryPhotos(cachedPickedPhotos);
                        if (cachedPickedPhotos.some((photo) => photo.id === photoId)) {
                            setIsLoading(false);
                            bootstrapped = true;
                        }
                    }

                    const pickedAsset = await getPickedAsset(photoId);

                    if (pickedAsset?.uri && isMounted) {
                        setGalleryPhotos((prev) => mergeCurrentPhotoIntoGallery(prev, {
                            id: photoId,
                            uri: pickedAsset.uri,
                            filename: pickedAsset.filename,
                            creationTime: pickedAsset.creationTime ?? Date.now(),
                            modificationTime: pickedAsset.creationTime ?? Date.now(),
                            width: 0,
                            height: 0,
                            source: 'picked',
                        }));
                        setIsLoading(false);
                        bootstrapped = true;
                    }

                    const pickedPhotos = (await listPickedAssets())
                        .map(toGalleryPhotoFromPicked)
                        .filter((photo): photo is GalleryPhoto => photo !== null);

                    if (isMounted) {
                        setGalleryPhotos(pickedPhotos);
                        setIsLoading(false);
                    }
                    return;
                }

                const snapshot = getGalleryCacheSnapshot();
                const cachedLibraryPhotos = snapshot.libraryAssets.map((asset) => toGalleryPhotoFromAsset(asset, 'library'));

                if (isMounted) {
                    setGalleryPhotos(cachedLibraryPhotos);
                    if (cachedLibraryPhotos.some((photo) => photo.id === photoId)) {
                        setIsLoading(false);
                        bootstrapped = true;
                    }
                }

                warmRemainingLibraryAssets().catch(() => undefined);
            } catch {
                if (isMounted) {
                    if (!bootstrapped) {
                        setError('Could not load photos.');
                        setGalleryPhotos([]);
                        setIsLoading(false);
                    }
                }
            }
        }

        loadGallery();

        return () => {
            isMounted = false;
        };
    }, [photoId]);

    useEffect(() => {
        if (!photoId) return;
        if (MOCK_PHOTOS.some((photo) => photo.id === photoId)) return;

        const syncFromCache = () => {
            const snapshot = getGalleryCacheSnapshot();

            if (photoId.startsWith('picked:')) {
                const pickedPhotos = snapshot.pickedAssets
                    .map(toGalleryPhotoFromPicked)
                    .filter((photo): photo is GalleryPhoto => photo !== null);

                if (pickedPhotos.length > 0) {
                    setGalleryPhotos((prev) => {
                        const current = prev.find((photo) => photo.id === currentPhotoId) ?? null;
                        return mergeCurrentPhotoIntoGallery(pickedPhotos, current);
                    });
                }
                return;
            }

            if (snapshot.libraryAssets.length > 0) {
                const cachedPhotos = snapshot.libraryAssets.map((asset) => toGalleryPhotoFromAsset(asset, 'library'));
                setGalleryPhotos((prev) => {
                    const current = prev.find((photo) => photo.id === currentPhotoId) ?? null;
                    return mergeCurrentPhotoIntoGallery(cachedPhotos, current);
                });
            }
        };

        syncFromCache();
        return subscribeGalleryCache(syncFromCache);
    }, [currentPhotoId, photoId]);

    const currentPhoto = useMemo(
        () => galleryPhotos.find((photo) => photo.id === currentPhotoId) ?? null,
        [galleryPhotos, currentPhotoId]
    );

    const currentIndex = useMemo(() => {
        if (!galleryPhotos.length) return 0;
        const foundIndex = galleryPhotos.findIndex((photo) => photo.id === currentPhotoId);
        return foundIndex >= 0 ? foundIndex : 0;
    }, [galleryPhotos, currentPhotoId]);

    const requestCurrentAssetRefresh = useCallback(() => {
        const now = Date.now();
        if (now - lastAssetRefreshAtRef.current < 700) return;
        lastAssetRefreshAtRef.current = now;
        setAssetRefreshTick((value) => value + 1);
    }, []);

    const previousPhoto = useMemo(
        () => (currentIndex > 0 ? galleryPhotos[currentIndex - 1] : null),
        [currentIndex, galleryPhotos]
    );
    const nextPhoto = useMemo(
        () => (currentIndex < galleryPhotos.length - 1 ? galleryPhotos[currentIndex + 1] : null),
        [currentIndex, galleryPhotos]
    );
    const activeThumbIndex = thumbPreviewIndex ?? currentIndex;

    const initialThumbOffsetRef = useRef<number | null>(null);
    if (initialThumbOffsetRef.current === null && galleryPhotos.length > 0) {
        const contentWidth =
            THUMB_CONTENT_HORIZONTAL_PADDING * 2
            + galleryPhotos.length * THUMB_SIZE
            + Math.max(0, galleryPhotos.length - 1) * THUMB_GAP;
        const centered =
            THUMB_CONTENT_HORIZONTAL_PADDING
            + currentIndex * THUMB_ITEM_STRIDE
            + THUMB_SIZE / 2
            - SCREEN_WIDTH / 2;
        const maxOffset = Math.max(0, contentWidth - SCREEN_WIDTH);
        initialThumbOffsetRef.current = Math.max(0, Math.min(centered, maxOffset));
    }

    const syncThumbRail = useCallback((index: number, animated: boolean) => {
        // Don't move thumb rail while user is dragging it
        if (isThumbDraggingRef.current) return;

        const roundedIndex = Math.max(0, Math.min(Math.round(index), galleryPhotos.length - 1));

        if (!animated && roundedIndex === lastThumbRailIndexRef.current) {
            return;
        }

        lastThumbRailIndexRef.current = roundedIndex;
        thumbRef.current?.scrollToIndex({
            index: roundedIndex,
            animated,
            viewPosition: 0.5,
        });
    }, [galleryPhotos.length]);


    useEffect(() => {
        if (!galleryPhotos.length) return;
        if (lastSyncedGallerySignatureRef.current === gallerySignature) return;

        const syncScroll = () => {
            pagerRef.current?.scrollToIndex({ index: currentIndex, animated: false });
            if (isThumbRailReady) {
                syncThumbRail(currentIndex, false);
            }
        };

        lastSyncedGallerySignatureRef.current = gallerySignature;
        const frame = requestAnimationFrame(syncScroll);
        lastPagerPreviewIndexRef.current = currentIndex;
        return () => cancelAnimationFrame(frame);
    }, [currentIndex, galleryPhotos.length, gallerySignature, isThumbRailReady, syncThumbRail]);

    useEffect(() => {
        if (!galleryPhotos.length || hasInitializedThumbRailRef.current) return;

        const frame = requestAnimationFrame(() => {
            pagerRef.current?.scrollToIndex({ index: currentIndex, animated: false });
            lastThumbRailIndexRef.current = currentIndex;
            hasInitializedThumbRailRef.current = true;
            setIsThumbRailReady(true);
        });

        return () => cancelAnimationFrame(frame);
    }, [currentIndex, galleryPhotos.length]);

    useEffect(() => {
        if (thumbPreviewIndex === null) return;
        if (thumbPreviewIndex === currentIndex) {
            setThumbPreviewIndex(null);
        }
    }, [currentIndex, thumbPreviewIndex]);

    useEffect(() => {
        const urisToPrefetch = [currentPhoto?.uri, previousPhoto?.uri, nextPhoto?.uri].filter(
            (uri): uri is string => Boolean(uri)
        );

        urisToPrefetch.forEach((uri) => {
            RNImage.prefetch(uri).catch(() => undefined);
        });
    }, [currentPhoto?.uri, nextPhoto?.uri, previousPhoto?.uri]);

    useEffect(() => {
        if (!currentPhotoId) return;
        if (currentPhotoId.startsWith('picked:')) return;
        if (MOCK_PHOTOS.some((photo) => photo.id === currentPhotoId)) return;

        const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
            const wasBackgrounded = /inactive|background/.test(appStateRef.current);
            appStateRef.current = nextAppState;

            if (wasBackgrounded && nextAppState === 'active') {
                requestCurrentAssetRefresh();
            }
        });

        const mediaLibrarySubscription = MediaLibrary.addListener(() => {
            requestCurrentAssetRefresh();
        });

        return () => {
            appStateSubscription.remove();
            mediaLibrarySubscription.remove();
        };
    }, [currentPhotoId, requestCurrentAssetRefresh]);

    useEffect(() => {
        let isMounted = true;
        const cachedInfo = assetInfoCacheRef.current[currentPhotoId];

        if (cachedInfo) {
            setCurrentAsset(cachedInfo);
            setGalleryPhotos((prev) => mergeCurrentPhotoIntoGallery(prev, {
                id: cachedInfo.id,
                uri: cachedInfo.localUri ?? cachedInfo.uri,
                filename: cachedInfo.filename,
                creationTime: cachedInfo.creationTime,
                modificationTime: cachedInfo.modificationTime ?? cachedInfo.creationTime,
                width: cachedInfo.width,
                height: cachedInfo.height,
                source: 'library',
            }));
            setIsLoading(false);
        }

        async function loadCurrentAsset() {
            if (!currentPhotoId) return;

            const mock = MOCK_PHOTOS.find((photo) => photo.id === currentPhotoId);
            if (mock || currentPhotoId.startsWith('picked:')) {
                return;
            }

            try {
                const info = await getAssetById(currentPhotoId);
                if (!info || !isMounted) return;
                assetInfoCacheRef.current[currentPhotoId] = info;
                setCurrentAsset(info);
                setGalleryPhotos((prev) => mergeCurrentPhotoIntoGallery(prev, {
                    id: info.id,
                    uri: info.localUri ?? info.uri,
                    filename: info.filename,
                    creationTime: info.creationTime,
                    modificationTime: info.modificationTime ?? info.creationTime,
                    width: info.width,
                    height: info.height,
                    source: 'library',
                }));
                setIsLoading(false);
            } catch {
                if (isMounted) {
                    setCurrentAsset(null);
                }
            }
        }

        loadCurrentAsset();

        return () => {
            isMounted = false;
        };
    }, [assetRefreshTick, currentPhotoId]);

    const activeAsset = currentAsset?.id === currentPhotoId ? currentAsset : null;
    const imageUri = activeAsset?.localUri ?? activeAsset?.uri ?? currentPhoto?.uri ?? null;

    const displayedMeta = useMemo<BasicMeta | null>(() => {
        if (activeAsset) {
            return {
                creationTime: activeAsset.creationTime,
                width: activeAsset.width,
                height: activeAsset.height,
            };
        }

        if (!currentPhoto) return null;

        return {
            creationTime: currentPhoto.creationTime,
            width: currentPhoto.width,
            height: currentPhoto.height,
        };
    }, [activeAsset, currentPhoto]);

    useEffect(() => {
        if (!imageUri) return;

        const metaWidth = displayedMeta?.width ?? 0;
        const metaHeight = displayedMeta?.height ?? 0;

        if (metaWidth > 0 && metaHeight > 0) {
            setMeasuredSize(null);
            return;
        }

        let isMounted = true;
        RNImage.getSize(
            imageUri,
            (width, height) => {
                if (isMounted) {
                    setMeasuredSize({ width, height });
                }
            },
            () => {
                if (isMounted) {
                    setMeasuredSize(null);
                }
            }
        );

        return () => {
            isMounted = false;
        };
    }, [displayedMeta?.height, displayedMeta?.width, imageUri]);

    const resolvedMeta = useMemo(() => {
        if (!displayedMeta) return null;

        return {
            ...displayedMeta,
            width: displayedMeta.width || measuredSize?.width || 0,
            height: displayedMeta.height || measuredSize?.height || 0,
        };
    }, [displayedMeta, measuredSize]);

    useEffect(() => {
        if (!photoId || !galleryPhotos.length) return;
        if (currentPhotoId === photoId) return;
        if (!galleryPhotos.some((photo) => photo.id === currentPhotoId)) {
            setCurrentPhotoId(galleryPhotos[0].id);
        }
    }, [currentPhotoId, galleryPhotos, photoId]);

    const handleShare = useCallback(async () => {
        if (!imageUri) return;

        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Error', 'Sharing is not available on this device.');
                return;
            }
            await Sharing.shareAsync(imageUri);
        } catch {
            // Ignore native share cancellation.
        }
    }, [imageUri]);

    const handleDelete = useCallback(() => {
        if (!activeAsset) {
            Alert.alert('Unavailable', 'Only device gallery photos can be deleted from here.');
            return;
        }

        Alert.alert(
            'Delete Photo',
            'This photo will be permanently deleted from your device.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { status } = await MediaLibrary.requestPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert('Permission Required', 'Storage permission is needed to delete photos.');
                                return;
                            }
                            await MediaLibrary.deleteAssetsAsync([activeAsset.id]);
                            await removeSavedLibraryAsset(activeAsset.id);
                            goBackOrReplace(router, '/home');
                        } catch (deleteError) {
                            console.error('Delete error:', deleteError);
                            Alert.alert('Error', 'Could not delete the photo.');
                        }
                    },
                },
            ],
        );
    }, [activeAsset, router]);

    const handleIndexForSearch = useCallback(async () => {
        if (!currentPhotoId || !activeAsset) return;

        setIsIndexing(true);
        setIndexStatus(null);

        try {
            const result = await uploadSearchablePhoto({
                assetId: currentPhotoId,
                asset: activeAsset,
            });

            setIndexStatus('Photo queued for semantic search. Wait 5-10 seconds, then search from Home.');
            Alert.alert('Indexed', `Upload queued. Image UUID: ${result.imageUuid}`);
        } catch (uploadError) {
            const message =
                uploadError instanceof Error
                    ? uploadError.message
                    : 'Upload failed.';

            setIndexStatus(`Indexing failed: ${message}`);
        } finally {
            setIsIndexing(false);
        }
    }, [activeAsset, currentPhotoId]);

    const showPhotoAtIndex = useCallback((index: number) => {
        if (!galleryPhotos[index]) return;

        isPagerDraggingRef.current = false;
        lastPagerPreviewIndexRef.current = index;
        setThumbPreviewIndex(null);
        setCurrentPhotoId(galleryPhotos[index].id);
        pagerRef.current?.scrollToIndex({ index, animated: false });
        syncThumbRail(index, true);
    }, [galleryPhotos, syncThumbRail]);

    const finalizePagerPosition = useCallback((offsetX: number) => {
        if (!galleryPhotos.length) return;

        const nextIndex = Math.round(offsetX / PAGE_WIDTH);
        const boundedIndex = Math.max(0, Math.min(nextIndex, galleryPhotos.length - 1));
        const nextPhoto = galleryPhotos[boundedIndex];

        lastPagerPreviewIndexRef.current = boundedIndex;
        syncThumbRail(boundedIndex, false);

        // Update currentPhotoId BEFORE clearing thumbPreviewIndex
        // so React batches both and activeThumbIndex never flickers
        if (nextPhoto && nextPhoto.id !== currentPhotoId) {
            setCurrentPhotoId(nextPhoto.id);
        }
        setThumbPreviewIndex(null);
    }, [currentPhotoId, galleryPhotos, syncThumbRail]);

    const handlePagerBeginDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!galleryPhotos.length) return;

        const startIndex = Math.max(
            0,
            Math.min(Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH), galleryPhotos.length - 1)
        );

        isPagerDraggingRef.current = true;
        lastPagerPreviewIndexRef.current = startIndex;
        setThumbPreviewIndex(null);
    }, [galleryPhotos.length]);

    const handlePagerScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!galleryPhotos.length || !isPagerDraggingRef.current) return;

        const progress = Math.max(0, Math.min(event.nativeEvent.contentOffset.x / PAGE_WIDTH, galleryPhotos.length - 1));
        const previewIndex = Math.round(progress);

        if (previewIndex === lastPagerPreviewIndexRef.current) return;

        lastPagerPreviewIndexRef.current = previewIndex;
        syncThumbRail(previewIndex, true);
        setThumbPreviewIndex(previewIndex === currentIndex ? null : previewIndex);
    }, [currentIndex, galleryPhotos, syncThumbRail]);

    const handlePagerEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const velocityX = event.nativeEvent.velocity?.x ?? 0;
        if (Math.abs(velocityX) >= 0.05) return;

        isPagerDraggingRef.current = false;
        finalizePagerPosition(event.nativeEvent.contentOffset.x);
    }, [finalizePagerPosition]);

    const handlePagerEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!galleryPhotos.length) return;
        if (!isPagerDraggingRef.current) return;

        isPagerDraggingRef.current = false;
        finalizePagerPosition(event.nativeEvent.contentOffset.x);
    }, [finalizePagerPosition, galleryPhotos.length]);

    const handleThumbBeginDrag = useCallback(() => {
        isThumbDraggingRef.current = true;
    }, []);

    const handleThumbScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!galleryPhotos.length || !isThumbDraggingRef.current) return;

        const offsetX = event.nativeEvent.contentOffset.x;
        // Find which thumb is at the center of the screen
        const centerX = offsetX + SCREEN_WIDTH / 2 - THUMB_CONTENT_HORIZONTAL_PADDING;
        const centerIndex = Math.round(centerX / THUMB_ITEM_STRIDE);
        const bounded = Math.max(0, Math.min(centerIndex, galleryPhotos.length - 1));

        if (bounded === lastThumbCenterIndexRef.current) return;

        lastThumbCenterIndexRef.current = bounded;
        lastPagerPreviewIndexRef.current = bounded;
        setThumbPreviewIndex(bounded === currentIndex ? null : bounded);
        pagerRef.current?.scrollToIndex({ index: bounded, animated: false });
    }, [currentIndex, galleryPhotos]);

    const finalizeThumbPosition = useCallback((offsetX: number) => {
        if (!galleryPhotos.length) return;
        isThumbDraggingRef.current = false;

        const centerX = offsetX + SCREEN_WIDTH / 2 - THUMB_CONTENT_HORIZONTAL_PADDING;
        const centerIndex = Math.round(centerX / THUMB_ITEM_STRIDE);
        const bounded = Math.max(0, Math.min(centerIndex, galleryPhotos.length - 1));

        lastPagerPreviewIndexRef.current = bounded;
        lastThumbCenterIndexRef.current = bounded;

        if (galleryPhotos[bounded] && galleryPhotos[bounded].id !== currentPhotoId) {
            setCurrentPhotoId(galleryPhotos[bounded].id);
        }
        setThumbPreviewIndex(null);
        pagerRef.current?.scrollToIndex({ index: bounded, animated: false });
    }, [currentPhotoId, galleryPhotos]);

    const handleThumbEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const velocityX = event.nativeEvent.velocity?.x ?? 0;
        if (Math.abs(velocityX) >= 0.05) return;
        finalizeThumbPosition(event.nativeEvent.contentOffset.x);
    }, [finalizeThumbPosition]);

    const handleThumbMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!isThumbDraggingRef.current) return;
        finalizeThumbPosition(event.nativeEvent.contentOffset.x);
    }, [finalizeThumbPosition]);

    const renderPagerItem = useCallback(({ item }: { item: GalleryPhoto }) => {
        const isCurrent = item.id === currentPhotoId;
        const imageRevision =
            isCurrent && activeAsset?.id === item.id
                ? activeAsset.modificationTime ?? activeAsset.creationTime
                : item.modificationTime ?? item.creationTime;
        const resolvedUri = getVersionedMediaUri(
            isCurrent ? (imageUri ?? item.uri) : item.uri,
            imageRevision,
        );

        return (
            <View style={styles.page}>
                <View style={styles.imageStage}>
                    <RNImage
                        key={`${item.id}:${imageRevision ?? 0}`}
                        source={{ uri: resolvedUri }}
                        style={styles.image}
                        resizeMode="contain"
                        fadeDuration={0}
                        progressiveRenderingEnabled={false}
                    />
                </View>
            </View>
        );
    }, [activeAsset, currentPhotoId, imageUri]);

    const renderThumbItem = useCallback(({ item, index }: { item: GalleryPhoto; index: number }) => {
        const isActive = index === activeThumbIndex;
        const imageRevision = item.modificationTime ?? item.creationTime;
        const thumbUri = getVersionedMediaUri(item.uri, imageRevision);
        return (
            <TouchableOpacity
                onPress={() => showPhotoAtIndex(index)}
                style={[styles.thumbItem, isActive && styles.thumbItemActive]}
                activeOpacity={0.9}
            >
                <RNImage
                    key={`${item.id}:${imageRevision ?? 0}`}
                    source={{ uri: thumbUri }}
                    style={styles.thumbImage}
                    resizeMode="cover"
                    fadeDuration={0}
                    progressiveRenderingEnabled={false}
                />
            </TouchableOpacity>
        );
    }, [activeThumbIndex, showPhotoAtIndex]);

    if (isLoading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (error || !currentPhoto) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <Text style={styles.errorText}>{error ?? 'Photo not found.'}</Text>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
                    <ChevronLeft size={24} color="#e5e7eb" />
                </TouchableOpacity>
                <Text style={styles.topTitle} numberOfLines={1}>
                    {resolvedMeta ? formatDate(resolvedMeta.creationTime) : 'Photo'}
                </Text>
                <View style={styles.topBarSpacer} />
            </View>

            <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <View style={styles.stageShell}>
                    <FlatList
                        ref={pagerRef}
                        data={galleryPhotos}
                        horizontal
                        pagingEnabled
                        initialScrollIndex={currentIndex}
                        decelerationRate="fast"
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id}
                        renderItem={renderPagerItem}
                        onScrollBeginDrag={handlePagerBeginDrag}
                        onScroll={handlePagerScroll}
                        onScrollEndDrag={handlePagerEndDrag}
                        scrollEventThrottle={16}
                        onMomentumScrollEnd={handlePagerEnd}
                        windowSize={3}
                        initialNumToRender={3}
                        maxToRenderPerBatch={3}
                        getItemLayout={(_, index) => ({
                            length: PAGE_WIDTH,
                            offset: PAGE_WIDTH * index,
                            index,
                        })}
                        onScrollToIndexFailed={({ index }) => {
                            setTimeout(() => {
                                pagerRef.current?.scrollToIndex({ index, animated: false });
                            }, 50);
                        }}
                    />
                </View>

                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        onPress={() => router.push(`/photo-edit/${currentPhotoId}` as any)}
                        style={[styles.actionButton, styles.primaryAction]}
                    >
                        <Pencil size={18} color="#fff" />
                        <Text style={styles.primaryActionText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                        <Share2 size={18} color="#111827" />
                        <Text style={styles.actionText}>Share</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleDelete} style={[styles.actionButton, styles.dangerAction]}>
                        <Trash2 size={18} color="#ef4444" />
                        <Text style={styles.dangerActionText}>Delete</Text>
                    </TouchableOpacity>
                </View>

                {galleryPhotos.length > 1 && isThumbRailReady ? (
                    <View style={styles.thumbRail}>
                        <FlatList
                            ref={thumbRef}
                            data={galleryPhotos}
                            horizontal
                            contentOffset={{ x: initialThumbOffsetRef.current ?? 0, y: 0 }}
                            decelerationRate="fast"
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item) => item.id}
                            renderItem={renderThumbItem}
                            contentContainerStyle={styles.thumbContent}
                            scrollEventThrottle={16}
                            onScrollBeginDrag={handleThumbBeginDrag}
                            onScroll={handleThumbScroll}
                            onScrollEndDrag={handleThumbEndDrag}
                            onMomentumScrollEnd={handleThumbMomentumEnd}
                            getItemLayout={(_, index) => ({
                                length: THUMB_SIZE + THUMB_GAP,
                                offset: (THUMB_SIZE + THUMB_GAP) * index,
                                index,
                            })}
                            onScrollToIndexFailed={({ index }) => {
                                setTimeout(() => {
                                    thumbRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
                                }, 50);
                            }}
                        />
                    </View>
                ) : null}

                <View style={styles.footer}>
                    {currentPhoto?.source === 'library' ? (
                        <TouchableOpacity
                            onPress={handleIndexForSearch}
                            disabled={isIndexing || !activeAsset}
                            style={[styles.indexButton, (isIndexing || !activeAsset) && styles.indexButtonDisabled]}
                        >
                            <Sparkles size={16} color="#fff" />
                            {isIndexing ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.indexButtonText}>Index for AI Search</Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.footerHint}>
                            Picked photos are already available for backend search testing.
                        </Text>
                    )}
                    {indexStatus ? <Text style={styles.footerHint}>{indexStatus}</Text> : null}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#050505' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#050505' },
    errorText: { fontSize: 15, color: '#737272', textAlign: 'center', marginBottom: 16 },
    backBtn: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    backBtnText: { color: '#fff', fontWeight: '600' },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 4,
    },
    iconBtn: { padding: 8 },
    topTitle: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'center', color: '#e5e7eb' },
    topBarSpacer: { width: 40 },
    content: {
        flex: 1,
        gap: 14,
    },
    stageShell: {
        height: STAGE_HEIGHT,
    },
    page: {
        width: PAGE_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageStage: {
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        borderRadius: 26,
        backgroundColor: '#0f0f10',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: '#0f0f10',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 12,
    },
    actionButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryAction: {
        backgroundColor: '#4f46e5',
    },
    primaryActionText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    actionText: {
        color: '#111827',
        fontSize: 14,
        fontWeight: '700',
    },
    dangerAction: {
        backgroundColor: '#1f1618',
    },
    deleteActionText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '800',
    },
    thumbRail: {
        minHeight: THUMB_SIZE + 4,
    },
    thumbContent: {
        paddingHorizontal: THUMB_CONTENT_HORIZONTAL_PADDING,
        gap: THUMB_GAP,
    },
    thumbItem: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#111827',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    thumbItemActive: {
        borderColor: '#818cf8',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
    footer: {
        marginTop: 'auto',
        paddingHorizontal: 12,
        gap: 8,
    },
    indexButton: {
        minHeight: 46,
        borderRadius: 18,
        backgroundColor: '#312e81',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        flexDirection: 'row',
        gap: 8,
    },
    indexButtonDisabled: {
        opacity: 0.7,
    },
    indexButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    footerHint: {
        fontSize: 12,
        lineHeight: 18,
        color: '#9ca3af',
    },
});
