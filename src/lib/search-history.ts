import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'recent_search_queries_v1';
const MAX_ITEMS = 8;

function normalizeQuery(query: string): string {
    return query.trim().replace(/\s+/g, ' ');
}

export async function listRecentSearchQueries(): Promise<string[]> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
            ? parsed.filter((value): value is string => typeof value === 'string')
            : [];
    } catch {
        return [];
    }
}

export async function saveRecentSearchQuery(query: string): Promise<string[]> {
    const normalized = normalizeQuery(query);
    if (!normalized) {
        return listRecentSearchQueries();
    }

    const existing = await listRecentSearchQueries();
    const next = [
        normalized,
        ...existing.filter((value) => value.toLowerCase() !== normalized.toLowerCase()),
    ].slice(0, MAX_ITEMS);

    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
}

export async function clearRecentSearchQueries(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
}
