import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    BackHandler,
    Dimensions,
    Linking,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { X, Trash2, Share2 } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';

import {
    fetchPhotos,
    getAssetById,
    getMediaPermissionState,
    groupByDate,
    isExpoGoStoreClient,
    requestMediaPermission,
    type Asset,
} from '@/src/lib/media-library';
import { DUPLICATE_SMART_GALLERY_PHOTO, uploadPickedPhotoForSearch } from '@/src/lib/api/upload';
import { deleteIndexedPhoto } from '@/src/lib/api/search';
import { getPickedAsset, listPickedAssets, removePickedAsset } from '@/src/lib/local-sync-store';
import {
    appendCachedLibraryAssets,
    getGalleryCacheSnapshot,
    removeCachedLibraryAssets,
    removeCachedPickedAssets,
    replaceCachedLibraryAssets,
    replaceCachedPickedAssets,
    subscribeGalleryCache,
    warmRemainingLibraryAssets,
} from '@/src/lib/gallery-cache';
import {
    listSavedLibraryAssets,
    removeSavedLibraryAssets,
    subscribeSavedLibraryAssets,
} from '@/src/lib/saved-assets-store';
import { PhotoThumbnail } from './PhotoThumbnail';

const COLUMNS = 3;
const GAP = 2;
const SCREEN_WIDTH = Dimensions.get('window').width;
const THUMB_SIZE = Math.floor((SCREEN_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS);

type HeaderItem = { type: 'header'; title: string };
type RowItem = { type: 'row'; assets: Asset[] };
type ListItem = HeaderItem | RowItem;

function buildListItems(sections: { title: string; data: Asset[] }[]): ListItem[] {
    const items: ListItem[] = [];

    for (const section of sections) {
        items.push({ type: 'header', title: section.title });
        for (let index = 0; index < section.data.length; index += COLUMNS) {
            items.push({ type: 'row', assets: section.data.slice(index, index + COLUMNS) });
        }
    }

    return items;
}

function toPickedAsset(entry: {
    id: string;
    asset: {
        uri: string;
        filename?: string | null;
        width?: number | null;
        height?: number | null;
        creationTime?: number;
    };
}): Asset | null {
    if (!entry.asset.uri) return null;

    return {
        id: entry.id,
        filename: entry.asset.filename ?? `picked_${entry.id}.jpg`,
        uri: entry.asset.uri,
        mediaType: 'photo',
        mediaSubtypes: [],
        width: entry.asset.width ?? 0,
        height: entry.asset.height ?? 0,
        creationTime: entry.asset.creationTime ?? Date.now(),
        modificationTime: entry.asset.creationTime ?? Date.now(),
        duration: 0,
        albumId: undefined,
    } as Asset;
}

function mergeAssets(primaryAssets: Asset[], secondaryAssets: Asset[]): Asset[] {
    const sorted = [...secondaryAssets, ...primaryAssets].sort(
        (left, right) => (right.creationTime ?? 0) - (left.creationTime ?? 0)
    );
    const seen = new Set<string>();
    const merged: Asset[] = [];

    for (const asset of sorted) {
        const keys = getDedupeKeys(asset);
        if (keys.some((key) => seen.has(key))) continue;

        keys.forEach((key) => seen.add(key));
        merged.push(asset);
    }

    return merged;
}

function isPickedAssetId(id: string): boolean {
    return id.startsWith('picked:');
}

function assetIdsSignature(assets: Pick<Asset, 'id'>[]): string {
    return assets.map((asset) => asset.id).join('|');
}

function pickedIdsSignature(entries: { id: string }[]): string {
    return entries.map((entry) => entry.id).join('|');
}

function getDedupeKeys(asset: Asset): string[] {
    const keys = [asset.id, asset.uri].filter(Boolean);

    if (isPickedAssetId(asset.id)) {
        const originalAssetId = asset.id.slice('picked:'.length);
        if (originalAssetId && !originalAssetId.startsWith('uri-')) {
            keys.push(originalAssetId);
        }
    }

    return keys;
}

export function GalleryGrid() {
    const router = useRouter();

    const [permStatus, setPermStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isPickingPhoto, setIsPickingPhoto] = useState(false);
    const [pickerStatus, setPickerStatus] = useState<string | null>(null);
    const [pickedAssets, setPickedAssets] = useState<Asset[]>([]);
    const [savedLibraryAssets, setSavedLibraryAssets] = useState<Asset[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const cursorRef = useRef<string | undefined>(undefined);
    const hasMoreRef = useRef(true);
    const appStateRef = useRef(AppState.currentState);
    const refreshPromiseRef = useRef<Promise<void> | null>(null);
    const lastRefreshAtRef = useRef(0);
    const usesExpoGoFallback = permStatus === 'denied' && isExpoGoStoreClient();

    const selectionMode = selectedIds.size > 0;

    useEffect(() => {
        if (!selectionMode) return;

        const handler = BackHandler.addEventListener('hardwareBackPress', () => {
            setSelectedIds(new Set());
            return true;
        });

        return () => handler.remove();
    }, [selectionMode]);

    const refreshPickedAssets = useCallback(async () => {
        const entries = await listPickedAssets();

        if (permStatus === 'granted') {
            const staleEntryIds: string[] = [];

            for (const entry of entries) {
                const originalAssetId = entry.asset.assetId?.trim();
                if (!originalAssetId) continue;

                try {
                    await getAssetById(originalAssetId);
                } catch {
                    staleEntryIds.push(entry.id);
                }
            }

            if (staleEntryIds.length > 0) {
                await Promise.all(staleEntryIds.map(async (id) => {
                    await deleteIndexedPhoto(id).catch(() => undefined);
                    await removePickedAsset(id);
                }));
                removeCachedPickedAssets(staleEntryIds);
            }
        }

        const nextEntries = await listPickedAssets();
        const mapped = nextEntries
            .map(toPickedAsset)
            .filter((asset): asset is Asset => asset !== null);
        setPickedAssets(mapped);
        replaceCachedPickedAssets(nextEntries);
    }, [permStatus]);

    const refreshSavedLibraryAssets = useCallback(async () => {
        const saved = await listSavedLibraryAssets();

        if (permStatus === 'granted') {
            const staleAssetIds: string[] = [];

            for (const asset of saved) {
                try {
                    await getAssetById(asset.id);
                } catch {
                    staleAssetIds.push(asset.id);
                }
            }

            if (staleAssetIds.length > 0) {
                await removeSavedLibraryAssets(staleAssetIds);
                removeCachedLibraryAssets(staleAssetIds);
            }
        }

        setSavedLibraryAssets(await listSavedLibraryAssets());
    }, [permStatus]);

    const pruneMissingLibraryAssets = useCallback(async (candidateAssets = assets) => {
        if (permStatus !== 'granted' || candidateAssets.length === 0) return [];

        const missingIds: string[] = [];
        for (const asset of candidateAssets) {
            if (isPickedAssetId(asset.id)) continue;

            try {
                const info = await getAssetById(asset.id);
                if (!info?.id) {
                    missingIds.push(asset.id);
                }
            } catch {
                missingIds.push(asset.id);
            }
        }

        if (missingIds.length === 0) return [];

        const missing = new Set(missingIds);
        setAssets((prev) => prev.filter((asset) => !missing.has(asset.id)));
        setSavedLibraryAssets((prev) => prev.filter((asset) => !missing.has(asset.id)));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            missingIds.forEach((id) => next.delete(id));
            return next;
        });
        await removeSavedLibraryAssets(missingIds);
        removeCachedLibraryAssets(missingIds);

        return missingIds;
    }, [assets, permStatus]);

    const load = useCallback(async (reset = false) => {
        if (!hasMoreRef.current && !reset) return;

        const after = reset ? undefined : cursorRef.current;
        const page = await fetchPhotos(after);

        setAssets((prev) => (reset ? page.assets : [...prev, ...page.assets]));
        cursorRef.current = page.endCursor;
        hasMoreRef.current = page.hasNextPage;

        if (reset) {
            replaceCachedLibraryAssets(page.assets, page.endCursor, page.hasNextPage);
        } else {
            appendCachedLibraryAssets(page.assets, page.endCursor, page.hasNextPage);
        }
    }, []);

    const refreshLibraryAssets = useCallback(async () => {
        if (permStatus !== 'granted') return;

        await pruneMissingLibraryAssets();

        if (refreshPromiseRef.current) {
            await refreshPromiseRef.current;
            return;
        }

        cursorRef.current = undefined;
        hasMoreRef.current = true;

        const refreshPromise = load(true)
            .then(() => {
                warmRemainingLibraryAssets().catch(() => undefined);
            })
            .finally(() => {
                refreshPromiseRef.current = null;
            });

        refreshPromiseRef.current = refreshPromise;
        await refreshPromise;
    }, [load, permStatus, pruneMissingLibraryAssets]);

    const startLoad = useCallback(() => {
        setIsLoading(true);
        cursorRef.current = undefined;
        hasMoreRef.current = true;
        load(true)
            .finally(() => setIsLoading(false))
            .then(() => {
                warmRemainingLibraryAssets().catch(() => undefined);
            });
    }, [load]);

    useEffect(() => {
        refreshPickedAssets().catch(() => setPickedAssets([]));
    }, [refreshPickedAssets]);

    useEffect(() => {
        refreshSavedLibraryAssets().catch(() => setSavedLibraryAssets([]));
        return subscribeSavedLibraryAssets(() => {
            refreshSavedLibraryAssets().catch(() => undefined);
        });
    }, [refreshSavedLibraryAssets]);

    useEffect(() => {
        getMediaPermissionState()
            .then(async (permissionState) => {
                if (permissionState === 'granted' || permissionState === 'limited') {
                    setPermStatus('granted');
                    startLoad();
                    return;
                }

                if (permissionState === 'undetermined') {
                    const granted = await requestMediaPermission();
                    setPermStatus(granted ? 'granted' : 'denied');
                    if (granted) {
                        startLoad();
                    } else {
                        setIsLoading(false);
                    }
                    return;
                }

                setPermStatus('denied');
                setIsLoading(false);
            })
            .catch(() => {
                setPermStatus('denied');
                setIsLoading(false);
            });
    }, [startLoad]);

    useEffect(() => {
        if (permStatus === 'granted') startLoad();
    }, [permStatus, startLoad]);

    useEffect(() => subscribeGalleryCache(() => {
        const snapshot = getGalleryCacheSnapshot();

        setAssets((prev) => (
            assetIdsSignature(prev) === assetIdsSignature(snapshot.libraryAssets)
                ? prev
                : snapshot.libraryAssets
        ));

        setPickedAssets((prev) => {
            const nextPickedAssets = snapshot.pickedAssets
                .map(toPickedAsset)
                .filter((asset): asset is Asset => asset !== null);
            return assetIdsSignature(prev) === assetIdsSignature(nextPickedAssets)
                ? prev
                : nextPickedAssets;
        });

        setSelectedIds((prev) => {
            const allowedIds = new Set([
                ...snapshot.libraryAssets.map((asset) => asset.id),
                ...snapshot.pickedAssets.map((entry) => entry.id),
            ]);
            const next = new Set([...prev].filter((id) => allowedIds.has(id)));
            return pickedIdsSignature([...prev].map((id) => ({ id }))) === pickedIdsSignature([...next].map((id) => ({ id })))
                ? prev
                : next;
        });

        cursorRef.current = snapshot.libraryCursor;
        hasMoreRef.current = snapshot.libraryHasMore;
    }), []);

    useEffect(() => {
        if (permStatus !== 'granted') return;

        replaceCachedLibraryAssets(
            mergeAssets(assets, savedLibraryAssets),
            cursorRef.current,
            hasMoreRef.current,
        );
    }, [assets, permStatus, savedLibraryAssets]);

    useEffect(() => {
        if (permStatus !== 'granted') return;

        const triggerRefresh = () => {
            const now = Date.now();
            if (now - lastRefreshAtRef.current < 700) return;
            lastRefreshAtRef.current = now;
            refreshLibraryAssets().catch(() => undefined);
            refreshPickedAssets().catch(() => undefined);
            refreshSavedLibraryAssets().catch(() => undefined);
        };

        const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
            const wasBackgrounded = /inactive|background/.test(appStateRef.current);
            appStateRef.current = nextAppState;

            if (wasBackgrounded && nextAppState === 'active') {
                triggerRefresh();
            }
        });

        const mediaLibrarySubscription = MediaLibrary.addListener(() => {
            triggerRefresh();
        });

        return () => {
            appStateSubscription.remove();
            mediaLibrarySubscription.remove();
        };
    }, [permStatus, refreshLibraryAssets, refreshPickedAssets, refreshSavedLibraryAssets]);

    useFocusEffect(useCallback(() => {
        if (permStatus !== 'granted') return undefined;

        refreshLibraryAssets().catch(() => undefined);
        refreshPickedAssets().catch(() => undefined);
        refreshSavedLibraryAssets().catch(() => undefined);

        return undefined;
    }, [permStatus, refreshLibraryAssets, refreshPickedAssets, refreshSavedLibraryAssets]));

    const handleAllow = async () => {
        if (isExpoGoStoreClient()) {
            setPickerStatus(
                'Expo Go Android tam galeri erisimi vermez. Asagidaki butonla tek bir gercek foto secip test edebilirsin.'
            );
            return;
        }

        const granted = await requestMediaPermission();
        if (granted) {
            setPermStatus('granted');
        } else {
            Linking.openSettings();
        }
    };

    const handlePickAndIndexPhoto = useCallback(async () => {
        setIsPickingPhoto(true);
        setPickerStatus(null);

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: false,
                quality: 1,
            });

            if (result.canceled || !result.assets?.[0]) {
                setPickerStatus('Photo selection cancelled.');
                return;
            }

            const selectedAsset = result.assets[0];
            const uploadResult = await uploadPickedPhotoForSearch({
                uri: selectedAsset.uri,
                assetId: selectedAsset.assetId,
                filename: selectedAsset.fileName,
                width: selectedAsset.width,
                height: selectedAsset.height,
                creationTime: Date.now(),
            });

            setPickerStatus(
                'Photo imported. It will appear in Smart Gallery shortly.'
            );
            Alert.alert('Imported', `Photo saved. Image UUID: ${uploadResult.imageUuid}`);
            await refreshPickedAssets();
        } catch (error) {
            if (error instanceof Error && error.message === DUPLICATE_SMART_GALLERY_PHOTO) {
                Alert.alert('Zaten var', "Bu fotoğraf zaten Smart Gallery'de var.");
                setPickerStatus("Bu fotoğraf zaten Smart Gallery'de var.");
                await refreshPickedAssets();
                return;
            }

            const message = error instanceof Error ? error.message : 'Unexpected picker error.';
            setPickerStatus(`Import failed: ${message}`);
        } finally {
            setIsPickingPhoto(false);
        }
    }, [refreshPickedAssets]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await Promise.all([
            refreshLibraryAssets(),
            refreshPickedAssets(),
            refreshSavedLibraryAssets(),
        ]);
        setIsRefreshing(false);
    }, [refreshLibraryAssets, refreshPickedAssets, refreshSavedLibraryAssets]);

    const handleEndReached = useCallback(async () => {
        if (isLoadingMore || !hasMoreRef.current) return;

        setIsLoadingMore(true);
        await load(false);
        setIsLoadingMore(false);
    }, [isLoadingMore, load]);

    // --- Selection logic ---

    const handleLongPress = useCallback((asset: Asset) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.add(asset.id);
            return next;
        });
    }, []);

    const toggleSelection = useCallback((asset: Asset) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(asset.id)) {
                next.delete(asset.id);
            } else {
                next.add(asset.id);
            }
            return next;
        });
    }, []);

    const handlePress = useCallback((asset: Asset) => {
        if (selectionMode) {
            toggleSelection(asset);
        } else {
            router.push(`/photo-detail/${asset.id}`);
        }
    }, [router, selectionMode, toggleSelection]);

    const handleClearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const handleDeleteSelected = useCallback(() => {
        const count = selectedIds.size;
        if (count === 0) return;

        Alert.alert(
            'Delete Photos',
            `${count} photo${count > 1 ? 's' : ''} will be permanently deleted from your device.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const selectedIdList = [...selectedIds];
                            const pickedIds = selectedIdList.filter(isPickedAssetId);
                            const libraryIds = selectedIdList.filter((id) => !isPickedAssetId(id));

                            const pickedOriginalAssetIds: string[] = [];
                            for (const id of pickedIds) {
                                const pickedAsset = await getPickedAsset(id);
                                const originalAssetId = pickedAsset?.assetId?.trim();
                                if (originalAssetId) {
                                    pickedOriginalAssetIds.push(originalAssetId);
                                }
                            }

                            const deviceAssetIds = [...new Set([...libraryIds, ...pickedOriginalAssetIds])];
                            if (deviceAssetIds.length > 0) {
                                const hasPermission = await requestMediaPermission();
                                if (!hasPermission) {
                                    Alert.alert('Permission Required', 'Storage permission is needed to delete device photos.');
                                    return;
                                }

                                const deleted = await MediaLibrary.deleteAssetsAsync(deviceAssetIds);
                                if (!deleted) {
                                    Alert.alert('Delete Cancelled', 'The selected photos were not deleted from your device.');
                                    return;
                                }

                                await removeSavedLibraryAssets(deviceAssetIds);
                                removeCachedLibraryAssets(deviceAssetIds);
                                const removedDeviceIds = new Set(deviceAssetIds);
                                setAssets((prev) => prev.filter((asset) => !removedDeviceIds.has(asset.id)));
                                setSavedLibraryAssets((prev) => prev.filter((asset) => !removedDeviceIds.has(asset.id)));
                            }

                            for (const id of libraryIds) {
                                await deleteIndexedPhoto(id).catch(() => undefined);
                            }

                            for (const id of pickedIds) {
                                await deleteIndexedPhoto(id).catch(() => undefined);
                                await removePickedAsset(id);
                            }

                            if (pickedIds.length > 0) {
                                removeCachedPickedAssets(pickedIds);
                                const removedPickedIds = new Set(pickedIds);
                                setPickedAssets((prev) => prev.filter((asset) => !removedPickedIds.has(asset.id)));
                            }

                            setSelectedIds(new Set());
                            await refreshLibraryAssets();
                            await refreshPickedAssets();
                        } catch (e) {
                            console.error('Bulk delete error:', e);
                            Alert.alert('Error', 'Could not delete the selected photos.');
                        }
                    },
                },
            ],
        );
    }, [selectedIds, refreshLibraryAssets, refreshPickedAssets]);

    const handleShareSelected = useCallback(async () => {
        if (selectedIds.size === 0) return;

        const tempFiles: string[] = [];
        try {
            for (const id of selectedIds) {
                try {
                    const info = await getAssetById(id);
                    if (!info) continue;
                    const sourceUri = info.localUri ?? info.uri;
                    const ext = (info.filename?.split('.').pop() ?? 'jpg').toLowerCase();
                    const tempPath = `${FileSystem.cacheDirectory}share-${id.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
                    await FileSystem.copyAsync({ from: sourceUri, to: tempPath });
                    tempFiles.push(tempPath);
                } catch {
                    // Skip assets that can't be resolved
                }
            }

            if (tempFiles.length === 0) {
                Alert.alert('Error', 'Could not resolve the selected photos.');
                return;
            }

            const fileUris = tempFiles.map((p) => (p.startsWith('file://') ? p : `file://${p}`));
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
                return;
            }

            if (fileUris.length > 1) {
                Alert.alert('Sharing First Photo', 'Expo Go can share one selected photo at a time.');
            }

            await Sharing.shareAsync(fileUris[0], {
                mimeType: 'image/*',
                dialogTitle: 'Share photo',
            });
        } catch {
            // User cancelled share sheet
        } finally {
            for (const f of tempFiles) {
                FileSystem.deleteAsync(f, { idempotent: true }).catch(() => undefined);
            }
        }
    }, [selectedIds]);

    // --- End selection logic ---

    const combinedLibraryAssets = useMemo(
        () => mergeAssets(assets, savedLibraryAssets),
        [assets, savedLibraryAssets]
    );
    const combinedAssets = useMemo(
        () => mergeAssets(combinedLibraryAssets, pickedAssets),
        [combinedLibraryAssets, pickedAssets]
    );
    const deniedAssets = pickedAssets;
    const listItems = useMemo(() => buildListItems(groupByDate(combinedAssets)), [combinedAssets]);

    const renderItem = useCallback(({ item }: { item: ListItem }) => {
        if (item.type === 'header') {
            return (
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>{item.title}</Text>
                </View>
            );
        }

        return (
            <View style={styles.row}>
                {item.assets.map((asset) => (
                    <PhotoThumbnail
                        key={asset.id}
                        asset={asset}
                        size={THUMB_SIZE}
                        onPress={handlePress}
                        onLongPress={handleLongPress}
                        selected={selectedIds.has(asset.id)}
                        selectionMode={selectionMode}
                    />
                ))}
                {item.assets.length < COLUMNS
                    ? Array.from({ length: COLUMNS - item.assets.length }).map((_, index) => (
                        <View key={index} style={{ width: THUMB_SIZE, height: THUMB_SIZE }} />
                    ))
                    : null}
            </View>
        );
    }, [handlePress, handleLongPress, selectedIds, selectionMode]);

    const selectionToolbar = selectionMode ? (
        <View style={styles.selectionBar}>
            <View style={styles.selectionBarLeft}>
                <TouchableOpacity onPress={handleClearSelection} style={styles.selectionBarBtn}>
                    <X size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.selectionBarText}>{selectedIds.size} selected</Text>
            </View>
            <View style={styles.selectionBarRight}>
                <TouchableOpacity onPress={handleShareSelected} style={styles.selectionBarBtn}>
                    <Share2 size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDeleteSelected} style={styles.selectionBarBtn}>
                    <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    ) : null;

    if (permStatus === 'checking' || isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (permStatus === 'denied') {
        const mockItems = buildListItems(groupByDate(deniedAssets));

        return (
            <View style={{ flex: 1 }}>
                <View style={styles.mockBanner}>
                    <View style={styles.mockBannerContent}>
                        <Text style={styles.mockBannerText}>
                            {usesExpoGoFallback
                                ? 'Expo Go Android tam galeri erisimi vermez. Tek bir gercek foto secip uygulamada kullanabilirsin.'
                                : 'Photo access is off. Allow access to load your real gallery.'}
                        </Text>
                        {pickerStatus ? <Text style={styles.mockBannerSubtext}>{pickerStatus}</Text> : null}
                    </View>
                    <View style={styles.mockBannerActions}>
                        <TouchableOpacity onPress={handleAllow}>
                            <Text style={styles.mockBannerLink}>
                                {usesExpoGoFallback ? 'Why?' : 'Allow Access'}
                            </Text>
                        </TouchableOpacity>
                        {usesExpoGoFallback ? (
                            <TouchableOpacity
                                onPress={handlePickAndIndexPhoto}
                                disabled={isPickingPhoto}
                                style={styles.pickButton}
                            >
                                {isPickingPhoto ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.pickButtonText}>Pick Photo</Text>
                                )}
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
                <FlashList
                    data={mockItems}
                    renderItem={renderItem}
                    getItemType={(item) => item.type}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.msg}>No photos to show yet.</Text>
                        </View>
                    }
                />
            </View>
        );
    }

    if (combinedAssets.length === 0) {
        return (
            <View style={styles.center}>
                <Text style={styles.msg}>No photos found.</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            {selectionToolbar}
            <FlashList
                data={listItems}
                renderItem={renderItem}
                extraData={selectedIds}
                getItemType={(item) => item.type}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.4}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
                ListFooterComponent={
                    isLoadingMore ? (
                        <View style={styles.footer}>
                            <ActivityIndicator size="small" />
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    msg: { fontSize: 15, color: '#737272', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
    sectionHeader: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 6 },
    sectionHeaderText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#737272',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
    footer: { paddingVertical: 20, alignItems: 'center' },
    selectionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#111827',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    selectionBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    selectionBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    selectionBarBtn: {
        padding: 4,
    },
    selectionBarText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    mockBanner: {
        gap: 10,
        backgroundColor: '#f0f0ff',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    mockBannerContent: { gap: 6 },
    mockBannerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    mockBannerText: { fontSize: 12, color: '#555' },
    mockBannerSubtext: { fontSize: 12, color: '#6b7280', lineHeight: 18 },
    mockBannerLink: { fontSize: 12, color: '#6366f1', fontWeight: '600' },
    pickButton: {
        minHeight: 34,
        borderRadius: 12,
        backgroundColor: '#111827',
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
});
