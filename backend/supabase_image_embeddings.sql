create extension if not exists vector with schema extensions;

alter table public.images
    add column if not exists embedding vector(1536);

alter table public.images
    alter column embedding drop not null;

alter table public.images
    alter column embedding type vector(1536)
    using case
        when embedding is null then null
        when vector_dims(embedding) = 1536 then embedding::vector(1536)
        else null
    end;

drop index if exists public.images_embedding_idx;

create index if not exists images_embedding_idx
    on public.images
    using ivfflat (embedding vector_cosine_ops)
    with (lists = 100)
    where embedding is not null;

drop function if exists public.match_images(vector, uuid, integer);
drop function if exists public.match_images(vector, text, integer);

create or replace function public.match_images(
    query_embedding vector(1536),
    filter_user_id uuid,
    match_count integer default 24
)
returns table (
    image_uuid uuid,
    photo_id text,
    score double precision,
    persons jsonb,
    captured_at text,
    match_reason text
)
language sql
stable
as $$
    select
        images.uuid as image_uuid,
        images.photo_id::text as photo_id,
        greatest(0.0, least(1.0, 1.0 - (images.embedding <=> query_embedding)))::double precision as score,
        coalesce(to_jsonb(images.persons), '[]'::jsonb) as persons,
        images.captured_at::text as captured_at,
        'siglip2_vector'::text as match_reason
    from public.images
    where images.user_id::text = filter_user_id::text
        and images.embedding is not null
    order by images.embedding <=> query_embedding
    limit match_count;
$$;
