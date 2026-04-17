create extension if not exists vector with schema extensions;

alter table public.face_clusters
    add column if not exists centroid vector(512),
    add column if not exists sample_count integer not null default 1,
    add column if not exists cover_image_uuid uuid,
    add column if not exists cover_photo_id text,
    add column if not exists updated_at timestamptz not null default now();

alter table public.face_clusters
    alter column sample_count set default 1,
    alter column updated_at set default now();

create index if not exists face_clusters_user_id_idx
    on public.face_clusters(user_id);
