create table public.editor_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  can_edit boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_catalog_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.editor_profiles
    where id = auth.uid() and can_edit = true
  );
$$;

create table public.catalog_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published')),
  draft_payload jsonb not null default '{}'::jsonb,
  published_payload jsonb,
  translation_state jsonb not null default '{"en":"missing","ptBR":"missing"}'::jsonb,
  sort_order integer not null default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  section text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published')),
  draft_payload jsonb not null default '{}'::jsonb,
  published_payload jsonb,
  translation_state jsonb not null default '{"en":"missing","ptBR":"missing"}'::jsonb,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.catalog_media (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.catalog_entries(id) on delete cascade,
  storage_path text not null unique,
  media_type text not null check (media_type in ('image', 'video')),
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger catalog_entries_updated_at
before update on public.catalog_entries
for each row execute function public.touch_updated_at();

create trigger site_content_updated_at
before update on public.site_content
for each row execute function public.touch_updated_at();

alter table public.editor_profiles enable row level security;
alter table public.catalog_entries enable row level security;
alter table public.site_content enable row level security;
alter table public.catalog_media enable row level security;

create policy "editors read editor profiles"
on public.editor_profiles for select to authenticated
using (public.is_catalog_editor());

create policy "public reads published entries"
on public.catalog_entries for select to anon, authenticated
using (status = 'published' and is_deleted = false);

create policy "editors manage catalogue"
on public.catalog_entries for all to authenticated
using (public.is_catalog_editor())
with check (public.is_catalog_editor());

create policy "public reads published site sections"
on public.site_content for select to anon, authenticated
using (status = 'published');

create policy "editors manage site sections"
on public.site_content for all to authenticated
using (public.is_catalog_editor())
with check (public.is_catalog_editor());

create policy "public reads published media metadata"
on public.catalog_media for select to anon, authenticated
using (
  is_published = true
  and exists (
    select 1 from public.catalog_entries entry
    where entry.id = entry_id and entry.status = 'published' and entry.is_deleted = false
  )
);

create policy "editors manage media metadata"
on public.catalog_media for all to authenticated
using (public.is_catalog_editor())
with check (public.is_catalog_editor());

insert into storage.buckets (id, name, public)
values ('catalog-media', 'catalog-media', false)
on conflict (id) do update set public = false;

create policy "public reads published media files"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'catalog-media'
  and exists (
    select 1 from public.catalog_media media
    join public.catalog_entries entry on entry.id = media.entry_id
    where media.storage_path = name
      and media.is_published = true
      and entry.status = 'published'
      and entry.is_deleted = false
  )
);

create policy "editors manage media files"
on storage.objects for all to authenticated
using (bucket_id = 'catalog-media' and public.is_catalog_editor())
with check (bucket_id = 'catalog-media' and public.is_catalog_editor());
