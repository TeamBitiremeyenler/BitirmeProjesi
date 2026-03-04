import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import { PhotoThumbnail } from '@/src/components/gallery/PhotoThumbnail';
import type { Asset } from '@/src/lib/media-library';

const COLUMNS = 3;
const GAP = 2;
const SCREEN_WIDTH = Dimensions.get('window').width;
const THUMB_SIZE = Math.floor((SCREEN_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS);

type RowItem = { assets: Asset[] };

export default function AlbumDetailScreen() {
    const { 'album-id': albumId } = useLocalSearchParams<{ 'album-id': string }>();
    const insets = useSafeAreaInsets();

    const [album, setAlbum] = useState<MediaLibrary.Album | null>(null);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const cursorRef = useRef<string | undefined>(undefined);
    const hasMoreRef = useRef(true);

    const load = useCallback(async (reset = false) => {
        if (!albumId) return;
        if (!hasMoreRef.current && !reset) return;
        const after = reset ? undefined : cursorRef.current;
        const page = await MediaLibrary.getAssetsAsync({
            album: albumId,
            mediaType: MediaLibrary.MediaType.photo,
            sortBy: [[MediaLibrary.SortBy.creationTime, false]],
            first: 60,
            after,
        });
        setAssets(prev => reset ? page.assets : [...prev, ...page.assets]);
        cursorRef.current = page.endCursor;
        hasMoreRef.current = page.hasNextPage;
    }, [albumId]);

    useEffect(() => {
        if (!albumId) return;
        MediaLibrary.getAlbumAsync(albumId).then(setAlbum).catch(() => { });
        setIsLoading(true);
        load(true).finally(() => setIsLoading(false));
    }, [albumId, load]);

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
    }, []);

    // Build rows of 3
    const rows: RowItem[] = [];
    for (let i = 0; i < assets.length; i += COLUMNS) {
        rows.push({ assets: assets.slice(i, i + COLUMNS) });
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <ChevronLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>{album?.title ?? 'Album'}</Text>
                <View style={styles.iconBtn} />
            </View>

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" /></View>
            ) : (
                <FlashList
                    data={rows}
                    keyExtractor={(_, i) => String(i)}
                    renderItem={({ item }) => (
                        <View style={styles.row}>
                            {item.assets.map(asset => (
                                <PhotoThumbnail key={asset.id} asset={asset} size={THUMB_SIZE} onPress={handlePress} />
                            ))}
                            {item.assets.length < COLUMNS &&
                                Array.from({ length: COLUMNS - item.assets.length }).map((_, i) => (
                                    <View key={i} style={{ width: THUMB_SIZE, height: THUMB_SIZE }} />
                                ))}
                        </View>
                    )}
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
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    topBar: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 8, paddingVertical: 8,
    },
    iconBtn: { padding: 8, width: 40 },
    title: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
    row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
    footer: { paddingVertical: 20, alignItems: 'center' },
});
