-- AI 智能拼图画廊：表结构 + RLS + Storage 策略
-- 在 Supabase SQL Editor 或 CLI 中按序执行

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- profiles：与 auth.users 一对一
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is '用户公开资料；id 与 auth.users.id 一致';

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles for select using (true);

create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- images：画廊图片元数据（layout 中 x/y/w/h 使用 0–100 百分比）
-- -----------------------------------------------------------------------------
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  public_url text,
  title text,
  tags text[] not null default '{}',
  layout jsonb not null default '{}'::jsonb,
  file_size_bytes int,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists images_user_id_idx on public.images (user_id);
create index if not exists images_created_at_idx on public.images (created_at desc);

alter table public.images enable row level security;

-- 公开画廊：仅展示 is_public 为 true 的条目
create policy "images_select_public" on public.images for select using (is_public = true);

create policy "images_insert_authenticated" on public.images for insert
with check (
  auth.role() = 'authenticated'
  and auth.uid() = user_id
);

create policy "images_update_own" on public.images for update using (auth.uid() = user_id);

create policy "images_delete_own" on public.images for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- templates：云端拼图模板（演示阶段：认证用户可写；生产建议改为 admin role）
-- -----------------------------------------------------------------------------
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  thumbnail_url text,
  layout jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.templates enable row level security;

create policy "templates_select_all" on public.templates for select using (true);

create policy "templates_insert_demo" on public.templates for insert
with check (auth.role() = 'authenticated');

create policy "templates_update_demo" on public.templates for update
using (auth.role() = 'authenticated');

create policy "templates_delete_demo" on public.templates for delete
using (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- Storage：bucket + objects RLS（路径约定：{user_id}/文件名）
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('gallery-images', 'gallery-images', true)
on conflict (id) do update set public = excluded.public;

-- 公开读（画廊展示）
create policy "storage_gallery_images_select" on storage.objects for select
using (bucket_id = 'gallery-images');

-- 认证用户仅可在以自己 id 为根目录的路径下上传
create policy "storage_gallery_images_insert_own" on storage.objects for insert
with check (
  bucket_id = 'gallery-images'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_gallery_images_update_own" on storage.objects for update
using (
  bucket_id = 'gallery-images'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_gallery_images_delete_own" on storage.objects for delete
using (
  bucket_id = 'gallery-images'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
