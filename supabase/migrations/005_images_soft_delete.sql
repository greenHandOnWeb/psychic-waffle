-- 回收站：images 软删除（deleted_at）+ RLS + 标签 RPC
-- 在 001～004 之后执行

alter table public.images
  add column if not exists deleted_at timestamptz;

comment on column public.images.deleted_at is '非空表示已进入回收站；清空 deleted_at 为恢复；DELETE 为彻底删除';

create index if not exists images_deleted_at_idx on public.images (deleted_at);

-- 原策略仅「公开可见」；扩展为：公开且未删，或本人可见全部（含回收站/未公开）
drop policy if exists "images_select_public" on public.images;

create policy "images_select_visible" on public.images for select using (
  (is_public = true and deleted_at is null)
  or (auth.uid() = user_id)
);

-- 去重标签：仅统计未删除的公开作品
create or replace function public.gallery_distinct_tags()
returns table (tag text)
language sql
stable
as $$
  select distinct trim(u.t) as tag
  from public.images as i,
       lateral unnest(i.tags) as u(t)
  where i.is_public = true
    and i.deleted_at is null
    and u.t is not null
    and trim(u.t) <> ''
  order by 1;
$$;

-- 点赞：仅允许对「公开且未删」的作品操作（与画廊展示一致）
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
  if not exists (
    select 1 from public.images
    where id = p_image_id and is_public = true and deleted_at is null
  ) then
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
