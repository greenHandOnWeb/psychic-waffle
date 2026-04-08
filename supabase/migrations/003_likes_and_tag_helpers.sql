-- 点赞与标签辅助：likes 表、images.likes_count、原子切换、去重标签 RPC
-- 在 001、002 之后执行

alter table public.images
  add column if not exists likes_count int not null default 0;

comment on column public.images.likes_count is '点赞数，与 public.likes 行数一致（由触发器在 insert/delete likes 时维护）';

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.images (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (image_id, user_id)
);

create index if not exists likes_image_id_idx on public.likes (image_id);
create index if not exists likes_user_id_idx on public.likes (user_id);

alter table public.likes enable row level security;

-- 仅查看自己的点赞记录（用于批量判断「是否已赞」）
create policy "likes_select_own" on public.likes for select
  using (auth.uid() = user_id);

create policy "likes_insert_own" on public.likes for insert
  with check (auth.uid() = user_id);

create policy "likes_delete_own" on public.likes for delete
  using (auth.uid() = user_id);

-- 由触发器维护 images.likes_count（避免调用方无权限 UPDATE 他人作品）
create or replace function public.on_likes_change_sync_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.images
      set likes_count = coalesce(likes_count, 0) + 1
      where id = new.image_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.images
      set likes_count = greatest(coalesce(likes_count, 0) - 1, 0)
      where id = old.image_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists likes_after_insert on public.likes;
create trigger likes_after_insert
  after insert on public.likes
  for each row
  execute function public.on_likes_change_sync_count();

drop trigger if exists likes_after_delete on public.likes;
create trigger likes_after_delete
  after delete on public.likes
  for each row
  execute function public.on_likes_change_sync_count();

-- 原子切换点赞：仅操作 likes 表，走调用方 RLS；计数由触发器写入
create or replace function public.toggle_image_like(p_image_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cnt int;
  now_liked boolean;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.images where id = p_image_id and is_public = true) then
    raise exception 'image not found';
  end if;
  if exists (select 1 from public.likes where image_id = p_image_id and user_id = uid) then
    delete from public.likes where image_id = p_image_id and user_id = uid;
    now_liked := false;
  else
    insert into public.likes (image_id, user_id) values (p_image_id, uid);
    now_liked := true;
  end if;
  select coalesce(likes_count, 0) into cnt from public.images where id = p_image_id;
  return jsonb_build_object('liked', now_liked, 'likes_count', cnt);
end;
$$;

comment on function public.toggle_image_like(uuid) is '切换当前用户对作品的点赞，返回 { liked, likes_count }';

grant execute on function public.toggle_image_like(uuid) to authenticated;

-- 画廊已出现过的去重标签（仅公开作品）
create or replace function public.gallery_distinct_tags()
returns table (tag text)
language sql
stable
as $$
  select distinct trim(u.t) as tag
  from public.images as i,
       lateral unnest(i.tags) as u(t)
  where i.is_public = true
    and u.t is not null
    and trim(u.t) <> ''
  order by 1;
$$;

grant execute on function public.gallery_distinct_tags() to anon, authenticated;
