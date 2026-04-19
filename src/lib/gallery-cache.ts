import type { PickedAssetEntry } from './local-sync-store';
import { fetchPhotos, type Asset } from './media-library';

type GalleryCacheListener = () => void;

type GalleryCacheState = {
    libraryAssets: Asset[];
    libraryCursor?: string;
    libraryHasMore: boolean;
    pickedAssets: PickedAssetEntry[];
};

const listeners = new Set<GalleryCacheListener>();

let cacheState: GalleryCacheState = {
    libraryAssets: [],
    libraryCursor: undefined,
    libraryHasMore: true,
    pickedAssets: [],
};

let warmPromise: Promise<void> | null = null;

function emit() {
    listeners.forEach((listener) => {
        try {
            listener();
        } catch {
            // Ignore cache listener errors.
        }
    });
}

function sortAssetsNewestFirst(assets: Asset[]): Asset[] {
    return [...assets].sort((left, right) => (right.creationTime ?? 0) - (left.creationTime ?? 0));
}

function dedupeAssets(assets: Asset[]): Asset[] {
    const seen = new Set<string>();
    const deduped: Asset[] = [];

    for (const asset of assets) {
        const key = asset.id || asset.uri;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(asset);
    }

    return sortAssetsNewestFirst(deduped);
}

export function subscribeGalleryCache(listener: GalleryCacheListener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getGalleryCacheSnapshot(): GalleryCacheState {
    return {
        libraryAssets: [...cacheState.libraryAssets],
        libraryCursor: cacheState.libraryCursor,
        libraryHasMore: cacheState.libraryHasMore,
        pickedAssets: [...cacheState.pickedAssets],
    };
}

export function replaceCachedLibraryAssets(assets: Asset[], cursor?: string, hasMore = false) {
    cacheState = {
        ...cacheState,
        libraryAssets: dedupeAssets(assets),
        libraryCursor: cursor,
        libraryHasMore: hasMore,
    };
    emit();
}

export function removeCachedLibraryAssets(assetIds: string[]) {
    if (assetIds.length === 0) return;

    const ids = new Set(assetIds);
    cacheState = {
        ...cacheState,
        libraryAssets: cacheState.libraryAssets.filter((asset) => !ids.has(asset.id)),
    };
    emit();
}

export function appendCachedLibraryAssets(assets: Asset[], cursor?: string, hasMore = false) {
    cacheState = {
        ...cacheState,
        libraryAssets: dedupeAssets([...cacheState.libraryAssets, ...assets]),
        libraryCursor: cursor,
        libraryHasMore: hasMore,
    };
    emit();
}

export function replaceCachedPickedAssets(entries: PickedAssetEntry[]) {
    cacheState = {
        ...cacheState,
        pickedAssets: [...entries],
    };
    emit();
}

export function removeCachedPickedAssets(assetIds: string[]) {
    if (assetIds.length === 0) return;

    const ids = new Set(assetIds);
    cacheState = {
        ...cacheState,
        pickedAssets: cacheState.pickedAssets.filter((entry) => !ids.has(entry.id)),
    };
    emit();
}

export async function warmRemainingLibraryAssets() {
    if (warmPromise || !cacheState.libraryHasMore) {
        return warmPromise ?? Promise.resolve();
    }

    warmPromise = (async () => {
        let after = cacheState.libraryCursor;
        let hasMore = cacheState.libraryHasMore;

        while (hasMore) {
            const page = await fetchPhotos(after);
            appendCachedLibraryAssets(page.assets, page.endCursor, page.hasNextPage);
            after = page.endCursor;
            hasMore = page.hasNextPage;
        }
    })().finally(() => {
        warmPromise = null;
    });

    return warmPromise;
}
