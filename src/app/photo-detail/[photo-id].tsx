import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ActivityIndicator,
    Alert,
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

import { uploadSearchablePhoto } from '@/src/lib/api/upload';
import { getPickedAsset } from '@/src/lib/local-sync-store';
import { getAssetById, type AssetInfo } from '@/src/lib/media-library';
import { MOCK_PHOTOS } from '@/src/lib/mock-photos';

type BasicMeta = {
    creationTime: number;
    width: number;
    height: number;
};

export default function PhotoDetail() {
    const router = useRouter();
    const { 'photo-id': photoId } = useLocalSearchParams<{ 'photo-id': string }>();
    const insets = useSafeAreaInsets();

    const [asset, setAsset] = useState<AssetInfo | null>(null);
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [previewMeta, setPreviewMeta] = useState<BasicMeta | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isIndexing, setIsIndexing] = useState(false);
    const [indexStatus, setIndexStatus] = useState<string | null>(null);

    const handleBack = useCallback(() => {
        router.replace('/home');
    }, [router]);

    useEffect(() => {
        let isMounted = true;

        async function loadPhoto() {
            if (!photoId) return;

            const mock = MOCK_PHOTOS.find((photo) => photo.id === photoId);
            if (mock) {
                if (!isMounted) return;
                setPreviewUri(mock.uri);
                setPreviewMeta({
                    creationTime: mock.creationTime,
                    width: mock.width,
                    height: mock.height,
                });
                setIsLoading(false);
                return;
            }

            if (photoId.startsWith('picked:')) {
                const pickedAsset = await getPickedAsset(photoId);
                if (!isMounted) return;

                if (pickedAsset?.uri) {
                    setPreviewUri(pickedAsset.uri);
                    setPreviewMeta({
                        creationTime: pickedAsset.creationTime ?? Date.now(),
                        width: 0,
                        height: 0,
                    });
                } else {
                    setError('Could not load selected photo.');
                }
                setIsLoading(false);
                return;
            }

            getAssetById(photoId)
                .then((info) => {
                    if (isMounted) setAsset(info);
                })
                .catch(() => {
                    if (isMounted) setError('Could not load photo.');
                })
                .finally(() => {
                    if (isMounted) setIsLoading(false);
                });
        }

        loadPhoto();

        return () => {
            isMounted = false;
        };
    }, [photoId]);

    const imageUri = asset?.localUri ?? asset?.uri ?? previewUri;
    const displayedMeta = asset
        ? {
            creationTime: asset.creationTime,
            width: asset.width,
            height: asset.height,
        }
        : previewMeta;

    const handleShare = async () => {
        if (!imageUri) return;

        try {
            await Share.share({ url: imageUri });
        } catch {
            // Ignore native share cancellation.
        }
    };

    const handleIndexForSearch = async () => {
        if (!photoId || !asset) return;

        setIsIndexing(true);
        setIndexStatus(null);

        try {
            const result = await uploadSearchablePhoto({
                assetId: photoId,
                asset,
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
    };

    const formatDate = (ms: number) =>
        new Date(ms).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

    if (isLoading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (error || (!asset && !previewUri)) {
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
                    <ChevronLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.topTitle} numberOfLines={1}>
                    {displayedMeta ? formatDate(displayedMeta.creationTime) : 'Photo'}
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

                {displayedMeta ? (
                    <View style={styles.meta}>
                        <Text style={styles.metaTitle}>{formatDate(displayedMeta.creationTime)}</Text>
                        <Text style={styles.metaText}>
                            {displayedMeta.width} x {displayedMeta.height} px
                        </Text>
                        {asset?.location ? (
                            <Text style={styles.metaText}>
                                {asset.location.latitude.toFixed(4)}, {asset.location.longitude.toFixed(4)}
                            </Text>
                        ) : null}
                        {asset ? (
                            <TouchableOpacity
                                onPress={handleIndexForSearch}
                                disabled={isIndexing}
                                style={[styles.indexButton, isIndexing && styles.indexButtonDisabled]}
                            >
                                {isIndexing ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.indexButtonText}>Index for AI Search</Text>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.metaHint}>
                                Picked photos are already available for backend search testing.
                            </Text>
                        )}
                        {indexStatus ? <Text style={styles.metaHint}>{indexStatus}</Text> : null}
                    </View>
                ) : null}
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 4,
    },
    iconBtn: { padding: 8 },
    topTitle: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'center', color: '#333' },
    scrollContent: { paddingBottom: 40 },
    image: { width: '100%', height: 360 },
    meta: { padding: 16, gap: 6 },
    metaTitle: { fontSize: 16, fontWeight: '700' },
    metaText: { fontSize: 13, color: '#737272' },
    indexButton: {
        marginTop: 12,
        minHeight: 46,
        borderRadius: 14,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    indexButtonDisabled: {
        opacity: 0.7,
    },
    indexButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    metaHint: {
        fontSize: 12,
        lineHeight: 18,
        color: '#6b7280',
    },
});
