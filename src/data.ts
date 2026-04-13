/** 全局常量（业务魔法数字集中管理） */

/** 未配置 `VITE_TEMPLATES_CATALOG_URL` 时，默认从站点根路径加载的模板目录（见 `public/templates-catalog.json`） */
export const DEFAULT_TEMPLATES_CATALOG_PATH = '/templates-catalog.json';

/** 与 `useRuntimeSettingsStore` 的 pinia 持久化 key 一致（供 supabase 启动时读取本地覆盖） */
export const RUNTIME_SETTINGS_STORAGE_KEY = 'psychic-waffle-runtime-settings';

/** 设置页：Supabase 数据源；存于 localStorage，覆盖构建时 VITE_SUPABASE_MOCK */
export type RuntimeSupabaseMockMode = 'inherit' | 'mock' | 'live';

export const RUNTIME_SUPABASE_MOCK_MODE_OPTIONS: {
  value: RuntimeSupabaseMockMode;
  label: string;
  description: string;
}[] = [
  {
    value: 'inherit',
    label: '跟随构建配置',
    description: '使用 .env 中 VITE_SUPABASE_MOCK（true 为 Mock）',
  },
  {
    value: 'mock',
    label: '强制本地 Mock',
    description: '内存 + localStorage 模拟数据，不连网',
  },
  {
    value: 'live',
    label: '强制远端 Supabase',
    description: '需已配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY',
  },
];

export const STORAGE_BUCKET = 'gallery-images';

/** Mock 模式下模拟网络延迟（毫秒） */
export const MOCK_NETWORK_DELAY_MS = 500;

/** 上传前最大文件大小（5MB） */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** 小于此大小则跳过压缩，直接上传（500KB） */
export const COMPRESS_SKIP_BELOW_BYTES = 500 * 1024;

/** browser-image-compression 默认最大宽高 */
export const COMPRESS_MAX_DIMENSION = 1920;

export const COMPRESS_MAX_SIZE_MB = 1;

/** 海报导出：Fabric `toDataURL` 的 multiplier（等效放大分辨率） */
export const EXPORT_PIXEL_RATIO = 3;

export const EXPORT_JPEG_QUALITY = 0.92;

/** 编辑器参考宽高比（4:3）与宿主未就绪时的回退像素；实际画布由编辑器宿主宽度动态计算 */
export const EDITOR_CANVAS_WIDTH = 800;

export const EDITOR_CANVAS_HEIGHT = 600;

export const MOCK_STORAGE_KEY = 'psychic-waffle-mock-db';

/** 画廊：用户上传、可进编辑器的底稿 */
export const GALLERY_CATEGORY_SINGLE = 'single' as const;

/** 画廊：保存布局时导出的拼图成品（栅格 JPEG） */
export const GALLERY_CATEGORY_COLLAGE = 'collage' as const;

export type GalleryCategory = typeof GALLERY_CATEGORY_SINGLE | typeof GALLERY_CATEGORY_COLLAGE;

/**
 * 路由 query 键：与画廊卡片角标一致，决定编辑器用单图主图逻辑还是拼图多槽还原（**不读库字段**，避免列表与编辑器不一致）。
 * 取值同 `GALLERY_CATEGORY_*`：`single` | `collage`。
 */
export const EDITOR_ROUTE_QUERY_GALLERY_KIND = 'galleryKind';

/**
 * 路由 query 键：从拼图卡片「继续编辑原稿」进入底稿时设为 `1`，强制按拼图 layout 多槽还原（与 `galleryKind=single` 可同时出现，以此项优先）。
 */
export const EDITOR_ROUTE_QUERY_PUZZLE_DRAFT = 'puzzleDraft';

/** 编辑器画布区最大高度（相对视口），避免外框过高 */
export const EDITOR_VIEWPORT_MAX_HEIGHT_VH = 72;

/**
 * Fabric 对象 `name` 前缀：云端模板自带的示例图。
 * 用户「添加图片」时会移除这些对象并按模板槽位填入新图。
 */
export const FABRIC_TEMPLATE_PLACEHOLDER_PREFIX = 'tpl-ph:';

/** 新插入图片默认占位宽高（占画布百分比） */
const EDITOR_DEFAULT_NEW_IMAGE_BOX_W_PCT = 40;
const EDITOR_DEFAULT_NEW_IMAGE_BOX_H_PCT = 40;

/** 未套用模板槽位时，新插入图片的默认占位（槽位在画布上水平垂直居中） */
export const EDITOR_DEFAULT_NEW_IMAGE_LAYOUT = {
  wPct: EDITOR_DEFAULT_NEW_IMAGE_BOX_W_PCT,
  hPct: EDITOR_DEFAULT_NEW_IMAGE_BOX_H_PCT,
  xPct: (100 - EDITOR_DEFAULT_NEW_IMAGE_BOX_W_PCT) / 2,
  yPct: (100 - EDITOR_DEFAULT_NEW_IMAGE_BOX_H_PCT) / 2,
} as const;

/** 单图底稿进编辑器时主图区域（忽略 layout 里多槽/拼图坐标，避免仍显示旧拼图槽位） */
export const EDITOR_SINGLE_MAIN_IMAGE_LAYOUT = {
  xPct: 5,
  yPct: 5,
  wPct: 90,
  hPct: 90,
} as const;

/** Fabric `name` 前缀：表情包等小图（序列化时记为 kind: sticker） */
export const FABRIC_STICKER_NAME_PREFIX = 'fg-sticker:';

/** 新插入表情包的默认占位（百分比，相对画布） */
export const EDITOR_DEFAULT_STICKER_LAYOUT = {
  xPct: 38,
  yPct: 38,
  wPct: 14,
  hPct: 14,
} as const;

export const EDITOR_DEFAULT_TEXT_CONTENT = '双击编辑文字';

export const EDITOR_DEFAULT_TEXT_FONT_SIZE = 28;

export const EDITOR_DEFAULT_TEXT_FILL = '#0f172a';

export const EDITOR_DEFAULT_TEXT_FONT_FAMILY =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

/** 画布文字：预设字体（value 为 CSS font-family） */
export const EDITOR_TEXT_FONT_CHOICES: { label: string; value: string }[] = [
  { label: '系统无衬线', value: EDITOR_DEFAULT_TEXT_FONT_FAMILY },
  { label: '微软雅黑', value: '"Microsoft YaHei", "微软雅黑", sans-serif' },
  { label: '黑体', value: '"SimHei", "黑体", sans-serif' },
  { label: '楷体', value: '"KaiTi", "楷体", serif' },
  { label: '宋体', value: '"SimSun", "宋体", serif' },
  { label: '苹方/苹方-简', value: '"PingFang SC", "Hiragino Sans GB", sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: '等宽', value: '"Courier New", Consolas, monospace' },
  { label: 'Impact', value: 'Impact, Haettenschweiler, sans-serif' },
];

/** 画布文字字号允许范围 */
export const EDITOR_TEXT_FONT_SIZE_MIN = 8;

export const EDITOR_TEXT_FONT_SIZE_MAX = 200;

/** 布局 JSON 版本：含背景、文字、表情包、音频时间轴 */
export const LAYOUT_SCHEMA_VERSION = 3;

/** 背景音乐存入 Storage 时使用的子目录（完整路径为 `{userId}/audio/...`） */
export const AUDIO_STORAGE_SUBDIR = 'audio';

/** 套用云端模板后压成单图写入 layout 时的临时 JPEG（`{userId}/editor-template-flat/...`） */
export const EDITOR_TEMPLATE_FLATTEN_SUBDIR = 'editor-template-flat';

/** 去背景结果 PNG 存入 Storage 的子目录（`{userId}/editor-nobg/...`） */
export const EDITOR_BG_REMOVE_SUBDIR = 'editor-nobg';

/** 去背景推理前输入最长边上限（像素），控制内存与耗时 */
export const EDITOR_BG_REMOVE_INPUT_MAX_EDGE = 1024;

/** 单段背景音乐上传大小上限（20MB） */
export const MAX_AUDIO_UPLOAD_BYTES = 20 * 1024 * 1024;

/** 导出「海报+音乐」HTML 时，内嵌音频原始字节总和上限（避免单文件过大） */
export const MAX_HTML_EXPORT_AUDIO_TOTAL_BYTES = 18 * 1024 * 1024;

/** 新建画布默认底色（与 Fabric background 一致） */
export const EDITOR_DEFAULT_CANVAS_BACKGROUND = '#f8fafc';

/** 画廊图片每条记录允许的最大标签数（防止数组过大） */
export const MAX_IMAGE_TAGS = 40;

/** 画廊作品名称最大字符数 */
export const IMAGE_TITLE_MAX_LENGTH = 120;

/** 单张删除确认（占位符 {title} 为作品名） */
export const GALLERY_DELETE_ONE_CONFIRM = '确定删除作品「{title}」？删除后不可恢复。';

/** 批量删除确认（占位符 {n} 为数量） */
export const GALLERY_DELETE_BATCH_CONFIRM = '确定删除已选的 {n} 张作品？删除后不可恢复。';

/** 画布幻灯导出 WebM：逻辑分辨率（16:9，与预览比例一致、像素更高） */
export const VIDEO_EXPORT_WIDTH = 1920;

export const VIDEO_EXPORT_HEIGHT = 1080;

/** 弹窗内时间轴预览画布分辨率（16:9，与导出比例一致） */
export const VIDEO_PREVIEW_CANVAS_WIDTH = 960;

export const VIDEO_PREVIEW_CANVAS_HEIGHT = 540;

/** MediaRecorder 分片间隔（毫秒），避免部分浏览器只产出 0 时长空文件 */
export const MEDIA_RECORDER_TIMESLICE_MS = 250;

/**
 * 开始录制后先经过此毫秒再计入首张停留，减轻编码器启动吃掉首段墙钟导致总时长偏短（如 1+3+4 少 1s）。
 * 该时间仍显示第一张图，并从首张设定秒数内扣除。
 */
export const VIDEO_RECORD_ENCODER_WARMUP_MS = 120;

/** 小于此字节的 WebM 视为录制失败 */
export const MIN_WEBM_EXPORT_BYTES = 512;

/** 画布 captureStream 采样帧率（与每帧停留秒数配合，保证录像流畅） */
export const VIDEO_CAPTURE_STREAM_FPS = 30;

/** WebM 导出时每段停留期间 requestFrame + 等待的步长（毫秒），墙钟与编码更同步 */
export const VIDEO_EXPORT_RECORD_TICK_MS = 40;

/** 幻灯每帧默认停留（秒） */
export const VIDEO_SLIDE_SECONDS_DEFAULT = 1;

export const VIDEO_SLIDE_SECONDS_MIN = 0.5;

export const VIDEO_SLIDE_SECONDS_MAX = 15;

/** Internet Archive 音频搜索每次返回条数上限 */
export const ARCHIVE_AUDIO_SEARCH_ROWS = 12;
