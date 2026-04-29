/** 拼图元素在 layout jsonb 中的结构（坐标均为画布百分比 0–100） */

export type LayoutElementKind = 'image' | 'text' | 'sticker';

export interface LayoutElement {
  id: string;
  /** 缺省视为 image（兼容旧数据） */
  kind?: LayoutElementKind;
  /** image / sticker */
  src?: string;
  /** text */
  text?: string;
  fontSize?: number;
  fill?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  zIndex?: number;
  rotation?: number;
}

/** 时间轴上的一段背景音乐（已转存到本桶后可公开播放） */
export interface AudioTimelineSegment {
  id: string;
  /** 在时间轴上的起点（秒），多段可相同或重叠由你自行控制 */
  startSec: number;
  /** Storage 对象路径（相对 bucket，含 `{userId}/audio/...`） */
  storagePath: string;
  publicUrl: string;
  /** 展示用标题 */
  title?: string;
  /** 若来自网络拉取，记录原始地址 */
  sourceUrl?: string;
}

/** 模板目录 JSON 中的画布背景（与作品 layout.backgroundColor / backgroundImageSrc 并存时可迁移） */
export interface PuzzleLayoutCatalogBackground {
  type: 'color' | 'gradient' | 'image';
  value: string;
}

export interface PuzzleLayout {
  elements: LayoutElement[];
  version?: number;
  /** 模板目录：color / gradient / image */
  background?: PuzzleLayoutCatalogBackground;
  /** 画布底色（CSS 颜色字符串） */
  backgroundColor?: string | null;
  /** 铺满画布的背景图（URL 或 data URL） */
  backgroundImageSrc?: string | null;
  /** 背景音乐分段（按 startSec 排序后试听/播放） */
  audioSegments?: AudioTimelineSegment[];
}

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface ImageRow {
  id: string;
  user_id: string;
  storage_path: string;
  public_url: string | null;
  title: string | null;
  tags: string[];
  layout: PuzzleLayout;
  file_size_bytes: number | null;
  is_public: boolean;
  /** 非空表示在回收站（软删除），恢复时置空 */
  deleted_at?: string | null;
  created_at: string;
  /** 点赞数（由 likes 表 / 触发器或 Mock 同步） */
  likes_count?: number;
  /** single=上传底稿；collage=保存布局生成的成品 */
  gallery_category?: 'single' | 'collage';
  /** 拼图成品对应的源单图 id */
  source_image_id?: string | null;
}

export interface LikeRow {
  id: string;
  image_id: string;
  user_id: string;
  created_at: string;
}

export interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  layout: PuzzleLayout;
  created_at: string;
}
