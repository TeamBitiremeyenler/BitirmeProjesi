import { useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { MOCK_PHOTOS } from '@/src/lib/mock-photos';

const COLUMNS = 2;
const GAP = 8;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - GAP * (COLUMNS + 1)) / COLUMNS);

// Mock albums grouped from mock photos for demo mode
const MOCK_ALBUMS = [
    { id: 'mock-recent', title: 'Recents', count: 9, thumbUri: MOCK_PHOTOS[0].uri },
    { id: 'mock-favorites', title: 'Favorites', count: 6, thumbUri: MOCK_PHOTOS[9].uri },
    { id: 'mock-camera', title: 'Camera Roll', count: 9, thumbUri: MOCK_PHOTOS[18].uri },
];

type AlbumItem = { id: string; title: string; count: number; thumbUri: string | null };

export default function AlbumsScreen() {
    const insets = useSafeAreaInsets();
    const [albums, setAlbums] = useState<AlbumItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadAlbums = useCallback(async () => {
        setIsLoading(true);
        try {
            const { status } = await MediaLibrary.getPermissionsAsync();
            if (status !== 'granted') {
                // Demo mode — show mock albums
                setAlbums(MOCK_ALBUMS);
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
            setAlbums(withThumbs.filter(a => a.count > 0));
        } catch {
            setAlbums(MOCK_ALBUMS);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadAlbums(); }, [loadAlbums]);

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Albums</Text>
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
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.cell}
                            onPress={() => router.push(`/albums/${item.id}` as any)}
                        >
                            {item.thumbUri ? (
                                <Image source={{ uri: item.thumbUri }} style={styles.thumb} contentFit="cover" />
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
    backBtn: { padding: 8, width: 40 },
    title: { fontSize: 20, fontWeight: '700' },
    list: { padding: GAP },
    row: { gap: GAP, marginBottom: GAP },
    cell: { width: CELL_SIZE },
    thumb: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 10, marginBottom: 6 },
    placeholder: { backgroundColor: '#e5e5e5' },
    albumName: { fontSize: 13, fontWeight: '600', color: '#111' },
    albumCount: { fontSize: 12, color: '#737272' },
});
