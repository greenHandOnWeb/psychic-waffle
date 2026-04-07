# AI 智能拼图画廊

基于 Vue 3 + Vite + TypeScript 的 Web 应用：用户上传图片后使用 **Mock AI** 自动打标签，可在画廊浏览作品，并使用 **Fabric.js** 自由排版拼图；海报导出以 **Fabric 栅格化** 为主。数据与存储在非 Mock 模式下由 **Supabase**（Auth / Postgres / Storage）承载，并配套 **RLS** 与 Storage 策略（见 `supabase/migrations`）。

## 功能说明（近期新增）

### 画廊分类

- 上传作品默认归入 **单图**（可进编辑器排版）。
- 编辑器中 **保存并生成拼团**：更新当前单图的 `layout`，将整张画布导出为 JPEG 上传到 Storage（路径含 `collages/`），并新增一条 **拼团** 记录（`gallery_category = collage`，`source_image_id` 指向源单图）。
- 画廊页提供 **全部 / 单图 / 拼团** 筛选；拼团卡片可跳转 **继续编辑原稿**（源单图）。

### 云端模板与画布内容

- 选择模板后先展示 **示例图**（Fabric 对象带 `tpl-ph:` 前缀，仅作占位）。
- **添加图片**（本机或 **从画廊选择**：我的 / 公开）在仍有示例占位时，会移除示例并按模板槽位填入；**槽位多于图片时剩余留空**，不会用最后一张图重复填满。
- **切换模板**时 **不会** `clear` 整张画布：移除旧示例后，将 **主图**（非 `tpl-ph`、非表情包 `fg-sticker`）按 **上→下、左→右** 排序，依次套入新模板各槽的几何位置；不足槽位补新示例图（底层）；多出的主图保持原位置。文字、表情包贴纸、底色与背景图不参与槽位重排（贴纸与文字保留）。

### 文字与表情包

- **文字**：`IText`，支持 **字体**（预设下拉）、**颜色**、**字号**（8–200）、**粗体 / 斜体**；属性写入 `layout.elements` 中 `kind: 'text'` 的字段（含 `fontFamily`、`fill`、`fontSize`、`fontWeight`、`fontStyle`）。
- **表情包**：点击 **添加表情包** 打开弹窗，可选来源：**常用贴纸**（Twemoji CDN 图）、**颜文字**（插入为文字图层）、**联网搜索**（Giphy 贴纸，需配置 `VITE_GIPHY_API_KEY`）、**本机图片**。其中图片类在布局中记为 `kind: 'sticker'`；数据与搜索逻辑见 **`src/data/stickers-common.ts`**、**`src/services/giphy-stickers.ts`**，弹窗见 **`src/components/sticker-picker-modal.vue`**。

### 画布背景

- **底色**：取色器，写入 `layout.backgroundColor`。
- **背景图**：本机图片铺满画布（cover），不可点选，写入 `layout.backgroundImageSrc`（URL 或 data URL）；可 **清除背景图**。

### 背景音乐（时间轴分段）

- 在编辑器中维护 **`layout.audioSegments`**：每段含 `startSec`（起点秒）、上传后的 `storagePath` / `publicUrl`、可选 `title`、`sourceUrl`。
- 支持 **本地上传** 或 **联网 URL 拉取再上传**（需目标允许 **CORS**，否则请改用本地上传）；文件存入 `{userId}/audio/`（与 `gallery-images` 桶策略一致）。
- **试听时间轴**：按 `startSec` 排队播放多段（多段可重叠，由起点自行控制）。
- 单文件上限见 `src/data.ts` 中 `MAX_AUDIO_UPLOAD_BYTES`（默认 20MB）。

### 布局 JSON 版本

- `layout.version` 当前为 **3**（`LAYOUT_SCHEMA_VERSION`），在兼容旧数据的前提下包含：画布元素、`backgroundColor` / `backgroundImageSrc`、`audioSegments` 等。旧作品无新字段时按默认值处理。

## 技术栈

- Vue 3.5、Vite 6、TypeScript、Vue Router、Pinia（`pinia-plugin-persistedstate`）
- Tailwind CSS、@headlessui/vue、lucide-vue-next、vue-sonner
- Supabase JS、Fabric.js、html-to-image、browser-image-compression

## 安全提示

<p><strong style="color: red">严禁将真实的 VITE_SUPABASE_ANON_KEY 提交到公共 GitHub 仓库。</strong></p>

Anon Key 仍受 RLS 约束，但泄露会增加撞库与滥用风险；请使用环境变量或 CI 密钥注入，并定期轮换。

## 本地开发

```bash
npm install
npm run dev
```

根目录已提供 [`.env.development`](./.env.development)，默认 `VITE_SUPABASE_MOCK=true`，可在无 Supabase 项目时离线开发（数据写入 **localStorage**，并模拟约 500ms 延迟）。

复制 [`.env.example`](./.env.example) 为 `.env` 并按需修改。可选：`VITE_GIPHY_API_KEY`（表情包联网搜索，见 [Giphy Developers](https://developers.giphy.com/)），配置后需重启 dev。

连接真实 Supabase 时：

1. 将 `VITE_SUPABASE_MOCK` 设为 `false`（或删除该变量）。
2. 填写 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`。
3. 在 Supabase 控制台按序执行迁移：`001_init.sql`、`002_images_gallery_category.sql`（画廊分类字段），并确保 Storage bucket 与脚本一致（`gallery-images`）。

其他脚本：

- `npm run build` — 类型检查与生产构建
- `npm run preview` — 预览构建产物
- `npm run lint` / `npm run format` — ESLint / Prettier
- `npm run init-repo` — 若无 `.git` 则 `git init`，并合并基础 `.gitignore` 条目

## Mock 模式说明

- `VITE_SUPABASE_MOCK=true` 时，`src/lib/supabase.ts` 导出内存 + localStorage 驱动的模拟客户端，模板种子见 [`src/mocks/templates-seed.json`](./src/mocks/templates-seed.json)。
- 大图以 Data URL 持久化可能占满浏览器存储配额；若写入失败，控制台会提示，可清理站点数据后重试。

## 目录结构（摘要）

| 路径                                  | 说明 |
| ------------------------------------- | ---- |
| `supabase/migrations/`                | 表结构、RLS、Storage 策略（含 `002` 画廊分类） |
| `src/lib/supabase.ts`                 | 真实 / Mock 客户端与 `ensureMockSession` |
| `src/data.ts`                         | 画布、布局版本、音频与文字等常量 |
| `src/data/stickers-common.ts`         | 常用 Twemoji / 颜文字数据（可与表情包弹窗配合） |
| `src/utils/image-compress.ts`         | 压缩与上传大小上限 |
| `src/utils/audio-timeline.ts`         | 远程音频拉取（CORS）与扩展名辅助 |
| `src/utils/export-poster.ts`          | Fabric 导出 JPEG / Blob |
| `src/services/ai-tags.ts`             | Mock 标签 |
| `src/services/giphy-stickers.ts`      | Giphy 贴纸搜索（需 `VITE_GIPHY_API_KEY`） |
| `src/components/gallery-image-picker.vue` | 编辑器内从画廊选图 |
| `src/components/sticker-picker-modal.vue` | 表情包来源选择弹窗（常用 / 颜文字 / Giphy / 本机） |
| `src/views/gallery.vue`               | 瀑布流、单图/拼团筛选、上传 |
| `src/views/editor.vue`                | Fabric 排版、模板、文字样式、背景、音频、保存/拼团 |

## 许可证

MIT（若你方仓库另有约定，以仓库为准）。
