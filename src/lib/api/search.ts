import * as MediaLibrary from 'expo-media-library';

import { supabase } from '@/lib/supabase';
import type { SearchResultPhoto } from '@/src/components/gallery/PhotoResultsGrid';
import { getLocalAssetId, getPickedAsset, listPickedAssets } from '@/src/lib/local-sync-store';
import { checkMediaPermission, fetchRecentPhotos, type Asset } from '@/src/lib/media-library';
import { MOCK_PHOTOS } from '@/src/lib/mock-photos';

type BackendResult = {
    image_uuid?: string;
    photo_id?: string;
    score?: number;
};

type BackendPayload = {
    results?: BackendResult[];
    mode?: string;
};

type ClearCachePayload = {
    status?: string;
    summary?: unknown;
};

export type SearchPhotosResponse = {
    photos: SearchResultPhoto[];
    usedFallback: boolean;
    fallbackReason?: 'backend_unavailable' | 'backend_not_configured' | 'backend_degraded' | 'no_synced_matches';
};

export type ClearSearchCacheResponse = {
    remoteCleared: boolean;
    reason?: 'backend_unavailable' | 'backend_not_configured';
};

type RemoteSearchResponse = {
    photos: SearchResultPhoto[];
    mode: string;
};

const SEARCH_REQUEST_TIMEOUT_MS = 15000;
const SYNCED_BACKEND_MODES = new Set(['pgvector_rpc', 'python_scan', 'lexical_fast_path']);

function resolveBackendBaseUrl(): string | null {
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
    return envUrl ? envUrl.replace(/\/$/, '') : null;
}

function tokenizeQuery(query: string): string[] {
    return query
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);
}

function dedupePhotosByUri(photos: SearchResultPhoto[]): SearchResultPhoto[] {
    const byKey = new Map<string, SearchResultPhoto>();

    for (const photo of photos) {
        const key = photo.uri || photo.id;
        const existing = byKey.get(key);

        if (!existing) {
            byKey.set(key, photo);
            continue;
        }

        const existingScore = existing.score ?? 0;
        const incomingScore = photo.score ?? 0;
        const existingCreation = existing.creationTime ?? 0;
        const incomingCreation = photo.creationTime ?? 0;

        if (incomingScore > existingScore || (incomingScore === existingScore && incomingCreation > existingCreation)) {
            byKey.set(key, photo);
        }
    }

    return Array.from(byKey.values()).sort((left, right) => {
        const leftScore = left.score ?? 0;
        const rightScore = right.score ?? 0;
        if (rightScore !== leftScore) return rightScore - leftScore;
        return (right.creationTime ?? 0) - (left.creationTime ?? 0);
    });
}

function buildSearchHaystack(asset: Asset): string {
    const createdAt = new Date(asset.creationTime ?? 0);

    return [
        asset.filename ?? '',
        createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        createdAt.toLocaleDateString('en-US', { weekday: 'long' }),
        String(createdAt.getFullYear()),
    ]
        .join(' ')
        .toLowerCase();
}

function scoreLocalMatch(asset: Asset, tokens: string[]): number {
    const filename = (asset.filename ?? '').toLowerCase();
    const haystack = buildSearchHaystack(asset);

    return tokens.reduce((score, token) => {
        if (filename.includes(token)) return score + 3;
        if (haystack.includes(token)) return score + 1;
        return score;
    }, 0);
}

function toSearchResultPhoto(
    asset: { id: string; uri: string; filename?: string | null; creationTime?: number },
    score?: number
): SearchResultPhoto {
    return {
        id: asset.id,
        uri: asset.uri,
        filename: asset.filename,
        creationTime: asset.creationTime,
        score,
    };
}

async function loadSearchableAssets(): Promise<Asset[]> {
    const hasPermission = await checkMediaPermission();
    if (!hasPermission) return MOCK_PHOTOS;
    return fetchRecentPhotos(240);
}

async function searchLocally(query: string): Promise<SearchResultPhoto[]> {
    const assets = await loadSearchableAssets();
    const tokens = tokenizeQuery(query);

    if (tokens.length === 0) return [];

    const matches = assets
        .map((asset) => ({ asset, score: scoreLocalMatch(asset, tokens) }))
        .filter(({ score }) => score > 0)
        .sort((left, right) => {
            if (right.score !== left.score) return right.score - left.score;
            return (right.asset.creationTime ?? 0) - (left.asset.creationTime ?? 0);
        })
        .slice(0, 60)
        .map(({ asset, score }) => toSearchResultPhoto(asset, Math.min(0.99, score / (tokens.length * 3 + 1))));

    return dedupePhotosByUri(matches);
}

async function getPickedFallbackPhotos(query: string): Promise<SearchResultPhoto[]> {
    const entries = await listPickedAssets();
    const tokens = tokenizeQuery(query);

    if (tokens.length === 0) return [];

    const scored = entries
        .map((entry) => {
            if (!entry.asset.uri) return null;

            const haystack = `${entry.asset.filename ?? ''} ${entry.id}`.toLowerCase();
            const score = tokens.reduce((acc, token) => (haystack.includes(token) ? acc + 3 : acc), 0);

            if (score <= 0) return null;

            return {
                entry,
                score,
            };
        })
        .filter((item): item is { entry: (typeof entries)[number]; score: number } => item !== null)
        .sort((left, right) => {
            if (right.score !== left.score) return right.score - left.score;
            return (right.entry.asset.creationTime ?? 0) - (left.entry.asset.creationTime ?? 0);
        })
        .slice(0, 60)
        .map(({ entry, score }) =>
            toSearchResultPhoto({
                id: entry.id,
                uri: entry.asset.uri,
                filename: entry.asset.filename,
                creationTime: entry.asset.creationTime,
            }, Math.min(0.99, score / (tokens.length * 3 + 1)))
        );

    return dedupePhotosByUri(scored);
}

async function searchRemotely(query: string): Promise<RemoteSearchResponse> {
    const baseUrl = resolveBackendBaseUrl();
    if (!baseUrl) {
        throw new Error('backend_not_configured');
    }

    let accessToken: string | undefined;
    try {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        accessToken = session?.access_token;
    } catch {
        accessToken = undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}`, {
            headers: {
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            signal: controller.signal,
        });
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('backend_timeout');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        throw new Error(`search_failed_${response.status}`);
    }

    const payload = (await response.json()) as BackendPayload;
    const results = payload.results ?? [];

    const photos = await Promise.all(
        results.map(async (result) => {
            let localAssetId: string | null = null;

            if (result.image_uuid) {
                localAssetId = await getLocalAssetId(result.image_uuid);
            }

            if (!localAssetId && result.photo_id?.startsWith('picked:')) {
                localAssetId = result.photo_id;
            }

            if (!localAssetId) return null;

            if (localAssetId.startsWith('picked:')) {
                const pickedAsset = await getPickedAsset(localAssetId);
                if (!pickedAsset?.uri) return null;

                return {
                    id: localAssetId,
                    uri: pickedAsset.uri,
                    filename: pickedAsset.filename,
                    creationTime: pickedAsset.creationTime,
                    score: result.score,
                } satisfies SearchResultPhoto;
            }

            try {
                const asset = await MediaLibrary.getAssetInfoAsync(localAssetId);
                const uri = asset.localUri ?? asset.uri;
                if (!uri) return null;

                return {
                    id: asset.id,
                    uri,
                    filename: asset.filename,
                    creationTime: asset.creationTime,
                    score: result.score,
                } satisfies SearchResultPhoto;
            } catch {
                return null;
            }
        })
    );

    const resolved: SearchResultPhoto[] = [];
    for (const photo of photos) {
        if (photo) {
            resolved.push(photo);
        }
    }

    return {
        photos: dedupePhotosByUri(resolved),
        mode: payload.mode ?? 'unknown',
    };
}

export async function searchPhotos(query: string): Promise<SearchPhotosResponse> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
        return { photos: [], usedFallback: false };
    }

    try {
        const remote = await searchRemotely(trimmedQuery);
        if (remote.photos.length > 0) {
            const degradedBackend = !SYNCED_BACKEND_MODES.has(remote.mode);
            return {
                photos: remote.photos,
                usedFallback: degradedBackend,
                fallbackReason: degradedBackend ? 'backend_degraded' : undefined,
            };
        }

        const localMatches = await searchLocally(trimmedQuery);
        if (localMatches.length > 0) {
            return {
                photos: localMatches,
                usedFallback: true,
                fallbackReason: 'no_synced_matches',
            };
        }

        const pickedFallback = await getPickedFallbackPhotos(trimmedQuery);

        return {
            photos: pickedFallback,
            usedFallback: true,
            fallbackReason: 'no_synced_matches',
        };
    } catch (error) {
        const localMatches = await searchLocally(trimmedQuery);
        if (localMatches.length > 0) {
            return {
                photos: localMatches,
                usedFallback: true,
                fallbackReason:
                    error instanceof Error && error.message === 'backend_not_configured'
                        ? 'backend_not_configured'
                        : 'backend_unavailable',
            };
        }

        const pickedFallback = await getPickedFallbackPhotos(trimmedQuery);

        return {
            photos: pickedFallback,
            usedFallback: true,
            fallbackReason:
                error instanceof Error && error.message === 'backend_not_configured'
                    ? 'backend_not_configured'
                    : 'backend_unavailable',
        };
    }
}

export async function clearRemoteSearchCache(): Promise<ClearSearchCacheResponse> {
    const baseUrl = resolveBackendBaseUrl();
    if (!baseUrl) {
        return {
            remoteCleared: false,
            reason: 'backend_not_configured',
        };
    }

    let accessToken: string | undefined;
    try {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        accessToken = session?.access_token;
    } catch {
        accessToken = undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${baseUrl}/api/search/cache`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            signal: controller.signal,
        });

        if (!response.ok) {
            return {
                remoteCleared: false,
                reason: 'backend_unavailable',
            };
        }

        const payload = (await response.json()) as ClearCachePayload;
        if (payload.status !== 'success') {
            return {
                remoteCleared: false,
                reason: 'backend_unavailable',
            };
        }

        return {
            remoteCleared: true,
        };
    } catch {
        return {
            remoteCleared: false,
            reason: 'backend_unavailable',
        };
    } finally {
        clearTimeout(timeoutId);
    }
}
