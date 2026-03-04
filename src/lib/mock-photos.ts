// Mock photo assets for testing without device media library permissions
import type { Asset } from './media-library';

function mockAsset(id: number, creationTime: number): Asset {
    return {
        id: String(id),
        filename: `photo_${id}.jpg`,
        uri: `https://picsum.photos/seed/${id}/400/400`,
        mediaType: 'photo',
        mediaSubtypes: [],
        width: 400,
        height: 400,
        fileSize: 0,
        creationTime,
        modificationTime: creationTime,
        duration: 0,
        albumId: undefined,
    } as Asset;
}

const now = Date.now();
const day = 86_400_000;

export const MOCK_PHOTOS: Asset[] = [
    // This month
    ...Array.from({ length: 9 }, (_, i) => mockAsset(i + 1, now - i * day)),
    // Last month
    ...Array.from({ length: 9 }, (_, i) => mockAsset(i + 10, now - 35 * day - i * day)),
    // Two months ago
    ...Array.from({ length: 6 }, (_, i) => mockAsset(i + 19, now - 65 * day - i * day)),
];
