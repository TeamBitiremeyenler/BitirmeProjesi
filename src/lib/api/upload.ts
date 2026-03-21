import { supabase } from '@/lib/supabase';
import { saveMapping, savePickedAsset } from '@/src/lib/local-sync-store';
import type { AssetInfo } from '@/src/lib/media-library';

type UploadSearchablePhotoParams = {
    assetId: string;
    asset: AssetInfo;
};

type UploadFileForSearchParams = {
    sourceId: string;
    fileUri: string;
    filename?: string | null;
    creationTime?: number;
};

type UploadSearchablePhotoResponse = {
    imageUuid: string;
    photoId: string;
};

function resolveBackendBaseUrl(): string | null {
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
    return envUrl ? envUrl.replace(/\/$/, '') : null;
}

function inferMimeType(filename?: string | null): string {
    const lowered = filename?.toLowerCase() ?? '';

    if (lowered.endsWith('.png')) return 'image/png';
    if (lowered.endsWith('.webp')) return 'image/webp';
    if (lowered.endsWith('.heic') || lowered.endsWith('.heif')) return 'image/heic';

    return 'image/jpeg';
}

export async function uploadSearchablePhoto({
    assetId,
    asset,
}: UploadSearchablePhotoParams): Promise<UploadSearchablePhotoResponse> {
    return uploadFileForSearch({
        sourceId: assetId,
        fileUri: asset.localUri ?? asset.uri ?? '',
        filename: asset.filename,
        creationTime: asset.creationTime,
    });
}

export async function uploadFileForSearch({
    sourceId,
    fileUri,
    filename,
    creationTime,
}: UploadFileForSearchParams): Promise<UploadSearchablePhotoResponse> {
    const baseUrl = resolveBackendBaseUrl();
    if (!baseUrl) {
        throw new Error('backend_not_configured');
    }

    if (!fileUri) {
        throw new Error('missing_asset_uri');
    }

    let accessToken: string | undefined;
    try {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        accessToken = session?.access_token;
    } catch {
        accessToken = undefined;
    }

    const formData = new FormData();
    formData.append('photo_id', sourceId);

    if (creationTime) {
        formData.append('captured_at', new Date(creationTime).toISOString());
    }

    formData.append('file', {
        uri: fileUri,
        name: filename ?? `${sourceId}.jpg`,
        type: inferMimeType(filename),
    } as any);

    const response = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detail =
            typeof payload?.detail === 'string'
                ? payload.detail
                : `upload_failed_${response.status}`;
        throw new Error(detail);
    }

    const imageUuid = payload?.image_uuid;
    const photoId = payload?.photo_id;

    if (!imageUuid || !photoId) {
        throw new Error('invalid_upload_response');
    }

    await saveMapping(sourceId, imageUuid);

    return {
        imageUuid,
        photoId,
    };
}

export async function uploadPickedPhotoForSearch(params: {
    uri: string;
    filename?: string | null;
    creationTime?: number;
}): Promise<UploadSearchablePhotoResponse> {
    const sourceId = `picked:${Date.now()}`;

    const result = await uploadFileForSearch({
        sourceId,
        fileUri: params.uri,
        filename: params.filename,
        creationTime: params.creationTime,
    });

    await savePickedAsset(sourceId, {
        uri: params.uri,
        filename: params.filename,
        creationTime: params.creationTime,
    });

    return result;
}
