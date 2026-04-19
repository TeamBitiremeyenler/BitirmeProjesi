import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Asset } from './media-library';

const KEY = 'saved_library_assets_v1';
const MAX_ITEMS = 40;

type SavedAssetRecord = Pick<
    Asset,
    | 'id'
    | 'filename'
    | 'uri'
    | 'mediaType'
    | 'mediaSubtypes'
    | 'width'
    | 'height'
    | 'creationTime'
    | 'modificationTime'
    | 'duration'
    | 'albumId'
>;

type Listener = () => void;

const listeners = new Set<Listener>();

function emit() {
    listeners.forEach((listener) => {
        try {
            listener();
        } catch {
            // Ignore listener errors.
        }
    });
}

function normalizeSavedAsset(asset: Asset): SavedAssetRecord {
    const now = Date.now();
    const creationTime = asset.creationTime && asset.creationTime > 0 ? asset.creationTime : now;
    const modificationTime = asset.modificationTime && asset.modificationTime > 0
        ? asset.modificationTime
        : creationTime;

    return {
        id: asset.id,
        filename: asset.filename ?? `saved_${asset.id}.jpg`,
        uri: asset.uri,
        mediaType: asset.mediaType ?? 'photo',
        mediaSubtypes: asset.mediaSubtypes ?? [],
        width: asset.width ?? 0,
        height: asset.height ?? 0,
        creationTime,
        modificationTime,
        duration: asset.duration ?? 0,
        albumId: asset.albumId,
    };
}

function dedupeAssets(assets: SavedAssetRecord[]): SavedAssetRecord[] {
    const sorted = [...assets].sort((left, right) => (right.creationTime ?? 0) - (left.creationTime ?? 0));
    const seen = new Set<string>();
    const deduped: SavedAssetRecord[] = [];

    for (const asset of sorted) {
        const key = asset.id || asset.uri;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(asset);
    }

    return deduped.slice(0, MAX_ITEMS);
}

async function readSavedAssets(): Promise<SavedAssetRecord[]> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? dedupeAssets(parsed as SavedAssetRecord[]) : [];
    } catch {
        return [];
    }
}

async function writeSavedAssets(assets: SavedAssetRecord[]): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(dedupeAssets(assets)));
}

export function subscribeSavedLibraryAssets(listener: Listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export async function listSavedLibraryAssets(): Promise<Asset[]> {
    return readSavedAssets();
}

export async function saveSavedLibraryAsset(asset: Asset): Promise<void> {
    const current = await readSavedAssets();
    await writeSavedAssets([normalizeSavedAsset(asset), ...current]);
    emit();
}

export async function removeSavedLibraryAsset(assetId: string): Promise<void> {
    const current = await readSavedAssets();
    await writeSavedAssets(current.filter((asset) => asset.id !== assetId));
    emit();
}

export async function removeSavedLibraryAssets(assetIds: string[]): Promise<void> {
    if (assetIds.length === 0) return;

    const ids = new Set(assetIds);
    const current = await readSavedAssets();
    await writeSavedAssets(current.filter((asset) => !ids.has(asset.id)));
    emit();
}

export async function clearSavedLibraryAssets(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
    emit();
}
