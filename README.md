# 灵动画册

基于 Vue 3 + Vite + TypeScript 的 Web 应用（原「AI 智能拼图画廊」能力）：用户上传图片后使用 **Mock AI** 自动打标签，可在画廊浏览作品，并使用 **Fabric.js** 自由排版拼图；海报导出以 **Fabric 栅格化** 为主。数据与存储在非 Mock 模式下由 **Supabase**（Auth / Postgres / Storage）承载，并配套 **RLS** 与 Storage 策略（见 `supabase/migrations`）。

## 功能说明（近期新增）

### 画廊分类

- 上传作品默认归入 **单图**（可进编辑器排版）。
- 编辑器中 **保存并生成拼图**：更新当前单图的 `layout`，将整张画布导出为 JPEG 上传到 Storage（路径含 `collages/`），并新增一条 **拼图** 记录（`gallery_category = collage`，`source_image_id` 指向源单图）。
- 画廊页提供 **全部 / 单图 / 拼图** 筛选；拼图卡片可跳转 **继续编辑原稿**（源单图）。
- **标签筛选**：调用 RPC `gallery_distinct_tags` 聚合公开作品中的去重标签；画廊页用 **下拉多选**（Headless UI Listbox）。多选时列表要求 `tags` **同时包含** 所选全部标签（等价于 PostgreSQL `tags @> ARRAY[...]`）；提供 **清除筛选**。
- **点赞**：`public.likes` 表 + `images.likes_count`（触发器同步）；前端调用 RPC `toggle_image_like` 切换点赞，列表用 `likes` 表批量判断当前用户是否已赞，并做乐观更新。真实环境需用户已 **登录（Supabase Auth JWT）**；Mock 下使用本地会话用户。

### 云端模板与画布内容

- **模板目录（默认可用）**：仓库自带 [`public/templates-catalog.json`](./public/templates-catalog.json)（含「单图居中」「双图并排」、三格横排及带 **颜色 / 渐变 / 图片** 背景的模板）。其中 **图片类背景** 使用与槽位示例一致的 `picsum.photos` 固定 seed 图（便于跨域绘制；勿用易被防盗链的图床）。未配置环境变量时，编辑器会请求站点同源的 **`/templates-catalog.json`**，与 Supabase `templates` **按 `id` 合并**（相同 id 以目录文件为准）。若要改用 GitHub/jsDelivr 等外链，设置 `VITE_TEMPLATES_CATALOG_URL` 即可（见 `.env.example`）。自定义 URL 加载失败会 Toast；默认文件缺失时仅打日志、不影响数据库与内置种子。实现见 `src/services/remote-templates-catalog.ts` 与常量 `DEFAULT_TEMPLATES_CATALOG_PATH`（`src/data.ts`）。
- 选择模板后先展示 **示例图**（Fabric 对象带 `tpl-ph:` 前缀，仅作占位）。
- **添加图片**（本机或 **从画廊选择**：我的 / 公开）在仍有示例占位时，会移除示例并按模板槽位填入；**槽位多于图片时剩余留空**，不会用最后一张图重复填满。
- **切换模板**时 **不会** `clear` 整张画布：移除旧示例后，将 **主图**（非 `tpl-ph`、非表情包 `fg-sticker`）按 **上→下、左→右** 排序，依次套入新模板各槽的几何位置；不足槽位补新示例图（底层）；多出的主图保持原位置。文字、表情包贴纸、底色与背景图不参与槽位重排（贴纸与文字保留）。

### 文字与表情包

- **文字**：`IText`，支持 **字体**（预设下拉）、**颜色**、**字号**（8–200）、**粗体 / 斜体**；属性写入 `layout.elements` 中 `kind: 'text'` 的字段（含 `fontFamily`、`fill`、`fontSize`、`fontWeight`、`fontStyle`）。
- **表情包**：点击 **添加表情包** 打开弹窗，可选来源：**常用贴纸**（Twemoji）、**颜文字**（插入为文字图层）、**联网搜索**（Pixabay 插图，需配置 `VITE_PIXABAY_API_KEY`）、**本机图片**。其中图片类在布局中记为 `kind: 'sticker'`；数据见 **`src/data/stickers-common.ts`**，联网搜索见 **`src/services/pixabay-stickers.ts`**，弹窗见 **`src/components/sticker-picker-modal.vue`**。

### 画布背景

- **底色**：取色器，写入 `layout.backgroundColor`。
- **背景图**：本机图片铺满画布（cover），不可点选，写入 `layout.backgroundImageSrc`（URL 或 data URL）；可 **清除背景图**。

### 背景音乐（时间轴分段）

- 在编辑器中维护 **`layout.audioSegments`**：每段含 `startSec`（起点秒）、上传后的 `storagePath` / `publicUrl`、可选 `title`、`sourceUrl`。
- 支持 **本地上传** 或 **联网 URL 拉取再上传**（需目标允许 **CORS**，否则请改用本地上传）；文件存入 `{userId}/audio/`（与 `gallery-images` 桶策略一致）。
- **试听时间轴**：按 `startSec` 排队播放多段（多段可重叠，由起点自行控制）。
- **导出 HTML（含音乐）**：JPG/PNG 无法内嵌可播放音频；编辑器提供 **「导出 HTML（含音乐）」**，生成单文件 HTML（海报为内嵌 JPEG、音频为内嵌 data URL），用浏览器打开后点「按时间轴播放」即可与编辑器一致叠加播放。音频总大小受 `MAX_HTML_EXPORT_AUDIO_TOTAL_BYTES` 限制；导出时会按各段的 `publicUrl` 拉取文件，需存储桶允许浏览器 **CORS** 读取。
- **拼图记录与音乐**：保存并生成拼图时，新拼图条目的 `layout` 与当前画布一致（含 `audioSegments`），从画廊打开该拼图再进编辑器可继续试听/叠加，不再丢失音乐分段。
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

本地环境变量：**不要**把含真实 Anon Key 的 `.env.development` 提交到 Git（已在 [`.gitignore`](./.gitignore) 中忽略）。请复制 [`.env.development.example`](./.env.development.example) 为 `.env.development` 再填写；团队只需提交 **example** 模板。若该文件曾被提交过，请执行 `git rm --cached .env.development` 并到 Supabase **Settings → API** 轮换 **anon key**。

复制 [`.env.example`](./.env.example) 为 `.env` 可按需使用（与 Vite 默认加载规则一致）。可选：`VITE_PIXABAY_API_KEY`（表情包联网搜索，见 [Pixabay API](https://pixabay.com/api/docs/)），配置后需重启 dev。

### 还没有 Supabase「项目」时怎么做？

- **不必**为了用数据库而去关联 GitHub。用邮箱/Google 等注册并登录后，在控制台里 **手动新建项目** 即可；GitHub 绑定多用于「从模板建库」「CI 部署」等，**不是**使用 Table Editor / SQL 的前置条件。
- 登录 [Supabase Dashboard](https://supabase.com/dashboard) 后，点 **New project**：填项目名称、数据库密码、选区域（Region），创建后等待几分钟直到状态就绪。
- **若控制台或 `supabase.com` 打不开**：多为网络环境限制，可换网络、稍后重试，或查看 [Supabase Status](https://status.supabase.com/)。在无法访问期间可继续用本仓库默认的 **Mock 模式**（`VITE_SUPABASE_MOCK=true`）本地开发。
- 项目创建完成后：**Settings → API** 里可复制 **Project URL** 与 **anon public** key，写入 `.env` 的 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。

连接真实 Supabase 时：

1. 将 `VITE_SUPABASE_MOCK` 设为 `false`（或删除该变量）。
2. 填写 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`（来自上一步）。
3. **开启匿名登录**（否则会出现 `new row violates row-level security policy`）：控制台 **Authentication → Providers → Anonymous**，打开 **Enable Anonymous sign-ins** 并保存。应用启动时会自动 `signInAnonymously()`，使 `auth.uid()` 与写入的 `user_id` 一致，满足 `images` / Storage 的 RLS。
4. **在控制台执行迁移 SQL**（见下一小节「如何在 SQL Editor 里跑迁移」）：按顺序跑完 `001` → `002` → `003` → **`004_templates_seed.sql`（云端模板示例数据）**，`001` 里会创建 Storage 桶 `gallery-images`。若跳过 `004`，编辑器仍会 **自动回退** 到内置种子模板，但数据库里 `templates` 表为空。

#### 「Supabase 登录初始化失败」怎么自查？

应用启动时会自动匿名登录并写入 `profiles`。失败时 **Toast 会显示具体原因**（已加长显示时间），同时请打开浏览器 **F12 → Console** 查看 `[ensureSupabaseAuthSession]` 日志。

| 现象 / Toast 关键词                              | 常见原因与处理                                                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 缺少环境变量 `VITE_SUPABASE_URL`                 | `.env` / `.env.development` 未填或填错；改完后 **必须重启** `npm run dev`。                                           |
| `Invalid API key` / `JWT` 相关                   | Anon Key 复制不全、混用了 **service_role** key、或项目与 Key 不匹配；到 **Settings → API** 重新复制 **anon public**。 |
| `Anonymous sign-ins` / `disabled` / 匿名登录失败 | **Authentication → Providers → Anonymous** 未打开 **Enable**；保存后刷新本站。                                        |
| `写入 profiles 失败` / RLS / `42501`             | 未执行或未完整执行 **`001_init.sql`**（缺 `profiles` 表或策略）；在 SQL Editor 重跑 `001`。                           |
| 网络错误 / `Failed to fetch`                     | 本机无法访问 Supabase API（代理/防火墙/地区网络）；换网络或检查系统代理。                                             |

一般 **不需要**把账号密码发给他人排查；把 **Toast 全文** 或 **Console 红色报错**（可打码 URL）复制下来即可对照上表。

#### 如何在 SQL Editor 里跑迁移？

**不用**把文件上传到 Supabase 的某个「目录」。仓库里的 `supabase/migrations/*.sql` 只是给你本地保存、版本管理用的；真正执行是在网页里 **复制粘贴 + 运行**。

1. 在本机用编辑器打开项目里的迁移文件（路径如下），**全选复制** 文件中的全部 SQL，**按编号顺序**各执行一次：
   - [`supabase/migrations/001_init.sql`](./supabase/migrations/001_init.sql)
   - [`supabase/migrations/002_images_gallery_category.sql`](./supabase/migrations/002_images_gallery_category.sql)
   - [`supabase/migrations/003_likes_and_tag_helpers.sql`](./supabase/migrations/003_likes_and_tag_helpers.sql)
   - [`supabase/migrations/004_templates_seed.sql`](./supabase/migrations/004_templates_seed.sql)
2. 打开 Supabase 左侧 **SQL Editor**，点 **「+ New」**（或新建查询），把 **`001_init.sql` 的完整内容** 粘贴进编辑区。
3. 点右下角 **Run**（或快捷键，以控制台提示为准）。等待执行成功；若有报错，把报错信息复制下来排查（常见：重复执行导致「对象已存在」——全新项目一般不会有）。
4. **再新建一个查询**（再点一次 New），粘贴 **`002_...sql` 全文** → Run。
5. **再新建一个查询**，粘贴 **`003_...sql` 全文** → Run。
6. **再新建一个查询**，粘贴 **`004_templates_seed.sql` 全文** → Run。
7. 执行完后到左侧 **Storage** 确认是否存在桶 **`gallery-images`**；到 **Table Editor** 确认 **`templates`** 至少有 2 条（单图居中、双图并排），其它表见上文。

**顺序不能乱**：必须先 `001`（库表 + 桶 + 基础 RLS），再 `002`（画廊分类字段），再 `003`（点赞与 RPC），再 `004`（模板种子，推荐）。

（可选）若本机安装了 [Supabase CLI](https://supabase.com/docs/guides/cli)，也可在项目根目录用 `supabase link` 关联项目后 `supabase db push` 推送 `migrations` 目录；新手用网页 SQL Editor 最直观。

其他脚本：

- `npm run build` — 类型检查与生产构建
- `npm run preview` — 预览构建产物
- `npm run lint` / `npm run format` — ESLint / Prettier
- `npm run init-repo` — 若无 `.git` 则 `git init`，并合并基础 `.gitignore` 条目

## 部署（让别人通过链接访问）

本项目是 **Vite 静态前端**（`npm run build` 产出 `dist/`），数据库与文件仍在 **Supabase 云端**。部署前请确认：已按上文连接真实 Supabase、跑完迁移、开启 **Anonymous** 登录。

### 1. 在托管平台配置环境变量（不要写进 Git）

在 **Vercel / Netlify / 其它 CI** 的「Environment Variables」里新增（名称必须带 `VITE_` 前缀，构建时才会注入）：

| 变量名                   | 说明                                                       |
| ------------------------ | ---------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase **Settings → API → Project URL**                  |
| `VITE_SUPABASE_ANON_KEY` | **anon public** key（勿用 service_role）                   |
| `VITE_SUPABASE_MOCK`     | 线上填 **`false`**（或未设置，建议在平台显式设为 `false`） |
| `VITE_PIXABAY_API_KEY`   | 可选；不配则表情包仅常用/颜文字/本机                       |

**不要**把上述密钥提交到公开仓库；在托管网站后台配置即可。

### 2. Supabase 控制台（部署后必须与本站域名一致）

在 **Authentication → URL Configuration** 中设置（需在 Supabase 网页里手动保存，无法通过本仓库 SQL 修改）：

| 项                | 本仓库当前线上地址示例                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Site URL**      | `https://psychic-waffle-roan.vercel.app`                                                                                                  |
| **Redirect URLs** | 点击 **Add URL**，填入 `https://psychic-waffle-roan.vercel.app`（与 Site URL 相同即可满足当前匿名登录 SPA；若以后加重定向登录再按需追加） |

若你使用其它 Vercel 子域名或自定义域，把上表两处改成你的实际 **https 根地址**。匿名登录保持 **已开启**。

### 3. 方式 A：Vercel

1. 把代码推到 **GitHub / GitLab / Bitbucket**。
2. 打开 [Vercel](https://vercel.com) → **Add New Project** → 导入该仓库。
3. **Framework Preset** 选 **Vite**（或保持自动检测）。
4. **Build Command**：`npm run build`；**Output Directory**：`dist`。
5. 在 **Environment Variables** 填入上表变量 → Deploy。

仓库根目录已有 [`vercel.json`](./vercel.json)，会将所有路径回写到 `index.html`（Vue Router History 模式）。

### 4. 方式 B：Netlify

1. [Netlify](https://www.netlify.com) → **Add new site** → Import from Git。
2. **Build command**：`npm run build`；**Publish directory**：`dist`。
3. **Site settings → Environment variables** 填入上表变量 → 触发部署。

仓库根目录已有 [`netlify.toml`](./netlify.toml)，同样用于 SPA 路由。

### 5. 方式 C：任意静态服务器

本地执行 `npm run build`，将 **`dist` 目录** 上传到任意支持 **SPA 回退到 `index.html`** 的静态托管（否则刷新子路由会 404）。环境变量需在构建命令前导出，例如：

```bash
set VITE_SUPABASE_MOCK=false
set VITE_SUPABASE_URL=https://xxx.supabase.co
set VITE_SUPABASE_ANON_KEY=你的anon密钥
npm run build
```

（Linux/macOS 用 `export` 代替 `set`。）

### 6. 部署后自检

打开线上地址 → 应能加载画廊；若 Toast 报错，按上文 **「Supabase 登录初始化失败」** 表格对照；浏览器 **F12 → Network** 可确认请求是否指向你的 Supabase 域名。

## 如何查看数据库里存的数据

### 使用真实 Supabase 时

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)，在列表中 **点进你已创建的项目**（若列表为空，需先在控制台 **New project** 创建一个，见上文「还没有 Supabase 项目」）。
2. 左侧 **Table Editor**：浏览表 `images`、`likes`、`profiles`、`templates` 等行数据。
3. 左侧 **SQL Editor**：执行查询，例如 `select id, title, tags, likes_count, gallery_category from public.images order by created_at desc limit 50;`。
4. **Storage** 面板：查看 `gallery-images` 桶中的对象路径（与 `images.storage_path` 对应）。

### Mock 模式（`VITE_SUPABASE_MOCK=true`）

- 数据在浏览器 **localStorage** 中，键名为 `psychic-waffle-mock-db`（见 `src/data.ts` 中 `MOCK_STORAGE_KEY`）。
- Chrome/Edge：**开发者工具 → Application（应用程序）→ Local Storage → 你的站点**，点开该键即可看到 JSON（含 `images`、`likes`、`profiles` 等）。

## Mock 模式说明

- `VITE_SUPABASE_MOCK=true` 时，`src/lib/supabase.ts` 导出内存 + localStorage 驱动的模拟客户端，模板种子见 [`src/mocks/templates-seed.json`](./src/mocks/templates-seed.json)。
- 大图以 Data URL 持久化可能占满浏览器存储配额；若写入失败，控制台会提示，可清理站点数据后重试。

## 目录结构（摘要）

| 路径                                      | 说明                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `supabase/migrations/`                    | 表结构、RLS、Storage、`004` 模板种子等 |
| `src/lib/supabase.ts`                     | 真实 / Mock 客户端与 `ensureMockSession`                             |
| `src/data.ts`                             | 画布、布局版本、音频与文字等常量                                     |
| `src/data/stickers-common.ts`             | 常用 Twemoji / 颜文字数据（可与表情包弹窗配合）                      |
| `src/utils/image-compress.ts`             | 压缩与上传大小上限                                                   |
| `src/utils/audio-timeline.ts`             | 远程音频拉取（CORS）与扩展名辅助                                     |
| `src/utils/export-poster.ts`              | Fabric 导出 JPEG / Blob                                              |
| `src/utils/export-poster-html.ts`         | 导出单文件 HTML（海报 + 内嵌音频时间轴）                             |
| `src/services/ai-tags.ts`                 | Mock 标签                                                            |
| `src/services/pixabay-stickers.ts`        | Pixabay 插图搜索（需 `VITE_PIXABAY_API_KEY`）                        |
| `src/composables/useLikes.ts`             | 点赞 RPC `toggle_image_like`                                         |
| `src/composables/useGalleryTags.ts`       | 标签聚合 RPC `gallery_distinct_tags`                                 |
| `src/components/gallery-tag-filter.vue`   | 画廊标签筛选与清除                                                   |
| `src/components/gallery-image-card.vue`   | 画廊卡片（含点赞）                                                   |
| `src/components/gallery-image-picker.vue` | 编辑器内从画廊选图                                                   |
| `src/components/sticker-picker-modal.vue` | 表情包来源选择弹窗（常用 / 颜文字 / 联网 / 本机）                    |
| `src/views/gallery.vue`                   | 瀑布流、单图/拼图/标签筛选、点赞、上传                               |
| `src/views/editor.vue`                    | Fabric 排版、模板、文字样式、背景、音频、保存/拼图                   |

## 与 `rule2.txt` 规格说明的关系

`rule2.txt` 中的目录名（如 `EditorView`、`vue-draggable-resizable-gorkys`、`html2canvas`）与本仓库**不完全一致**：编辑器已用 **Fabric.js** 实现排版与导出，海报栅格化走 Fabric `toDataURL` / `toBlob`，功能上覆盖「拖拽、缩放、保存 layout、导出图片」等目标。若需对齐文档中的 **Vercel / Netlify SPA 路由**，见根目录 `vercel.json`、`netlify.toml`。

## 许可证

MIT（若你方仓库另有约定，以仓库为准）。
