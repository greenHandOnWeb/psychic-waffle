/** 从可跨域访问的 URL 拉取音频为 Blob（若目标站未放行 CORS 会失败） */
export async function fetchAudioBlobFromUrl(url: string): Promise<Blob> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) {
    throw new Error(`下载失败 HTTP ${res.status}`);
  }
  return res.blob();
}

export function extensionFromAudioMime(mime: string): string {
  if (mime.includes('mpeg') || mime.includes('mp3')) {
    return 'mp3';
  }
  if (mime.includes('mp4') || mime.includes('m4a')) {
    return 'm4a';
  }
  if (mime.includes('wav')) {
    return 'wav';
  }
  if (mime.includes('ogg')) {
    return 'ogg';
  }
  return 'mp3';
}

export function safeAudioFileStem(name: string): string {
  return name.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'track';
}
