import * as MediaLibrary from 'expo-media-library';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export type Asset = MediaLibrary.Asset;
export type AssetInfo = MediaLibrary.AssetInfo;

type MediaPermissionState = 'granted' | 'limited' | 'denied' | 'undetermined';

function getPermissionArgs(): [boolean, MediaLibrary.GranularPermission[]?] {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        return [false, ['photo']];
    }

    return [false];
}

function normalizePermission(
    permission: Pick<MediaLibrary.PermissionResponse, 'status' | 'granted' | 'accessPrivileges'>
): MediaPermissionState {
    if (permission.granted || permission.status === 'granted') {
        return permission.accessPrivileges === 'limited' ? 'limited' : 'granted';
    }

    return permission.status === 'undetermined' ? 'undetermined' : 'denied';
}

export function isExpoGoStoreClient(): boolean {
    return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export async function getMediaPermissionState(): Promise<MediaPermissionState> {
    if (Platform.OS === 'android' && isExpoGoStoreClient()) {
        return 'denied';
    }

    try {
        const permission = await MediaLibrary.getPermissionsAsync(...getPermissionArgs());
        return normalizePermission(permission);
    } catch {
        return 'denied';
    }
}

export async function requestMediaPermission(): Promise<boolean> {
    if (Platform.OS === 'android' && isExpoGoStoreClient()) {
        return false;
    }

    try {
        const permission = await MediaLibrary.requestPermissionsAsync(...getPermissionArgs());
        const normalized = normalizePermission(permission);
        return normalized === 'granted' || normalized === 'limited';
    } catch {
        return false;
    }
}

export async function checkMediaPermission(): Promise<boolean> {
    const state = await getMediaPermissionState();
    return state === 'granted' || state === 'limited';
}

export async function fetchPhotos(after?: string): Promise<MediaLibrary.PagedInfo<Asset>> {
    return MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        first: 60,
        after,
    });
}

export async function fetchRecentPhotos(limit = 180): Promise<Asset[]> {
    const assets: Asset[] = [];
    let after: string | undefined;
    let hasNextPage = true;

    while (hasNextPage && assets.length < limit) {
        const page = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.photo,
            sortBy: [[MediaLibrary.SortBy.creationTime, false]],
            first: Math.min(60, limit - assets.length),
            after,
        });

        assets.push(...page.assets);
        after = page.endCursor;
        hasNextPage = page.hasNextPage;
    }

    return assets;
}

export function groupByDate(assets: Asset[]): { title: string; data: Asset[] }[] {
    const map: Record<string, Asset[]> = {};
    const keys: string[] = [];

    for (const asset of assets) {
        const label = new Date(asset.creationTime).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
        });

        if (!map[label]) {
            map[label] = [];
            keys.push(label);
        }

        map[label].push(asset);
    }

    return keys.map((title) => ({ title, data: map[title] }));
}

export async function getAssetById(id: string): Promise<AssetInfo> {
    return MediaLibrary.getAssetInfoAsync(id);
}

export function getVersionedMediaUri(uri: string, version?: number | null): string {
    if (!uri) return uri;

    const normalizedVersion =
        typeof version === 'number' && Number.isFinite(version) && version > 0
            ? Math.trunc(version)
            : 0;

    if (!normalizedVersion) return uri;

    return uri.includes('#')
        ? `${uri}&sgv=${normalizedVersion}`
        : `${uri}#sgv=${normalizedVersion}`;
}
