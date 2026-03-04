import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
    ActivityIndicator,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { ChevronLeft, Share2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAssetById, type AssetInfo } from '@/src/lib/media-library';
import { MOCK_PHOTOS } from '@/src/lib/mock-photos';

export default function PhotoDetail() {
    const { 'photo-id': photoId } = useLocalSearchParams<{ 'photo-id': string }>();
    const insets = useSafeAreaInsets();

    const [asset, setAsset] = useState<AssetInfo | null>(null);
    const [mockUri, setMockUri] = useState<string | null>(null);
    const [mockMeta, setMockMeta] = useState<{ creationTime: number; width: number; height: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!photoId) return;

        // Check mock photos first (for demo mode)
        const mock = MOCK_PHOTOS.find(p => p.id === photoId);
        if (mock) {
            setMockUri(mock.uri);
            setMockMeta({ creationTime: mock.creationTime, width: mock.width, height: mock.height });
            setIsLoading(false);
            return;
        }

        // Load real asset from media library
        getAssetById(photoId)
            .then(info => setAsset(info))
            .catch(() => setError('Could not load photo.'))
            .finally(() => setIsLoading(false));
    }, [photoId]);

    const imageUri = asset?.localUri ?? asset?.uri ?? mockUri;

    const handleShare = async () => {
        if (!imageUri) return;
        try { await Share.share({ url: imageUri }); } catch { }
    };

    const formatDate = (ms: number) =>
        new Date(ms).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });

    if (isLoading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (error || (!asset && !mockUri)) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <Text style={styles.errorText}>{error ?? 'Photo not found.'}</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            {/* Top bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <ChevronLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.topTitle} numberOfLines={1}>
                    {asset ? formatDate(asset.creationTime) : 'Photo'}
                </Text>
                <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
                    <Share2 size={22} color="#000" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <Image
                    source={{ uri: imageUri! }}
                    style={styles.image}
                    contentFit="contain"
                    transition={200}
                />

                {(asset || mockMeta) && (
                    <View style={styles.meta}>
                        <Text style={styles.metaTitle}>{formatDate((asset ?? mockMeta)!.creationTime)}</Text>
                        <Text style={styles.metaText}>{(asset ?? mockMeta)!.width} × {(asset ?? mockMeta)!.height} px</Text>
                        {asset?.location && (
                            <Text style={styles.metaText}>
                                {asset.location.latitude.toFixed(4)}, {asset.location.longitude.toFixed(4)}
                            </Text>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { fontSize: 15, color: '#737272', textAlign: 'center', marginBottom: 16 },
    backBtn: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    backBtnText: { color: '#fff', fontWeight: '600' },
    topBar: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 8, paddingVertical: 8, gap: 4,
    },
    iconBtn: { padding: 8 },
    topTitle: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'center', color: '#333' },
    scrollContent: { paddingBottom: 40 },
    image: { width: '100%', height: 360 },
    meta: { padding: 16, gap: 6 },
    metaTitle: { fontSize: 16, fontWeight: '700' },
    metaText: { fontSize: 13, color: '#737272' },
});