-- =====================================================================
--  MUGHAI MUTRAM — Supabase setup
--  Paste this whole file into  Supabase → SQL Editor → New query → Run.
--
--  BEFORE YOU RUN IT: change  YOUR-ADMIN-EMAIL@gmail.com  (one place,
--  in the is_admin() function below) to the email of your admin user.
-- =====================================================================

-- ---------- who is the admin? ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'YOUR-ADMIN-EMAIL@gmail.com'
$$;


-- ---------- tables ----------
create table if not exists public.announcement (
  id          int primary key default 1 check (id = 1),
  text        text not null default '',
  updated_at  timestamptz not null default now()
);
insert into public.announcement (id, text) values (1, '') on conflict (id) do nothing;

create table if not exists public.gallery (
  id          uuid primary key default gen_random_uuid(),
  image_url   text not null,
  image_path  text,
  title       text not null default '',
  caption     text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.videos (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('youtube', 'video')),
  url         text not null,
  title       text not null default '',
  caption     text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.enquiries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name)    between 1 and 200),
  phone       text not null check (char_length(phone)   between 1 and 40),
  program     text          check (program is null or char_length(program) <= 100),
  message     text          check (message is null or char_length(message) <= 2000),
  status      text not null default 'New' check (status in ('New', 'Contacted', 'Closed')),
  created_at  timestamptz not null default now()
);


-- ---------- turn on row level security ----------
alter table public.announcement enable row level security;
alter table public.gallery      enable row level security;
alter table public.videos       enable row level security;
alter table public.enquiries    enable row level security;


-- ---------- what visitors (anon) and the admin (authenticated) may do ----------
revoke all on public.announcement, public.gallery, public.videos, public.enquiries from anon, authenticated;

-- visitors: read what the website shows
grant select on public.announcement, public.gallery, public.videos to anon, authenticated;
-- visitors: add an enquiry, and ONLY these four columns
grant insert (name, phone, program, message) on public.enquiries to anon;

-- admin: full control (still limited to is_admin() by the policies below)
grant select, insert, update, delete on public.announcement, public.gallery, public.videos, public.enquiries to authenticated;


-- ---------- policies ----------
drop policy if exists "public read announcement" on public.announcement;
drop policy if exists "admin write announcement" on public.announcement;
create policy "public read announcement" on public.announcement for select to anon, authenticated using (true);
create policy "admin write announcement"  on public.announcement for all    to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read gallery" on public.gallery;
drop policy if exists "admin write gallery" on public.gallery;
create policy "public read gallery" on public.gallery for select to anon, authenticated using (true);
create policy "admin write gallery"  on public.gallery for all    to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read videos" on public.videos;
drop policy if exists "admin write videos" on public.videos;
create policy "public read videos" on public.videos for select to anon, authenticated using (true);
create policy "admin write videos"  on public.videos for all    to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "visitors add enquiry" on public.enquiries;
drop policy if exists "admin manage enquiries" on public.enquiries;
create policy "visitors add enquiry"     on public.enquiries for insert to anon with check (status = 'New');
create policy "admin manage enquiries"   on public.enquiries for all    to authenticated using (public.is_admin()) with check (public.is_admin());


-- ---------- photo storage ----------
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do update set public = true;

drop policy if exists "admin upload photos" on storage.objects;
drop policy if exists "admin update photos" on storage.objects;
drop policy if exists "admin delete photos" on storage.objects;
create policy "admin upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'gallery' and public.is_admin());
create policy "admin update photos" on storage.objects for update to authenticated using (bucket_id = 'gallery' and public.is_admin());
create policy "admin delete photos" on storage.objects for delete to authenticated using (bucket_id = 'gallery' and public.is_admin());
-- (anyone can VIEW photos through their public links, because the bucket is public)
