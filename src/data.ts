/** 全局常量（业务魔法数字集中管理） */

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

/** Fabric 画布逻辑尺寸（用于百分比换算基准） */
export const EDITOR_CANVAS_WIDTH = 800;

export const EDITOR_CANVAS_HEIGHT = 600;

export const MOCK_STORAGE_KEY = 'psychic-waffle-mock-db';

/** 画廊：用户上传、可进编辑器的底稿 */
export const GALLERY_CATEGORY_SINGLE = 'single' as const;

/** 画廊：保存布局时导出的拼团成品（栅格 JPEG） */
export const GALLERY_CATEGORY_COLLAGE = 'collage' as const;

export type GalleryCategory = typeof GALLERY_CATEGORY_SINGLE | typeof GALLERY_CATEGORY_COLLAGE;

/** 编辑器画布区最大高度（相对视口），避免外框过高 */
export const EDITOR_VIEWPORT_MAX_HEIGHT_VH = 72;

/**
 * Fabric 对象 `name` 前缀：云端模板自带的示例图。
 * 用户「添加图片」时会移除这些对象并按模板槽位填入新图。
 */
export const FABRIC_TEMPLATE_PLACEHOLDER_PREFIX = 'tpl-ph:';

/** 未套用模板槽位时，新插入图片的默认占位（百分比） */
export const EDITOR_DEFAULT_NEW_IMAGE_LAYOUT = {
  xPct: 10,
  yPct: 10,
  wPct: 40,
  hPct: 40,
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

/** 单段背景音乐上传大小上限（20MB） */
export const MAX_AUDIO_UPLOAD_BYTES = 20 * 1024 * 1024;

/** 新建画布默认底色（与 Fabric background 一致） */
export const EDITOR_DEFAULT_CANVAS_BACKGROUND = '#f8fafc';
