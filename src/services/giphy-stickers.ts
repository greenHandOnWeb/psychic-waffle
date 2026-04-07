export interface GiphyStickerHit {
  url: string;
  title: string;
}

function readGiphyApiKey(): string {
  const k = import.meta.env.VITE_GIPHY_API_KEY ?? import.meta.env['VITE_GIPHY_API_KEY'];
  return typeof k === 'string' ? k.trim() : '';
}

export function isGiphyStickerSearchConfigured(): boolean {
  return readGiphyApiKey().length > 0;
}

interface GiphyImageSet {
  downsized?: { url?: string };
  fixed_height_small?: { url?: string };
}

interface GiphyDatum {
  title?: string;
  images?: GiphyImageSet;
}

/**
 * Giphy Stickers Search。需在 .env 配置 VITE_GIPHY_API_KEY（https://developers.giphy.com/）
 */
export async function searchGiphyStickers(
  query: string,
  limit: number
): Promise<GiphyStickerHit[]> {
  const apiKey = readGiphyApiKey();
  if (!apiKey) {
    return [];
  }
  const q = query.trim() || 'funny';
  const url = `https://api.giphy.com/v1/stickers/search?api_key=${encodeURIComponent(
    apiKey
  )}&q=${encodeURIComponent(q)}&limit=${encodeURIComponent(String(limit))}&rating=g&lang=zh`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Giphy HTTP ${res.status}`);
  }
  const json = (await res.json()) as { data?: GiphyDatum[] };
  const rows = json.data ?? [];
  return rows
    .map(function mapRow(d) {
      const u =
        d.images?.fixed_height_small?.url ||
        d.images?.downsized?.url ||
        '';
      return {
        url: u,
        title: (d.title || 'sticker').trim() || 'sticker',
      };
    })
    .filter(function hasUrl(h) {
      return Boolean(h.url);
    });
}
