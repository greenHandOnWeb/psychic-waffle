-- 画廊分类：单图（上传素材）与拼团（编辑器保存生成的成品图）
-- 已在生产跑过 001 的库：仅执行本文件的 ALTER

alter table public.images
  add column if not exists gallery_category text not null default 'single';

alter table public.images
  add column if not exists source_image_id uuid references public.images (id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'images_gallery_category_check'
  ) then
    alter table public.images
      add constraint images_gallery_category_check
      check (gallery_category in ('single', 'collage'));
  end if;
end $$;

comment on column public.images.gallery_category is 'single=用户上传的编辑底稿；collage=保存布局时生成的拼团成品图';
comment on column public.images.source_image_id is '拼团成品对应的编辑源单图（images.id），仅 collage 时有值';

create index if not exists images_gallery_category_idx on public.images (gallery_category);
create index if not exists images_source_image_id_idx on public.images (source_image_id);
