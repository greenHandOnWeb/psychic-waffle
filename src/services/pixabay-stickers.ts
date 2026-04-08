/**
 * Pixabay 插图/矢量搜索（替代 Giphy，申请 key：https://pixabay.com/api/docs/）
 */

export interface PixabayStickerHit {
  url: string;
  title: string;
}

function readPixabayApiKey(): string {
  const k = import.meta.env.VITE_PIXABAY_API_KEY;
  return typeof k === 'string' ? k.trim() : '';
}

export function isPixabayStickerSearchConfigured(): boolean {
  return readPixabayApiKey().length > 0;
}

interface PixabayApiHit {
  tags?: string;
  webformatURL?: string;
  previewURL?: string;
  largeImageURL?: string;
  vectorURL?: string;
}

interface PixabayApiResponse {
  hits?: PixabayApiHit[];
}

/**
 * 搜索可用于画布的远程图片（插图为主，更接近「贴纸」用途）
 */
export async function searchPixabayStickers(query: string, perPage: number): Promise<PixabayStickerHit[]> {
  const apiKey = readPixabayApiKey();
  if (!apiKey) {
    return [];
  }
  const q = query.trim() || 'cute cartoon';
  const limit = Math.min(Math.max(perPage, 1), 200);
  const url =
    'https://pixabay.com/api/?' +
    new URLSearchParams({
      key: apiKey,
      q,
      image_type: 'illustration',
      per_page: String(limit),
      safesearch: 'true',
    }).toString();
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Pixabay HTTP ${res.status}`);
  }
  const json = (await res.json()) as PixabayApiResponse;
  const rows = json.hits ?? [];
  return rows
    .map(function mapHit(h) {
      const u =
        h.vectorURL ||
        h.webformatURL ||
        h.largeImageURL ||
        h.previewURL ||
        '';
      const title = (h.tags || 'image').split(',')[0]?.trim() || 'image';
      const out: PixabayStickerHit = { url: u, title };
      return out;
    })
    .filter(function hasUrl(h) {
      return Boolean(h.url);
    });
}
