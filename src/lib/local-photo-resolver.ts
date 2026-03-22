import * as MediaLibrary from 'expo-media-library';

import type { SearchResultPhoto } from '@/src/components/gallery/PhotoResultsGrid';
import { getLocalAssetId, getPickedAsset } from '@/src/lib/local-sync-store';
import { MOCK_PHOTOS } from '@/src/lib/mock-photos';

type ResolveLocalPhotoParams = {
    photoId?: string | null;
    imageUuid?: string | null;
};

export async function resolveLocalPhoto({
    photoId,
    imageUuid,
}: ResolveLocalPhotoParams): Promise<SearchResultPhoto | null> {
    const mockPhoto = photoId
        ? MOCK_PHOTOS.find((photo) => photo.id === photoId)
        : undefined;
    if (mockPhoto) {
        return {
            id: mockPhoto.id,
            uri: mockPhoto.uri,
            filename: mockPhoto.filename,
            creationTime: mockPhoto.creationTime,
        };
    }

    let localAssetId = photoId?.trim() || null;
    if (!localAssetId && imageUuid) {
        localAssetId = await getLocalAssetId(imageUuid);
    }

    if (!localAssetId) {
        return null;
    }

    if (localAssetId.startsWith('picked:')) {
        const pickedAsset = await getPickedAsset(localAssetId);
        if (!pickedAsset?.uri) {
            return null;
        }

        return {
            id: localAssetId,
            uri: pickedAsset.uri,
            filename: pickedAsset.filename,
            creationTime: pickedAsset.creationTime,
        };
    }

    try {
        const asset = await MediaLibrary.getAssetInfoAsync(localAssetId);
        const uri = asset.localUri ?? asset.uri;
        if (!uri) {
            return null;
        }

        return {
            id: asset.id,
            uri,
            filename: asset.filename,
            creationTime: asset.creationTime,
        };
    } catch {
        return null;
    }
}
