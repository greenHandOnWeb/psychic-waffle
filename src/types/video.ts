/** 参与幻灯录制的最小图片信息（来自画廊 ImageRow） */
export interface VideoGeneratorImage {
  id: string;
  public_url: string | null;
  title?: string | null;
}

/** 导出时合并到 WebM 的配乐（与预览同源 URL，须可播放且尽量已设 crossOrigin） */
export interface VideoGeneratorAudioExport {
  url: string;
  crossOrigin?: 'anonymous';
}

export interface VideoGeneratorOptions {
  width?: number;
  height?: number;
  /** 每张图停留秒数，长度须与图片列表一致；优先于 secondsPerSlide */
  secondsPerSlideList?: number[];
  /** 每张图在视频中停留的秒数（secondsPerSlideList 未传或长度不符时使用） */
  secondsPerSlide?: number;
  /** 当前处理到第 current 张，共 total 张 */
  onProgress?: (current: number, total: number) => void;
  /** 与画面同步录制进 WebM；未传则仅视频轨 */
  audioExport?: VideoGeneratorAudioExport | null;
}
