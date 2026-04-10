/**
 * 视频预览 / MediaRecorder 共用的 canvas 绘制与跨域图片加载
 */

export function loadImageElementCors(url: string): Promise<HTMLImageElement> {
  return new Promise(function loadPromise(resolve, reject) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function onImgLoad() {
      resolve(img);
    };
    img.onerror = function onImgErr() {
      reject(new Error('图片加载失败（可能无预览地址或跨域限制）'));
    };
    img.src = url;
  });
}

/** blob: 等本机 URL 不设 crossOrigin，避免部分浏览器拒载 */
export function loadImageElementForVideo(url: string): Promise<HTMLImageElement> {
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return new Promise(function loadBlobPromise(resolve, reject) {
      const img = new Image();
      img.onload = function onBlobLoad() {
        resolve(img);
      };
      img.onerror = function onBlobErr() {
        reject(new Error('本机图片加载失败'));
      };
      img.src = url;
    });
  }
  return loadImageElementCors(url);
}

/** object-fit: cover —— 铺满画布并居中裁剪 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = cw / ch;
  let dw: number;
  let dh: number;
  let dx: number;
  let dy: number;
  if (ir > cr) {
    dh = ch;
    dw = dh * ir;
    dx = (cw - dw) / 2;
    dy = 0;
  } else {
    dw = cw;
    dh = dw / ir;
    dx = 0;
    dy = (ch - dh) / 2;
  }
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

export function requestCanvasStreamFrame(stream: MediaStream): void {
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
  if (track && typeof track.requestFrame === 'function') {
    track.requestFrame();
  }
}
