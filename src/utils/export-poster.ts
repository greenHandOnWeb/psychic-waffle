import type { Canvas } from 'fabric';
import { toJpeg } from 'html-to-image';
import { EXPORT_JPEG_QUALITY, EXPORT_PIXEL_RATIO } from '@/data';

/**
 * 使用 Fabric 内置栅格化导出（推荐）。
 * html-to-image 对 Fabric 的 lower/upper 双 canvas 结构常得到空白图。
 */
/** 将当前画布栅格化为 JPEG Blob（用于上传「拼图」成品） */
export async function fabricCanvasToJpegBlob(canvas: Canvas): Promise<Blob> {
  canvas.renderAll();
  const blob = await canvas.toBlob({
    format: 'jpeg',
    quality: EXPORT_JPEG_QUALITY,
    multiplier: EXPORT_PIXEL_RATIO,
  });
  if (!blob) {
    throw new Error('画布导出 Blob 失败');
  }
  return blob;
}

export function downloadFabricPosterJpeg(canvas: Canvas, filename: string): void {
  canvas.renderAll();
  const dataUrl = canvas.toDataURL({
    format: 'jpeg',
    quality: EXPORT_JPEG_QUALITY,
    multiplier: EXPORT_PIXEL_RATIO,
  });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.rel = 'noopener';
  link.click();
}

/**
 * 将任意 DOM 节点导出为 JPEG（非 Fabric 画布场景可用）
 */
export async function downloadDomAsPosterJpeg(
  node: HTMLElement,
  filename: string
): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }
  const dataUrl = await toJpeg(node, {
    quality: EXPORT_JPEG_QUALITY,
    pixelRatio: EXPORT_PIXEL_RATIO,
    cacheBust: true,
    backgroundColor: '#ffffff',
  });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.rel = 'noopener';
  link.click();
}
