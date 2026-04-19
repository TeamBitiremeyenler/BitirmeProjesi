import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ActivityIndicator,
    Alert,
    Animated,
    AppState,
    Dimensions,
    FlatList,
    Image as RNImage,
    KeyboardAvoidingView,
    LayoutChangeEvent,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Pencil, Send, Share2, Sparkles, Trash2, X } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { ZoomableImage } from '@/src/components/photo-detail/ZoomableImage';
import { editPhotoWithAI, AIError } from '@/src/lib/api/ai';
import { deleteIndexedPhoto } from '@/src/lib/api/search';
import {
    getGalleryCacheSnapshot,
    removeCachedLibraryAssets,
    removeCachedPickedAssets,
    subscribeGalleryCache,
    warmRemainingLibraryAssets,
} from '@/src/lib/gallery-cache';
import { getPickedAsset, listPickedAssets, removePickedAsset, type PickedAssetEntry } from '@/src/lib/local-sync-store';
import { getAssetById, getVersionedMediaUri, requestMediaPermission, type Asset, type AssetInfo } from '@/src/lib/media-library';
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
    source: GalleryPhoto['source'],
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
        width: entry.asset.width ?? 0,
        height: entry.asset.height ?? 0,
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
    const initialThumbOffsetRef = useRef<number | null>(null);
    const aiPanelAnim = useRef(new Animated.Value(0)).current;
    const chromeOpacity = useRef(new Animated.Value(1)).current;

    const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
    const [currentPhotoId, setCurrentPhotoId] = useState(photoId ?? '');
    const [currentAsset, setCurrentAsset] = useState<AssetInfo | null>(null);
    const [measuredSize, setMeasuredSize] = useState<{ width: number; height: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [thumbPreviewIndex, setThumbPreviewIndex] = useState<number | null>(null);
    const [isThumbRailReady, setIsThumbRailReady] = useState(false);
    const [assetRefreshTick, setAssetRefreshTick] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    const [isChromeVisible, setIsChromeVisible] = useState(true);
    const [aiPanelOpen, setAiPanelOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResultB64, setAiResultB64] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiCredits, setAiCredits] = useState<number | null>(null);
    const [isSavingAiResult, setIsSavingAiResult] = useState(false);
    const [stageSize, setStageSize] = useState<{ width: number; height: number }>({
        width: SCREEN_WIDTH,
        height: STAGE_HEIGHT,
    });

    const gallerySignature = useMemo(
        () => galleryPhotos.map((photo) => photo.id).join('|'),
        [galleryPhotos],
    );

    const handleBack = useCallback(() => {
        goBackOrReplace(router, '/home');
    }, [router]);

    const handleToggleChrome = useCallback(() => {
        chromeOpacity.stopAnimation();

        if (isChromeVisible) {
            Animated.timing(chromeOpacity, {
                toValue: 0,
                duration: 220,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) {
                    setIsChromeVisible(false);
                }
            });
            return;
        }

        setIsChromeVisible(true);
        Animated.timing(chromeOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
        }).start();
    }, [chromeOpacity, isChromeVisible]);

    const handleZoomChange = useCallback((zoomed: boolean) => {
        setIsZoomed(zoomed);
    }, []);

    const handleStageLayout = useCallback((event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) {
            setStageSize((prev) => (
                prev.width === width && prev.height === height
                    ? prev
                    : { width, height }
            ));
        }
    }, []);

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
        setIsZoomed(false);
        setIsChromeVisible(true);
        setAiPanelOpen(false);
        setAiPrompt('');
        setAiResultB64(null);
        setAiError(null);
        setAiCredits(null);
        aiPanelAnim.setValue(0);
        chromeOpacity.setValue(1);
    }, [aiPanelAnim, chromeOpacity, photoId]);

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

                    if (pickedAsset?.assetId) {
                        try {
                            await getAssetById(pickedAsset.assetId);
                        } catch {
                            await deleteIndexedPhoto(photoId).catch(() => undefined);
                            await removePickedAsset(photoId);
                            removeCachedPickedAssets([photoId]);

                            if (isMounted) {
                                setGalleryPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
                                setError('Photo not found.');
                                setIsLoading(false);
                            }
                            return;
                        }
                    }

                    if (pickedAsset?.uri && isMounted) {
                        setGalleryPhotos((prev) => mergeCurrentPhotoIntoGallery(prev, {
                            id: photoId,
                            uri: pickedAsset.uri,
                            filename: pickedAsset.filename,
                            creationTime: pickedAsset.creationTime ?? Date.now(),
                            modificationTime: pickedAsset.creationTime ?? Date.now(),
                            width: pickedAsset.width ?? 0,
                            height: pickedAsset.height ?? 0,
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
                if (isMounted && !bootstrapped) {
                    setError('Could not load photos.');
                    setGalleryPhotos([]);
                    setIsLoading(false);
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
        [galleryPhotos, currentPhotoId],
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
        [currentIndex, galleryPhotos],
    );
    const nextPhoto = useMemo(
        () => (currentIndex < galleryPhotos.length - 1 ? galleryPhotos[currentIndex + 1] : null),
        [currentIndex, galleryPhotos],
    );
    const activeThumbIndex = thumbPreviewIndex ?? currentIndex;

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
            (uri): uri is string => Boolean(uri),
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
                    delete assetInfoCacheRef.current[currentPhotoId];
                    removeCachedLibraryAssets([currentPhotoId]);
                    await removeSavedLibraryAsset(currentPhotoId);
                    setGalleryPhotos((prev) => prev.filter((photo) => photo.id !== currentPhotoId));
                    setError('Photo not found.');
                    setIsLoading(false);
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
            },
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

    const openAiPanel = useCallback(() => {
        if (!imageUri) {
            Alert.alert('Unavailable', 'This photo is still loading.');
            return;
        }

        setAiPanelOpen(true);
        setAiResultB64(null);
        setAiError(null);
        setAiPrompt('');
        setIsChromeVisible(true);
        chromeOpacity.setValue(1);
        Animated.spring(aiPanelAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
        }).start();
    }, [aiPanelAnim, chromeOpacity, imageUri]);

    const closeAiPanel = useCallback(() => {
        Animated.timing(aiPanelAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
        }).start(() => setAiPanelOpen(false));
    }, [aiPanelAnim]);

    const handleAskAI = useCallback(async () => {
        const trimmed = aiPrompt.trim();
        if (!trimmed || !imageUri) return;

        setAiLoading(true);
        setAiResultB64(null);
        setAiError(null);

        let base64: string;
        try {
            const isRemote = imageUri.startsWith('http://') || imageUri.startsWith('https://');

            if (isRemote) {
                const cacheUri = `${FileSystem.cacheDirectory}ai_input_${Date.now()}.jpg`;
                await FileSystem.downloadAsync(imageUri, cacheUri);
                base64 = await FileSystem.readAsStringAsync(cacheUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                FileSystem.deleteAsync(cacheUri, { idempotent: true }).catch(() => undefined);
            } else {
                base64 = await FileSystem.readAsStringAsync(imageUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
            }
        } catch {
            setAiLoading(false);
            setAiError('Could not load this photo. Please try again.');
            return;
        }

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            const imageDataUri = `data:image/jpeg;base64,${base64}`;
            const response = await editPhotoWithAI(
                {
                    prompt: trimmed,
                    imageUri: imageDataUri,
                },
                session?.access_token,
            );

            setAiResultB64(response.b64);
            setAiCredits(response.creditsRemaining);
        } catch (askError) {
            setAiError(
                askError instanceof AIError
                    ? askError.message
                    : `Unexpected error: ${String(askError)}`,
            );
        } finally {
            setAiLoading(false);
        }
    }, [aiPrompt, imageUri]);

    const handleSaveAiResult = useCallback(async () => {
        if (!aiResultB64) return;

        setIsSavingAiResult(true);
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync(true);
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Allow access to your photo library to save the edited image.');
                return;
            }

            const b64Data = aiResultB64.split(',')[1];
            if (!b64Data) throw new Error('Invalid base64 payload');

            const fileUri = `${FileSystem.cacheDirectory}ai_edit_${Date.now()}.png`;
            await FileSystem.writeAsStringAsync(fileUri, b64Data, {
                encoding: FileSystem.EncodingType.Base64,
            });
            const asset = await MediaLibrary.createAssetAsync(fileUri);
            await MediaLibrary.createAlbumAsync('Smart Gallery', asset, false).catch(() => undefined);
            await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => undefined);

            Alert.alert('Saved', 'The AI-edited image has been saved to your gallery.');
        } catch (saveError) {
            console.error('Save AI edit error:', saveError);
            const message = saveError instanceof Error ? saveError.message : 'Unknown error occurred.';
            Alert.alert('Error', `Could not save the image: ${message}`);
        } finally {
            setIsSavingAiResult(false);
        }
    }, [aiResultB64]);

    const handleDelete = useCallback(() => {
        if (currentPhoto?.source === 'mock') {
            Alert.alert('Unavailable', 'Demo photos are placeholders and are not stored on this device.');
            return;
        }

        if (currentPhoto?.source === 'picked') {
            Alert.alert(
                'Remove Photo',
                'This photo will be removed from Smart Gallery, its search data, and the original device gallery item when available.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                const pickedAsset = await getPickedAsset(currentPhoto.id);
                                const originalAssetId = pickedAsset?.assetId?.trim();

                                if (originalAssetId) {
                                    const hasPermission = await requestMediaPermission();
                                    if (!hasPermission) {
                                        Alert.alert('Permission Required', 'Storage permission is needed to delete the original photo.');
                                        return;
                                    }

                                    const originalAsset = await getAssetById(originalAssetId).catch(() => null);
                                    if (originalAsset) {
                                        const deleted = await MediaLibrary.deleteAssetsAsync([originalAsset]);
                                        if (!deleted) {
                                            Alert.alert('Delete Cancelled', 'The photo was not deleted from your device.');
                                            return;
                                        }
                                    }

                                    await removeSavedLibraryAsset(originalAssetId);
                                    removeCachedLibraryAssets([originalAssetId]);
                                }

                                await deleteIndexedPhoto(currentPhoto.id).catch(() => undefined);
                                await removePickedAsset(currentPhoto.id);
                                removeCachedPickedAssets([currentPhoto.id]);
                                goBackOrReplace(router, '/home');
                            } catch (deleteError) {
                                console.error('Picked delete error:', deleteError);
                                Alert.alert('Error', 'Could not remove the photo.');
                            }
                        },
                    },
                ],
            );
            return;
        }

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
                            const hasPermission = await requestMediaPermission();
                            if (!hasPermission) {
                                Alert.alert('Permission Required', 'Storage permission is needed to delete photos.');
                                return;
                            }
                            const deleted = await MediaLibrary.deleteAssetsAsync([activeAsset]);
                            if (!deleted) {
                                Alert.alert('Delete Cancelled', 'The photo was not deleted from your device.');
                                return;
                            }

                            await deleteIndexedPhoto(activeAsset.id).catch(() => undefined);
                            await removeSavedLibraryAsset(activeAsset.id);
                            removeCachedLibraryAssets([activeAsset.id]);
                            setGalleryPhotos((prev) => prev.filter((photo) => photo.id !== activeAsset.id));
                            goBackOrReplace(router, '/home');
                        } catch (deleteError) {
                            console.error('Delete error:', deleteError);
                            Alert.alert('Error', 'Could not delete the photo.');
                        }
                    },
                },
            ],
        );
    }, [activeAsset, currentPhoto, router]);

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

        if (nextPhoto && nextPhoto.id !== currentPhotoId) {
            setCurrentPhotoId(nextPhoto.id);
        }
        setThumbPreviewIndex(null);
    }, [currentPhotoId, galleryPhotos, syncThumbRail]);

    const handlePagerBeginDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!galleryPhotos.length) return;

        const startIndex = Math.max(
            0,
            Math.min(Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH), galleryPhotos.length - 1),
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
    }, [currentIndex, galleryPhotos.length, syncThumbRail]);

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
        const centerX = offsetX + SCREEN_WIDTH / 2 - THUMB_CONTENT_HORIZONTAL_PADDING;
        const centerIndex = Math.round(centerX / THUMB_ITEM_STRIDE);
        const bounded = Math.max(0, Math.min(centerIndex, galleryPhotos.length - 1));

        if (bounded === lastThumbCenterIndexRef.current) return;

        lastThumbCenterIndexRef.current = bounded;
        lastPagerPreviewIndexRef.current = bounded;
        setThumbPreviewIndex(bounded === currentIndex ? null : bounded);
        pagerRef.current?.scrollToIndex({ index: bounded, animated: false });
    }, [currentIndex, galleryPhotos.length]);

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
            <View style={[styles.page, { height: stageSize.height }]}>
                <View style={[styles.imageStage, { width: stageSize.width, height: stageSize.height }]}>
                    {isCurrent ? (
                        <ZoomableImage
                            key={`${item.id}:${imageRevision ?? 0}`}
                            uri={resolvedUri}
                            width={stageSize.width}
                            height={stageSize.height}
                            onZoomChange={handleZoomChange}
                            onSingleTap={handleToggleChrome}
                            onDismissRequest={handleBack}
                        />
                    ) : (
                        <RNImage
                            key={`${item.id}:${imageRevision ?? 0}`}
                            source={{ uri: resolvedUri }}
                            style={styles.image}
                            resizeMode="contain"
                            fadeDuration={0}
                            progressiveRenderingEnabled={false}
                        />
                    )}
                </View>
            </View>
        );
    }, [activeAsset, currentPhotoId, handleBack, handleToggleChrome, handleZoomChange, imageUri, stageSize]);

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
            <StatusBar style="light" />

            <Animated.View
                style={[styles.topBar, { opacity: chromeOpacity }]}
                pointerEvents={isChromeVisible ? 'auto' : 'none'}
            >
                <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
                    <ChevronLeft size={24} color="#e5e7eb" />
                </TouchableOpacity>
                <Text style={styles.topTitle} numberOfLines={1}>
                    {resolvedMeta ? formatDate(resolvedMeta.creationTime) : 'Photo'}
                </Text>
                <View style={styles.topBarSpacer} />
            </Animated.View>

            <View style={styles.content}>
                <View style={styles.stageShell} onLayout={handleStageLayout}>
                    <FlatList
                        ref={pagerRef}
                        data={galleryPhotos}
                        horizontal
                        pagingEnabled
                        scrollEnabled={!isZoomed}
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

                <Animated.View
                    style={[styles.actionsBar, { opacity: chromeOpacity }]}
                    pointerEvents={isChromeVisible ? 'auto' : 'none'}
                >
                    <TouchableOpacity onPress={handleShare} style={styles.actionTab}>
                        <Share2 size={22} strokeWidth={1.8} color="#e5e7eb" />
                        <Text style={styles.actionTabLabel}>Share</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push(`/photo-edit/${currentPhotoId}` as any)}
                        style={styles.actionTab}
                    >
                        <Pencil size={22} strokeWidth={1.8} color="#e5e7eb" />
                        <Text style={styles.actionTabLabel}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={openAiPanel} style={styles.actionTab}>
                        <Sparkles size={22} strokeWidth={1.8} color="#c7d2fe" />
                        <Text
                            style={[styles.actionTabLabel, styles.actionTabLabelAccent]}
                            numberOfLines={1}
                        >
                            Edit with AI
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleDelete} style={styles.actionTab}>
                        <Trash2 size={22} strokeWidth={1.8} color="#ef4444" />
                        <Text style={[styles.actionTabLabel, styles.actionTabLabelDanger]}>Delete</Text>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View
                    style={{ opacity: chromeOpacity }}
                    pointerEvents={isChromeVisible ? 'auto' : 'none'}
                >
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
                    ) : (
                        <View style={{ height: Math.max(insets.bottom, 8) }} />
                    )}

                </Animated.View>
            </View>

            <Modal
                visible={aiPanelOpen}
                transparent
                animationType="none"
                onRequestClose={closeAiPanel}
                statusBarTranslucent
            >
                <TouchableOpacity
                    style={styles.aiOverlay}
                    activeOpacity={1}
                    onPress={closeAiPanel}
                />
                <Animated.View
                    style={[
                        styles.aiSheet,
                        {
                            paddingBottom: Math.max(insets.bottom, 16),
                            transform: [{
                                translateY: aiPanelAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [520, 0],
                                }),
                            }],
                        },
                    ]}
                >
                    <View style={styles.aiSheetHeader}>
                        <View style={styles.aiSheetTitleRow}>
                            <Sparkles size={16} color="#8b5cf6" />
                            <Text style={styles.aiSheetTitle}>Edit with AI</Text>
                        </View>
                        <TouchableOpacity onPress={closeAiPanel} hitSlop={12}>
                            <X size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.aiChipsRow}
                    >
                        {[
                            'Make the sky more dramatic',
                            'Apply a vintage film look',
                            'Add golden hour lighting',
                            'Make it look like a painting',
                            'Add foggy atmosphere',
                        ].map((chip) => (
                            <TouchableOpacity
                                key={chip}
                                style={styles.aiChip}
                                onPress={() => setAiPrompt(chip)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.aiChipText} numberOfLines={1}>{chip}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <View style={styles.aiInputRow}>
                            <TextInput
                                style={styles.aiInput}
                                value={aiPrompt}
                                onChangeText={setAiPrompt}
                                placeholder="Describe your edit, e.g. make the sky dramatic"
                                placeholderTextColor="#6b7280"
                                multiline
                                maxLength={500}
                                returnKeyType="send"
                                onSubmitEditing={handleAskAI}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.aiSendBtn,
                                    (!aiPrompt.trim() || aiLoading) && styles.aiSendBtnDisabled,
                                ]}
                                onPress={handleAskAI}
                                disabled={!aiPrompt.trim() || aiLoading}
                            >
                                {aiLoading
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Send size={18} color="#fff" />}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>

                    {aiLoading ? (
                        <View style={styles.aiLoadingBox}>
                            <ActivityIndicator color="#8b5cf6" />
                            <Text style={styles.aiLoadingText}>AI is editing your photo...</Text>
                        </View>
                    ) : null}

                    {aiError ? (
                        <View style={styles.aiErrorBox}>
                            <Text style={styles.aiErrorText}>{aiError}</Text>
                        </View>
                    ) : null}

                    {aiResultB64 ? (
                        <View style={styles.aiResultContainer}>
                            <RNImage
                                source={{ uri: aiResultB64 }}
                                style={styles.aiResultImage}
                                resizeMode="cover"
                            />
                            <View style={styles.aiResultActions}>
                                <TouchableOpacity
                                    style={styles.aiResultBtn}
                                    onPress={handleSaveAiResult}
                                    disabled={isSavingAiResult}
                                >
                                    {isSavingAiResult ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.aiResultBtnText}>Save to Gallery</Text>
                                    )}
                                </TouchableOpacity>
                                {aiCredits !== null ? (
                                    <Text style={styles.aiCreditsText}>
                                        {aiCredits} edits left this hour
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    ) : null}
                </Animated.View>
            </Modal>
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
    content: { flex: 1 },
    stageShell: { flex: 1, backgroundColor: '#050505' },
    page: { width: PAGE_WIDTH, alignItems: 'center', justifyContent: 'center' },
    imageStage: {
        backgroundColor: '#050505',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    image: { width: '100%', height: '100%', backgroundColor: '#0f0f10' },
    actionsBar: {
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(18,18,22,0.92)',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: 4,
        paddingTop: 8,
        paddingBottom: 6,
    },
    actionTab: {
        flex: 1,
        minHeight: 54,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 4,
    },
    actionTabLabel: {
        color: '#e5e7eb',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.1,
    },
    actionTabLabelDanger: {
        color: '#ef4444',
    },
    actionTabLabelAccent: {
        color: '#c7d2fe',
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
    aiOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    aiSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: SCREEN_HEIGHT * 0.78,
        paddingHorizontal: 16,
        paddingTop: 14,
        gap: 12,
        backgroundColor: '#09090f',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    aiSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    aiSheetTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    aiSheetTitle: {
        color: '#f9fafb',
        fontSize: 16,
        fontWeight: '700',
    },
    aiChipsRow: {
        gap: 8,
        paddingVertical: 2,
    },
    aiChip: {
        maxWidth: 230,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(167,139,250,0.35)',
        backgroundColor: 'rgba(139,92,246,0.12)',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    aiChipText: {
        color: '#d8b4fe',
        fontSize: 12,
        fontWeight: '600',
    },
    aiInputRow: {
        minHeight: 58,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#11111a',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    aiInput: {
        flex: 1,
        maxHeight: 104,
        color: '#f9fafb',
        fontSize: 14,
        lineHeight: 20,
        paddingVertical: 4,
    },
    aiSendBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7c3aed',
    },
    aiSendBtnDisabled: {
        opacity: 0.45,
    },
    aiLoadingBox: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(139,92,246,0.12)',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    aiLoadingText: {
        color: '#c4b5fd',
        fontSize: 13,
        fontWeight: '600',
    },
    aiErrorBox: {
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(248,113,113,0.35)',
        backgroundColor: 'rgba(248,113,113,0.12)',
        padding: 12,
    },
    aiErrorText: {
        color: '#fca5a5',
        fontSize: 13,
        lineHeight: 19,
    },
    aiResultContainer: {
        overflow: 'hidden',
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(139,92,246,0.35)',
        backgroundColor: '#0f0f1a',
    },
    aiResultImage: {
        width: '100%',
        height: Math.min(220, SCREEN_HEIGHT * 0.26),
        backgroundColor: '#111827',
    },
    aiResultActions: {
        minHeight: 58,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: 12,
    },
    aiResultBtn: {
        minHeight: 40,
        minWidth: 128,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: '#7c3aed',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    aiResultBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    aiCreditsText: {
        flexShrink: 1,
        color: '#9ca3af',
        fontSize: 11,
        textAlign: 'right',
    },
});
