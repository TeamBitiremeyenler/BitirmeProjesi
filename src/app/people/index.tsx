import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import { listPeopleClusters, type PeopleCluster } from '@/src/lib/api/people';
import { resolveLocalPhoto } from '@/src/lib/local-photo-resolver';

type PersonCard = PeopleCluster & {
    coverUri: string | null;
};

const COLUMNS = 2;
const GAP = 12;

function formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        if (error.message === 'backend_not_configured') {
            return 'People view needs a configured backend to fetch face clusters.';
        }

        return error.message;
    }

    return 'Could not load your people right now.';
}

export default function PeopleScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [people, setPeople] = useState<PersonCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [source, setSource] = useState<string | null>(null);

    const loadPeople = useCallback(async () => {
        const response = await listPeopleClusters();
        const nextPeople = await Promise.all(
            response.clusters.map(async (cluster) => {
                const coverPhoto = await resolveLocalPhoto({
                    photoId: cluster.coverPhotoId,
                    imageUuid: cluster.coverImageUuid,
                });

                return {
                    ...cluster,
                    coverUri: coverPhoto?.uri ?? null,
                };
            })
        );

        setPeople(nextPeople);
        setSource(response.source);
        setError(null);
    }, []);

    useEffect(() => {
        loadPeople()
            .catch((loadError) => {
                setError(formatErrorMessage(loadError));
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [loadPeople]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await loadPeople();
        } catch (loadError) {
            setError(formatErrorMessage(loadError));
        } finally {
            setIsRefreshing(false);
        }
    }, [loadPeople]);

    if (isLoading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.replace('/home')} style={styles.iconBtn}>
                    <ChevronLeft size={24} color="#111827" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.title}>People</Text>
                    <Text style={styles.subtitle}>
                        {source === 'local_store'
                            ? 'Showing the local clustering fallback.'
                            : 'Auto-grouped faces from indexed photos.'}
                    </Text>
                </View>
            </View>

            {error ? (
                <View style={styles.banner}>
                    <Text style={styles.bannerText}>{error}</Text>
                </View>
            ) : null}

            {people.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyTitle}>No people found yet</Text>
                    <Text style={styles.emptyText}>
                        Open a recent photo or wait for launch sync so Smart Gallery can index faces in the background.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={people}
                    numColumns={COLUMNS}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={styles.row}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => router.push(`/people/${item.id}` as any)}
                        >
                            {item.coverUri ? (
                                <Image source={{ uri: item.coverUri }} style={styles.cardImage} contentFit="cover" />
                            ) : (
                                <View style={[styles.cardImage, styles.placeholder]}>
                                    <Text style={styles.placeholderText}>
                                        {item.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.cardMeta}>
                                <Text style={styles.cardTitle} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                <Text style={styles.cardCount}>
                                    {item.photoCount} {item.photoCount === 1 ? 'photo' : 'photos'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
    },
    headerText: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#111827',
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 19,
        color: '#6b7280',
    },
    banner: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 14,
        backgroundColor: '#fff7ed',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    bannerText: {
        color: '#c2410c',
        fontSize: 12,
        lineHeight: 18,
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        gap: GAP,
    },
    row: {
        gap: GAP,
    },
    card: {
        flex: 1,
        marginBottom: GAP,
        overflow: 'hidden',
        borderRadius: 22,
        backgroundColor: '#f8fafc',
    },
    cardImage: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#e5e7eb',
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#dbeafe',
    },
    placeholderText: {
        fontSize: 36,
        fontWeight: '700',
        color: '#1d4ed8',
    },
    cardMeta: {
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    cardCount: {
        marginTop: 4,
        fontSize: 13,
        color: '#6b7280',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        gap: 10,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        lineHeight: 21,
        color: '#6b7280',
        textAlign: 'center',
    },
});
