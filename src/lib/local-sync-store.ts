import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'local_sync_map_v1';
const PICKED_KEY = 'picked_asset_map_v1';

type SyncMap = Record<string, string>;
type PickedAssetMap = Record<string, PickedAsset>;

export type PickedAsset = {
    uri: string;
    assetId?: string | null;
    filename?: string | null;
    width?: number | null;
    height?: number | null;
    creationTime?: number;
};

export type PickedAssetEntry = {
    id: string;
    asset: PickedAsset;
};

async function readMap(): Promise<SyncMap> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

async function writeMap(map: SyncMap): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

async function readPickedMap(): Promise<PickedAssetMap> {
    try {
        const raw = await AsyncStorage.getItem(PICKED_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

async function writePickedMap(map: PickedAssetMap): Promise<void> {
    await AsyncStorage.setItem(PICKED_KEY, JSON.stringify(map));
}

export async function saveMapping(localAssetId: string, backendUUID: string): Promise<void> {
    const map = await readMap();
    map[localAssetId] = backendUUID;
    await writeMap(map);
}

export async function getBackendUUID(localAssetId: string): Promise<string | null> {
    const map = await readMap();
    return map[localAssetId] ?? null;
}

export async function getLocalAssetId(backendUUID: string): Promise<string | null> {
    const map = await readMap();
    const entry = Object.entries(map).find(([, uuid]) => uuid === backendUUID);
    return entry ? entry[0] : null;
}

export async function removeMapping(localAssetId: string): Promise<void> {
    const map = await readMap();
    if (!(localAssetId in map)) return;

    delete map[localAssetId];
    await writeMap(map);
}

export async function savePickedAsset(localAssetId: string, asset: PickedAsset): Promise<void> {
    const map = await readPickedMap();
    map[localAssetId] = asset;
    await writePickedMap(map);
}

export async function getPickedAsset(localAssetId: string): Promise<PickedAsset | null> {
    const map = await readPickedMap();
    return map[localAssetId] ?? null;
}

export async function removePickedAsset(localAssetId: string): Promise<void> {
    const map = await readPickedMap();
    if (!(localAssetId in map)) return;

    delete map[localAssetId];
    await writePickedMap(map);
    await removeMapping(localAssetId);
}

export async function listPickedAssets(): Promise<PickedAssetEntry[]> {
    const map = await readPickedMap();

    return Object.entries(map)
        .map(([id, asset]) => ({ id, asset }))
        .sort((left, right) => (right.asset.creationTime ?? 0) - (left.asset.creationTime ?? 0));
}

export async function getUnsyncedAssetIds(allLocalIds: string[]): Promise<string[]> {
    const map = await readMap();
    return allLocalIds.filter((id) => !map[id]);
}

export async function clearSyncMap(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
    await AsyncStorage.removeItem(PICKED_KEY);
}
