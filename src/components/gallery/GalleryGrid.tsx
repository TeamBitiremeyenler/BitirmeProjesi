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
import { useFocusEffect } from '@react-navigation/native';
import { X, Trash2, Share2 } from 'lucide-react-native';
import Share from 'react-native-share';
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
import { uploadPickedPhotoForSearch } from '@/src/lib/api/upload';
import { listPickedAssets } from '@/src/lib/local-sync-store';
import { MOCK_PHOTOS } from '@/src/lib/mock-photos';
import {
    appendCachedLibraryAssets,
    replaceCachedLibraryAssets,
    replaceCachedPickedAssets,
    warmRemainingLibraryAssets,
} from '@/src/lib/gallery-cache';
import {
    listSavedLibraryAssets,
    removeSavedLibraryAsset,
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

function toPickedAsset(entry: { id: string; asset: { uri: string; filename?: string | null; creationTime?: number } }): Asset | null {
    if (!entry.asset.uri) return null;

    return {
        id: entry.id,
        filename: entry.asset.filename ?? `picked_${entry.id}.jpg`,
        uri: entry.asset.uri,
        mediaType: 'photo',
        mediaSubtypes: [],
        width: 0,
        height: 0,
        fileSize: 0,
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
        const key = asset.id || asset.uri;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(asset);
    }

    return merged;
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
        const mapped = entries
            .map(toPickedAsset)
            .filter((asset): asset is Asset => asset !== null);
        setPickedAssets(mapped);
        replaceCachedPickedAssets(entries);
    }, []);

    const refreshSavedLibraryAssets = useCallback(async () => {
        const saved = await listSavedLibraryAssets();
        setSavedLibraryAssets(saved);
    }, []);

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
    }, [load, permStatus]);

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
    }, [permStatus, refreshLibraryAssets]);

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
                filename: selectedAsset.fileName,
                creationTime: Date.now(),
            });

            setPickerStatus(
                'Photo indexed. Wait 5-10 seconds, then search from the Home bar using simple words.'
            );
            Alert.alert('Indexed', `Upload queued. Image UUID: ${uploadResult.imageUuid}`);
            await refreshPickedAssets();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unexpected picker error.';
            setPickerStatus(`Pick/index failed: ${message}`);
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
                            const { status } = await MediaLibrary.requestPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert('Permission Required', 'Storage permission is needed to delete photos.');
                                return;
                            }
                            await MediaLibrary.deleteAssetsAsync([...selectedIds]);
                            for (const id of selectedIds) {
                                await removeSavedLibraryAsset(id);
                            }
                            setSelectedIds(new Set());
                            await refreshLibraryAssets();
                        } catch (e) {
                            console.error('Bulk delete error:', e);
                            Alert.alert('Error', 'Could not delete the selected photos.');
                        }
                    },
                },
            ],
        );
    }, [selectedIds, refreshLibraryAssets]);

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
            await Share.open({ urls: fileUris, type: 'image/*' });
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
    const deniedAssets = useMemo(
        () => mergeAssets(MOCK_PHOTOS, pickedAssets),
        [pickedAssets]
    );
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
                                ? 'Expo Go Android tam galeri erisimi vermez. Tek bir gercek foto secip AI search test edebilirsin.'
                                : 'Demo mode: photo access is off. Allow access to test real uploads and AI search.'}
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
                                    <Text style={styles.pickButtonText}>Pick and Index</Text>
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
