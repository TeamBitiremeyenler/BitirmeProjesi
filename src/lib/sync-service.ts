import { uploadSearchablePhoto } from '@/src/lib/api/upload';
import { getUnsyncedAssetIds } from '@/src/lib/local-sync-store';
import { checkMediaPermission, fetchRecentPhotos, getAssetById } from '@/src/lib/media-library';

const RECENT_SCAN_LIMIT = 120;
const SYNC_BATCH_LIMIT = 18;

export type SyncLaunchSummary = {
    status:
    | 'completed'
    | 'skipped_no_permission'
    | 'skipped_backend_not_configured'
    | 'skipped_no_work';
    scanned: number;
    queued: number;
    failed: number;
};

let inFlightSync: Promise<SyncLaunchSummary> | null = null;

function hasBackendUrl(): boolean {
    return Boolean(process.env.EXPO_PUBLIC_BACKEND_URL?.trim());
}

async function runLaunchSync(): Promise<SyncLaunchSummary> {
    if (!hasBackendUrl()) {
        return {
            status: 'skipped_backend_not_configured',
            scanned: 0,
            queued: 0,
            failed: 0,
        };
    }

    const hasPermission = await checkMediaPermission();
    if (!hasPermission) {
        return {
            status: 'skipped_no_permission',
            scanned: 0,
            queued: 0,
            failed: 0,
        };
    }

    const recentAssets = await fetchRecentPhotos(RECENT_SCAN_LIMIT);
    const unsyncedAssetIds = await getUnsyncedAssetIds(recentAssets.map((asset) => asset.id));
    const nextBatch = unsyncedAssetIds.slice(0, SYNC_BATCH_LIMIT);

    if (nextBatch.length === 0) {
        return {
            status: 'skipped_no_work',
            scanned: recentAssets.length,
            queued: 0,
            failed: 0,
        };
    }

    let queued = 0;
    let failed = 0;

    for (const assetId of nextBatch) {
        try {
            const assetInfo = await getAssetById(assetId);
            await uploadSearchablePhoto({
                assetId,
                asset: assetInfo,
            });
            queued += 1;
        } catch (error) {
            if (error instanceof Error && error.message === 'backend_not_configured') {
                return {
                    status: 'skipped_backend_not_configured',
                    scanned: recentAssets.length,
                    queued,
                    failed,
                };
            }

            failed += 1;
        }
    }

    return {
        status: 'completed',
        scanned: recentAssets.length,
        queued,
        failed,
    };
}

export function ensureLaunchSearchSync(): Promise<SyncLaunchSummary> {
    if (!inFlightSync) {
        inFlightSync = runLaunchSync().finally(() => {
            inFlightSync = null;
        });
    }

    return inFlightSync;
}
