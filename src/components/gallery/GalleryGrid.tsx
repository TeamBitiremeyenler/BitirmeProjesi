import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Linking,
    PermissionsAndroid,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';

import { fetchPhotos, groupByDate } from '@/src/lib/media-library';
import { MOCK_PHOTOS } from '@/src/lib/mock-photos'; //Mock photos added for demo
import { PhotoThumbnail } from './PhotoThumbnail';
import type { Asset } from '@/src/lib/media-library';

// ── Layout constants ──────────────────────────────────────────────────────────
const COLUMNS = 3;
const GAP = 2;
const SCREEN_WIDTH = Dimensions.get('window').width;
const THUMB_SIZE = Math.floor((SCREEN_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS);

// ── List item types ───────────────────────────────────────────────────────────
type HeaderItem = { type: 'header'; title: string };
type RowItem = { type: 'row'; assets: Asset[] };
type ListItem = HeaderItem | RowItem;

function buildListItems(sections: { title: string; data: Asset[] }[]): ListItem[] {
    const items: ListItem[] = [];
    for (const section of sections) {
        items.push({ type: 'header', title: section.title });
        for (let i = 0; i < section.data.length; i += COLUMNS) {
            items.push({ type: 'row', assets: section.data.slice(i, i + COLUMNS) });
        }
    }
    return items;
}

// ── Permission helper (bypasses expo-media-library's broken AUDIO check) ─────
async function requestMediaPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        return status === 'granted';
    }
    if (Number(Platform.Version) >= 33) {
        const results = await PermissionsAndroid.requestMultiple([
            'android.permission.READ_MEDIA_IMAGES' as any,
            'android.permission.READ_MEDIA_VIDEO' as any,
            'android.permission.READ_MEDIA_AUDIO' as any,
        ]);
        return results['android.permission.READ_MEDIA_IMAGES'] === PermissionsAndroid.RESULTS.GRANTED;
    }
    const r = await PermissionsAndroid.request('android.permission.READ_EXTERNAL_STORAGE' as any);
    return r === PermissionsAndroid.RESULTS.GRANTED;
}

async function checkMediaPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
        const { status } = await MediaLibrary.getPermissionsAsync();
        return status === 'granted';
    }
    if (Number(Platform.Version) >= 33) {
        return PermissionsAndroid.check('android.permission.READ_MEDIA_IMAGES' as any);
    }
    return PermissionsAndroid.check('android.permission.READ_EXTERNAL_STORAGE' as any);
}

// ── Component ─────────────────────────────────────────────────────────────────
export function GalleryGrid() {
    const router = useRouter();

    const [permStatus, setPermStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const cursorRef = useRef<string | undefined>(undefined);
    const hasMoreRef = useRef(true);

    // load one page of photos
    const load = useCallback(async (reset = false) => {
        if (!hasMoreRef.current && !reset) return;
        const after = reset ? undefined : cursorRef.current;
        const page = await fetchPhotos(after);
        setAssets(prev => reset ? page.assets : [...prev, ...page.assets]);
        cursorRef.current = page.endCursor;
        hasMoreRef.current = page.hasNextPage;
    }, []);

    const startLoad = useCallback(() => {
        setIsLoading(true);
        cursorRef.current = undefined;
        hasMoreRef.current = true;
        load(true).finally(() => setIsLoading(false));
    }, [load]);

    // Check permission on mount
    useEffect(() => {
        checkMediaPermission()
            .then(granted => {
                setPermStatus(granted ? 'granted' : 'denied');
                if (granted) startLoad();
                else setIsLoading(false);
            })
            .catch(() => { setPermStatus('denied'); setIsLoading(false); });
    }, []);

    // Trigger load once permission becomes granted
    useEffect(() => {
        if (permStatus === 'granted') startLoad();
    }, [permStatus]);

    const handleAllow = async () => {
        const granted = await requestMediaPermission();
        if (granted) {
            setPermStatus('granted');
        } else {
            // already denied permanently — open settings
            Linking.openSettings();
        }
    };

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        cursorRef.current = undefined;
        hasMoreRef.current = true;
        await load(true);
        setIsRefreshing(false);
    }, [load]);

    const handleEndReached = useCallback(async () => {
        if (isLoadingMore || !hasMoreRef.current) return;
        setIsLoadingMore(true);
        await load(false);
        setIsLoadingMore(false);
    }, [isLoadingMore, load]);

    const handlePress = useCallback((asset: Asset) => {
        router.push(`/photo-detail/${asset.id}`);
    }, [router]);

    const listItems = useMemo(() => buildListItems(groupByDate(assets)), [assets]);

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
                {item.assets.map(asset => (
                    <PhotoThumbnail key={asset.id} asset={asset} size={THUMB_SIZE} onPress={handlePress} />
                ))}
                {item.assets.length < COLUMNS &&
                    Array.from({ length: COLUMNS - item.assets.length }).map((_, i) => (
                        <View key={i} style={{ width: THUMB_SIZE, height: THUMB_SIZE }} />
                    ))}
            </View>
        );
    }, [handlePress]);

    // ── Render states ──────────────────────────────────────────────────────────
    if (permStatus === 'checking' || isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
    }

    if (permStatus === 'denied') {
        // Use mock photos so the UI is fully testable without real device permissions
        const mockSections = groupByDate(MOCK_PHOTOS);
        const mockItems = buildListItems(mockSections);
        return (
            <View style={{ flex: 1 }}>
                <View style={styles.mockBanner}>
                    <Text style={styles.mockBannerText}>📸 Demo mode — grant permission to see your own photos</Text>
                    <TouchableOpacity onPress={handleAllow}>
                        <Text style={styles.mockBannerLink}>Allow Access</Text>
                    </TouchableOpacity>
                </View>
                <FlashList
                    data={mockItems}
                    renderItem={renderItem}
                    getItemType={item => item.type}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        );
    }

    if (assets.length === 0) {
        return <View style={styles.center}><Text style={styles.msg}>No photos found.</Text></View>;
    }

    return (
        <FlashList
            data={listItems}
            renderItem={renderItem}
            getItemType={item => item.type}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
            ListFooterComponent={
                isLoadingMore
                    ? <View style={styles.footer}><ActivityIndicator size="small" /></View>
                    : null
            }
        />
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    msg: { fontSize: 15, color: '#737272', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
    btn: { backgroundColor: '#6366f1', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    sectionHeader: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 6 },
    sectionHeaderText: { fontSize: 13, fontWeight: '600', color: '#737272', letterSpacing: 0.4, textTransform: 'uppercase' },
    row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
    footer: { paddingVertical: 20, alignItems: 'center' },
    mockBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f0f0ff',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    mockBannerText: { fontSize: 12, color: '#555' },
    mockBannerLink: { fontSize: 12, color: '#6366f1', fontWeight: '600' },
});
