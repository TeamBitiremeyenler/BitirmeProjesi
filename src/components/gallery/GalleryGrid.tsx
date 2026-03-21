import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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

import {
    fetchPhotos,
    getMediaPermissionState,
    groupByDate,
    isExpoGoStoreClient,
    requestMediaPermission,
    type Asset,
} from '@/src/lib/media-library';
import { uploadPickedPhotoForSearch } from '@/src/lib/api/upload';
import { listPickedAssets } from '@/src/lib/local-sync-store';
import { MOCK_PHOTOS } from '@/src/lib/mock-photos';
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

function mergeAssetsByUri(primaryAssets: Asset[], pickedAssets: Asset[]): Asset[] {
    const sorted = [...pickedAssets, ...primaryAssets].sort(
        (left, right) => (right.creationTime ?? 0) - (left.creationTime ?? 0)
    );
    const seen = new Set<string>();
    const merged: Asset[] = [];

    for (const asset of sorted) {
        const key = asset.uri || asset.id;
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
    const cursorRef = useRef<string | undefined>(undefined);
    const hasMoreRef = useRef(true);
    const usesExpoGoFallback = permStatus === 'denied' && isExpoGoStoreClient();

    const refreshPickedAssets = useCallback(async () => {
        const entries = await listPickedAssets();
        const mapped = entries
            .map(toPickedAsset)
            .filter((asset): asset is Asset => asset !== null);
        setPickedAssets(mapped);
    }, []);

    const load = useCallback(async (reset = false) => {
        if (!hasMoreRef.current && !reset) return;

        const after = reset ? undefined : cursorRef.current;
        const page = await fetchPhotos(after);

        setAssets((prev) => (reset ? page.assets : [...prev, ...page.assets]));
        cursorRef.current = page.endCursor;
        hasMoreRef.current = page.hasNextPage;
    }, []);

    const startLoad = useCallback(() => {
        setIsLoading(true);
        cursorRef.current = undefined;
        hasMoreRef.current = true;
        load(true).finally(() => setIsLoading(false));
    }, [load]);

    useEffect(() => {
        refreshPickedAssets().catch(() => setPickedAssets([]));
    }, [refreshPickedAssets]);

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
        cursorRef.current = undefined;
        hasMoreRef.current = true;
        await Promise.all([load(true), refreshPickedAssets()]);
        setIsRefreshing(false);
    }, [load, refreshPickedAssets]);

    const handleEndReached = useCallback(async () => {
        if (isLoadingMore || !hasMoreRef.current) return;

        setIsLoadingMore(true);
        await load(false);
        setIsLoadingMore(false);
    }, [isLoadingMore, load]);

    const handlePress = useCallback((asset: Asset) => {
        router.push(`/photo-detail/${asset.id}`);
    }, [router]);

    const combinedAssets = useMemo(
        () => mergeAssetsByUri(assets, pickedAssets),
        [assets, pickedAssets]
    );
    const deniedAssets = useMemo(
        () => mergeAssetsByUri(MOCK_PHOTOS, pickedAssets),
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
                    <PhotoThumbnail key={asset.id} asset={asset} size={THUMB_SIZE} onPress={handlePress} />
                ))}
                {item.assets.length < COLUMNS
                    ? Array.from({ length: COLUMNS - item.assets.length }).map((_, index) => (
                        <View key={index} style={{ width: THUMB_SIZE, height: THUMB_SIZE }} />
                    ))
                    : null}
            </View>
        );
    }, [handlePress]);

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
        <FlashList
            data={listItems}
            renderItem={renderItem}
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
