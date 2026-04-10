-- 云端拼图模板初始数据（与 src/mocks/templates-seed.json 一致）
-- 在 001～003 之后执行；已存在相同 id 时跳过

insert into public.templates (id, name, description, thumbnail_url, layout, created_at)
values
  (
    '11111111-1111-4111-8111-111111111111'::uuid,
    '单图居中',
    '一张主图置于画布中央',
    null,
    '{"version":1,"elements":[{"id":"tpl-el-1","src":"https://picsum.photos/seed/puzzle-a/640/480","xPct":15,"yPct":12.5,"wPct":70,"hPct":75,"zIndex":1,"rotation":0}]}'::jsonb,
    '2026-01-01T00:00:00Z'::timestamptz
  ),
  (
    '22222222-2222-4222-8222-222222222222'::uuid,
    '双图并排',
    '左右两栏拼图',
    null,
    '{"version":1,"elements":[{"id":"tpl-el-a","src":"https://picsum.photos/seed/puzzle-b1/520/640","xPct":5,"yPct":15,"wPct":42,"hPct":70,"zIndex":1},{"id":"tpl-el-b","src":"https://picsum.photos/seed/puzzle-b2/520/640","xPct":53,"yPct":15,"wPct":42,"hPct":70,"zIndex":2}]}'::jsonb,
    '2026-01-01T00:00:00Z'::timestamptz
  )
on conflict (id) do nothing;
