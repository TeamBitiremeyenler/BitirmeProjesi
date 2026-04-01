import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Edit3, ChevronLeft, Check, X } from 'lucide-react-native';

import { PhotoResultsGrid, type SearchResultPhoto } from '@/src/components/gallery/PhotoResultsGrid';
import { getPersonCluster, renamePersonCluster, type PeopleCluster } from '@/src/lib/api/people';
import { resolveLocalPhoto } from '@/src/lib/local-photo-resolver';
import { goBackOrReplace } from '@/src/lib/navigation';

function formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        if (error.message === 'backend_not_configured') {
            return 'People detail needs a configured backend.';
        }

        if (error.message === 'Person not found' || error.message === 'person_not_found') {
            return 'This person could not be found.';
        }

        return error.message;
    }

    return 'Could not load this person right now.';
}

export default function PersonDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [cluster, setCluster] = useState<PeopleCluster | null>(null);
    const [photos, setPhotos] = useState<SearchResultPhoto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [draftName, setDraftName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const loadCluster = useCallback(async () => {
        if (!id) return;

        const response = await getPersonCluster(id);
        const referenceCount = Math.max(
            response.cluster.photoIds.length,
            response.cluster.imageUuids.length
        );
        const resolvedPhotos = await Promise.all(
            Array.from({ length: referenceCount }).map((_, index) =>
                resolveLocalPhoto({
                    photoId: response.cluster.photoIds[index] ?? null,
                    imageUuid: response.cluster.imageUuids[index] ?? null,
                })
            )
        );

        const nextPhotos = resolvedPhotos.filter((photo): photo is SearchResultPhoto => photo !== null);
        setCluster(response.cluster);
        setDraftName(response.cluster.name);
        setPhotos(nextPhotos);
        setError(null);
    }, [id]);

    useEffect(() => {
        loadCluster()
            .catch((loadError) => {
                setError(formatErrorMessage(loadError));
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [loadCluster]);

    const handleRename = useCallback(async () => {
        if (!id) return;

        const trimmedName = draftName.trim();
        if (!trimmedName) {
            Alert.alert('Name required', 'Please enter a name before saving.');
            return;
        }

        setIsSaving(true);
        try {
            const response = await renamePersonCluster(id, trimmedName);
            setCluster(response.cluster);
            setDraftName(response.cluster.name);
            setIsEditing(false);
            setError(null);
        } catch (renameError) {
            Alert.alert('Rename failed', formatErrorMessage(renameError));
        } finally {
            setIsSaving(false);
        }
    }, [draftName, id]);

    if (isLoading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (error || !cluster) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <Text style={styles.errorTitle}>{error ?? 'Person not found.'}</Text>
                <TouchableOpacity onPress={() => goBackOrReplace(router, '/people')} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Back to People</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => goBackOrReplace(router, '/people')} style={styles.iconBtn}>
                    <ChevronLeft size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.topTitle} numberOfLines={1}>
                    Person Detail
                </Text>
                <View style={styles.iconBtn} />
            </View>

            <View style={styles.heroCard}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{cluster.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.heroMeta}>
                    {isEditing ? (
                        <View style={styles.editColumn}>
                            <TextInput
                                value={draftName}
                                onChangeText={setDraftName}
                                placeholder="Enter a person name"
                                placeholderTextColor="#9ca3af"
                                style={styles.nameInput}
                                autoFocus
                            />
                            <View style={styles.editActions}>
                                <TouchableOpacity
                                    onPress={handleRename}
                                    disabled={isSaving}
                                    style={[styles.actionButton, styles.primaryButton]}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Check size={14} color="#fff" />
                                            <Text style={styles.primaryButtonText}>Save</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setDraftName(cluster.name);
                                        setIsEditing(false);
                                    }}
                                    disabled={isSaving}
                                    style={[styles.actionButton, styles.cancelButton]}
                                >
                                    <X size={14} color="#111827" />
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.personName}>{cluster.name}</Text>
                            <Text style={styles.personMeta}>
                                {cluster.photoCount} {cluster.photoCount === 1 ? 'photo' : 'photos'}
                            </Text>
                        </>
                    )}
                </View>
                {!isEditing ? (
                    <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.renameChip}>
                        <Edit3 size={14} color="#111827" />
                        <Text style={styles.renameChipText}>Rename</Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={styles.gridShell}>
                {photos.length > 0 ? (
                    <PhotoResultsGrid
                        photos={photos}
                        onPress={(photo) => router.push(`/photo-detail/${photo.id}` as any)}
                    />
                ) : (
                    <View style={styles.center}>
                        <Text style={styles.errorTitle}>No local photos resolved for this person yet.</Text>
                        <Text style={styles.errorBody}>
                            The cluster exists, but the matching local photo files are not available on this device.
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#fff',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    topTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    heroCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 24,
        backgroundColor: '#f8fafc',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#dbeafe',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1d4ed8',
    },
    heroMeta: {
        flex: 1,
        gap: 4,
    },
    personName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
    },
    personMeta: {
        fontSize: 14,
        color: '#6b7280',
    },
    renameChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    renameChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#111827',
    },
    editColumn: {
        gap: 10,
    },
    nameInput: {
        minHeight: 46,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        fontSize: 16,
        color: '#111827',
    },
    editActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        minHeight: 40,
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    primaryButton: {
        backgroundColor: '#111827',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    cancelButton: {
        backgroundColor: '#e5e7eb',
    },
    cancelButtonText: {
        color: '#111827',
        fontSize: 13,
        fontWeight: '700',
    },
    gridShell: {
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        gap: 10,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
    },
    errorBody: {
        fontSize: 14,
        lineHeight: 21,
        color: '#6b7280',
        textAlign: 'center',
    },
    secondaryButton: {
        minHeight: 44,
        borderRadius: 14,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    secondaryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
});
