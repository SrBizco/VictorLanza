create table public.site_media (
  id uuid primary key default gen_random_uuid(),
  slot text not null unique,
  draft_storage_path text,
  published_storage_path text,
  media_type text check (media_type in ('image', 'video')),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create trigger site_media_updated_at
before update on public.site_media
for each row execute function public.touch_updated_at();

alter table public.site_media enable row level security;

create policy "public reads published site media metadata"
on public.site_media for select to anon, authenticated
using (published_storage_path is not null);

create policy "editors manage site media"
on public.site_media for all to authenticated
using (public.is_catalog_editor())
with check (public.is_catalog_editor());

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', false)
on conflict (id) do update set public = false;

create policy "public reads published site media files"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'site-media'
  and exists (
    select 1 from public.site_media media
    where media.published_storage_path = name
  )
);

create policy "editors manage site media files"
on storage.objects for all to authenticated
using (bucket_id = 'site-media' and public.is_catalog_editor())
with check (bucket_id = 'site-media' and public.is_catalog_editor());
