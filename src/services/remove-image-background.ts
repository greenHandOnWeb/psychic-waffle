import type { FabricImage } from 'fabric';
import { EDITOR_BG_REMOVE_INPUT_MAX_EDGE } from '@/data';

/**
 * 将画布上的位图 Fabric 图导出为 PNG Blob（按最长边缩放），供去背景模型使用。
 */
export async function exportRasterFabricImageToPngBlob(img: FabricImage): Promise<Blob> {
  const el = img.getElement();
  if (!(el instanceof HTMLImageElement) || !el.complete || el.naturalWidth < 2) {
    throw new Error('仅支持已加载的位图，矢量图请换用普通图片');
  }
  const natW = el.naturalWidth;
  const natH = el.naturalHeight;
  const maxEdge = Math.max(natW, natH);
  const scale =
    maxEdge > EDITOR_BG_REMOVE_INPUT_MAX_EDGE ? EDITOR_BG_REMOVE_INPUT_MAX_EDGE / maxEdge : 1;
  const outW = Math.max(2, Math.round(natW * scale));
  const outH = Math.max(2, Math.round(natH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建画布上下文');
  }
  ctx.drawImage(el, 0, 0, outW, outH);
  return new Promise(function toBlobPromise(resolve, reject) {
    canvas.toBlob(function onBlob(b) {
      if (b) {
        resolve(b);
      } else {
        reject(new Error('导出 PNG 失败（可能被跨域污染，请换本机或画廊同源图）'));
      }
    }, 'image/png');
  });
}

/**
 * 使用 @imgly/background-removal 在浏览器内推理（首次会下载模型与 WASM）。
 */
export async function runImglyRemoveBackground(imageBlob: Blob): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal');
  return removeBackground(imageBlob, {
    output: { format: 'image/png' },
  });
}
