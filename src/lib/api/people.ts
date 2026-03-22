import { supabase } from '@/lib/supabase';

export type PeopleCluster = {
    id: string;
    name: string;
    photoCount: number;
    coverPhotoId: string | null;
    coverImageUuid: string | null;
    photoIds: string[];
    imageUuids: string[];
    lastSeenAt: string | null;
};

type PeopleListPayload = {
    source?: string;
    clusters?: {
        id?: string;
        name?: string;
        photo_count?: number;
        cover_photo_id?: string | null;
        cover_image_uuid?: string | null;
        photo_ids?: string[];
        image_uuids?: string[];
        last_seen_at?: string | null;
    }[];
};

type PeopleClusterPayload = NonNullable<PeopleListPayload['clusters']>[number];

type PersonDetailPayload = {
    source?: string;
    cluster?: PeopleClusterPayload;
};

type RenamePersonPayload = PersonDetailPayload;

export type PeopleApiResponse = {
    source: string;
    clusters: PeopleCluster[];
};

export type PersonDetailResponse = {
    source: string;
    cluster: PeopleCluster;
};

function resolveBackendBaseUrl(): string | null {
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
    return envUrl ? envUrl.replace(/\/$/, '') : null;
}

async function getAccessToken(): Promise<string | undefined> {
    try {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        return session?.access_token;
    } catch {
        return undefined;
    }
}

function normalizeCluster(cluster: PeopleClusterPayload | undefined): PeopleCluster {
    return {
        id: cluster?.id ?? '',
        name: cluster?.name?.trim() || 'Unnamed Person',
        photoCount: cluster?.photo_count ?? 0,
        coverPhotoId: cluster?.cover_photo_id ?? null,
        coverImageUuid: cluster?.cover_image_uuid ?? null,
        photoIds: cluster?.photo_ids ?? [],
        imageUuids: cluster?.image_uuids ?? [],
        lastSeenAt: cluster?.last_seen_at ?? null,
    };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const baseUrl = resolveBackendBaseUrl();
    if (!baseUrl) {
        throw new Error('backend_not_configured');
    }

    const accessToken = await getAccessToken();
    const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...(init?.headers ?? {}),
        },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detail =
            typeof payload?.detail === 'string'
                ? payload.detail
                : `${response.status}`;
        throw new Error(detail);
    }

    return payload as T;
}

export async function listPeopleClusters(): Promise<PeopleApiResponse> {
    const payload = await requestJson<PeopleListPayload>('/api/people');

    return {
        source: payload.source ?? 'unknown',
        clusters: (payload.clusters ?? [])
            .map(normalizeCluster)
            .filter((cluster) => Boolean(cluster.id)),
    };
}

export async function getPersonCluster(clusterId: string): Promise<PersonDetailResponse> {
    const payload = await requestJson<PersonDetailPayload>(`/api/people/${encodeURIComponent(clusterId)}`);
    const cluster = normalizeCluster(payload.cluster);

    if (!cluster.id) {
        throw new Error('person_not_found');
    }

    return {
        source: payload.source ?? 'unknown',
        cluster,
    };
}

export async function renamePersonCluster(clusterId: string, name: string): Promise<PersonDetailResponse> {
    const payload = await requestJson<RenamePersonPayload>(`/api/people/${encodeURIComponent(clusterId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
    });
    const cluster = normalizeCluster(payload.cluster);

    if (!cluster.id) {
        throw new Error('person_not_found');
    }

    return {
        source: payload.source ?? 'unknown',
        cluster,
    };
}
