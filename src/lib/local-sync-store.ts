/**
 * local-sync-store.ts
 *
 * Persists a bidirectional map between:
 *   localAssetId  (expo-media-library asset ID on this device)
 *   backendUUID   (UUID assigned by the backend after upload & AI processing)
 *
 * WHY: When the backend's search API returns "UUID-abc123 matches your query",
 * the app needs to look up which local file URI that corresponds to, so it can
 * open/display the photo without re-downloading it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'local_sync_map_v1';

type SyncMap = Record<string, string>; // localAssetId → backendUUID

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

/** Save a local → backend UUID mapping after a successful upload. */
export async function saveMapping(localAssetId: string, backendUUID: string): Promise<void> {
    const map = await readMap();
    map[localAssetId] = backendUUID;
    await writeMap(map);
}

/** Given a local asset ID, return the backend UUID (or null if not yet synced). */
export async function getBackendUUID(localAssetId: string): Promise<string | null> {
    const map = await readMap();
    return map[localAssetId] ?? null;
}

/** Given a backend UUID, return the local asset ID (reverse lookup). */
export async function getLocalAssetId(backendUUID: string): Promise<string | null> {
    const map = await readMap();
    const entry = Object.entries(map).find(([, uuid]) => uuid === backendUUID);
    return entry ? entry[0] : null;
}

/** Return all local asset IDs that have NOT been synced to the backend yet. */
export async function getUnsyncedAssetIds(allLocalIds: string[]): Promise<string[]> {
    const map = await readMap();
    return allLocalIds.filter(id => !map[id]);
}

/** Clear the entire map (e.g. on logout). */
export async function clearSyncMap(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
}
