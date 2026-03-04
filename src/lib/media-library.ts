import * as MediaLibrary from 'expo-media-library';

export type Asset = MediaLibrary.Asset;
export type AssetInfo = MediaLibrary.AssetInfo;

/** Fetch one page of photos, newest first. */
export async function fetchPhotos(after?: string): Promise<MediaLibrary.PagedInfo<Asset>> {
    return MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        first: 60,
        after,
    });
}

/** Group assets into sections by "Mon YYYY" label. */
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

/** Fetch full info (localUri, exif, location) for a single asset. */
export async function getAssetById(id: string): Promise<AssetInfo> {
    return MediaLibrary.getAssetInfoAsync(id);
}
