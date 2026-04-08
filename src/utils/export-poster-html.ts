import type { Canvas } from 'fabric';
import { EXPORT_JPEG_QUALITY, EXPORT_PIXEL_RATIO, MAX_HTML_EXPORT_AUDIO_TOTAL_BYTES } from '@/data';
import type { AudioTimelineSegment } from '@/types/database';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise(function blobToDataUrlPromise(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function onLoad() {
      resolve(reader.result as string);
    };
    reader.onerror = function onError() {
      reject(reader.error);
    };
    reader.readAsDataURL(blob);
  });
}

async function fetchSegmentAsPayload(seg: AudioTimelineSegment): Promise<{
  startSec: number;
  title?: string;
  dataUrl: string;
  byteLength: number;
}> {
  const res = await fetch(seg.publicUrl, { mode: 'cors' });
  if (!res.ok) {
    throw new Error(`音频无法拉取（HTTP ${res.status}）：${seg.title || seg.id}`);
  }
  const blob = await res.blob();
  const dataUrl = await blobToDataUrl(blob);
  return {
    startSec: seg.startSec,
    title: seg.title,
    dataUrl,
    byteLength: blob.size,
  };
}

function utf8JsonToBase64(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function buildHtmlShell(base64Payload: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>海报与音乐</title>
<style>
body{margin:0;background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;padding:16px;text-align:center;}
img{max-width:100%;height:auto;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.45);}
button{margin-top:16px;padding:10px 20px;border-radius:8px;border:0;background:#6366f1;color:#fff;font-size:16px;cursor:pointer;}
button:disabled{opacity:.5;cursor:not-allowed;}
p.note{font-size:12px;color:#94a3b8;margin-top:12px;max-width:42rem;margin-left:auto;margin-right:auto;line-height:1.5;}
</style>
</head>
<body>
<img id="poster" alt="海报"/>
<div><button type="button" id="play">按时间轴播放</button></div>
<p class="note" id="meta"></p>
<script>
(function () {
  var b64 = ${JSON.stringify(base64Payload)};
  var bin = atob(b64);
  var u8 = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) {
    u8[i] = bin.charCodeAt(i);
  }
  var json = new TextDecoder('utf-8').decode(u8);
  var data = JSON.parse(json);
  document.getElementById('poster').src = data.poster;
  var segs = data.segments || [];
  var meta = document.getElementById('meta');
  meta.textContent = segs.length
    ? '共 ' + segs.length + ' 段音频；多段按起点秒数可同时叠加播放（与编辑器试听一致）。图片来源为导出时的画布。'
    : '未内嵌音频（导出时未配置分段）。';
  document.getElementById('play').disabled = !segs.length;
  document.getElementById('play').onclick = function () {
    segs.forEach(function (s) {
      var ms = Math.max(0, s.startSec) * 1000;
      setTimeout(function () {
        var a = new Audio(s.dataUrl);
        a.play().catch(function (e) {
          console.error(e);
        });
      }, ms);
    });
  };
})();
</script>
</body>
</html>
`;
}

/**
 * 导出单文件 HTML：内含海报 JPEG（data URL）与多段音频（data URL），按 startSec 叠加播放。
 * 依赖各段 publicUrl 允许当前页面跨域拉取（公开桶一般可用）。
 */
export async function downloadFabricPosterWithAudioHtml(
  canvas: Canvas,
  segments: AudioTimelineSegment[],
  filenameBase: string
): Promise<void> {
  canvas.renderAll();
  const posterDataUrl = canvas.toDataURL({
    format: 'jpeg',
    quality: EXPORT_JPEG_QUALITY,
    multiplier: EXPORT_PIXEL_RATIO,
  });

  const payloads: { startSec: number; title?: string; dataUrl: string }[] = [];
  let audioTotal = 0;
  for (let i = 0; i < segments.length; i++) {
    const row = await fetchSegmentAsPayload(segments[i]);
    audioTotal += row.byteLength;
    if (audioTotal > MAX_HTML_EXPORT_AUDIO_TOTAL_BYTES) {
      throw new Error(
        `内嵌音频总大小超过 ${Math.floor(MAX_HTML_EXPORT_AUDIO_TOTAL_BYTES / (1024 * 1024))}MB，请减少分段或缩短音频后再导出`
      );
    }
    payloads.push({
      startSec: row.startSec,
      title: row.title,
      dataUrl: row.dataUrl,
    });
  }

  const bundle = { poster: posterDataUrl, segments: payloads };
  const json = JSON.stringify(bundle);
  const b64 = utf8JsonToBase64(json);
  const html = buildHtmlShell(b64);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  const name = filenameBase.endsWith('.html') ? filenameBase : `${filenameBase}.html`;
  link.download = name;
  link.rel = 'noopener';
  link.click();
  URL.revokeObjectURL(objectUrl);
}
