import { useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image as RNImage,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { goBackOrReplace } from '@/src/lib/navigation';

const COLUMNS = 2;
const GAP = 8;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - GAP * (COLUMNS + 1)) / COLUMNS);

const SMART_ALBUM_PRIORITY: Record<string, number> = {
    recents: 0,
    favorites: 1,
    camera: 2,
    'camera roll': 2,
};

type AlbumItem = { id: string; title: string; count: number; thumbUri: string | null };

export default function AlbumsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [albums, setAlbums] = useState<AlbumItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleBack = useCallback(() => {
        goBackOrReplace(router, '/home');
    }, [router]);

    const loadAlbums = useCallback(async () => {
        setIsLoading(true);
        try {
            const { status } = await MediaLibrary.getPermissionsAsync();
            if (status !== 'granted') {
                setAlbums([]);
                return;
            }
            const all = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
            const withThumbs: AlbumItem[] = await Promise.all(
                all.map(async (album) => {
                    try {
                        const page = await MediaLibrary.getAssetsAsync({
                            album,
                            mediaType: MediaLibrary.MediaType.photo,
                            first: 1,
                            sortBy: [[MediaLibrary.SortBy.creationTime, false]],
                        });
                        return {
                            id: album.id,
                            title: album.title,
                            count: album.assetCount,
                            thumbUri: page.assets[0]?.uri ?? null,
                        };
                    } catch {
                        return { id: album.id, title: album.title, count: album.assetCount, thumbUri: null };
                    }
                })
            );
            setAlbums(
                withThumbs
                    .filter(a => a.count > 0)
                    .sort((left, right) => {
                        const leftPriority = SMART_ALBUM_PRIORITY[left.title.toLowerCase()] ?? 99;
                        const rightPriority = SMART_ALBUM_PRIORITY[right.title.toLowerCase()] ?? 99;
                        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
                        if (left.count !== right.count) return right.count - left.count;
                        return left.title.localeCompare(right.title);
                    })
            );
        } catch {
            setAlbums([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const totalPhotos = albums.reduce((sum, album) => sum + album.count, 0);

    useEffect(() => { loadAlbums(); }, [loadAlbums]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await loadAlbums();
        } finally {
            setIsRefreshing(false);
        }
    }, [loadAlbums]);

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#000" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.title}>Albums</Text>
                    {!isLoading ? (
                        <Text style={styles.subtitle}>
                            {albums.length} albums • {totalPhotos} photos
                        </Text>
                    ) : null}
                </View>
                <View style={styles.backBtn} />
            </View>

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" /></View>
            ) : (
                <FlatList
                    data={albums}
                    numColumns={COLUMNS}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={styles.row}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>No albums found</Text>
                            <Text style={styles.emptyBody}>
                                Pull to refresh after new photos are added, or allow full media access to load device albums.
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.cell}
                            onPress={() => router.push(`/albums/${item.id}` as any)}
                        >
                            {item.thumbUri ? (
                                <RNImage source={{ uri: item.thumbUri }} style={styles.thumb} resizeMode="cover" />
                            ) : (
                                <View style={[styles.thumb, styles.placeholder]} />
                            )}
                            <Text style={styles.albumName} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.albumCount}>{item.count} photos</Text>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    headerText: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    backBtn: { padding: 8, width: 40 },
    title: { fontSize: 20, fontWeight: '700', color: '#111827' },
    subtitle: { fontSize: 12, color: '#6b7280' },
    list: { padding: GAP },
    row: { gap: GAP, marginBottom: GAP },
    cell: { width: CELL_SIZE },
    thumb: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 14, marginBottom: 6, backgroundColor: '#e5e5e5' },
    placeholder: { backgroundColor: '#e5e5e5' },
    albumName: { fontSize: 13, fontWeight: '600', color: '#111' },
    albumCount: { fontSize: 12, color: '#737272' },
    emptyState: {
        paddingHorizontal: 24,
        paddingTop: 48,
        alignItems: 'center',
        gap: 8,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
    },
    emptyBody: {
        fontSize: 14,
        lineHeight: 21,
        color: '#6b7280',
        textAlign: 'center',
    },
});
