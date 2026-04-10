/**
 * Internet Archive 开放音频检索（https://archive.org），浏览器直连，无需 API Key。
 * 用于视频预览配乐等场景；请遵守 Archive 使用条款与素材许可说明。
 */

import { ARCHIVE_AUDIO_SEARCH_ROWS } from '@/data';

export interface ArchiveAudioHit {
  identifier: string;
  title: string;
  creator: string;
  /** 可直接作为 <audio src> 的地址 */
  playUrl: string;
}

interface AdvancedSearchDoc {
  identifier?: string;
  title?: string;
  creator?: string;
}

interface AdvancedSearchResponse {
  response?: {
    docs?: AdvancedSearchDoc[];
  };
}

interface MetadataFile {
  name?: string;
  format?: string;
  private?: string;
}

interface MetadataResponse {
  files?: MetadataFile[];
}

function buildArchiveAudioQuery(userQuery: string): string {
  const t = userQuery.trim().replace(/"/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t.length) {
    return 'mediatype:audio';
  }
  const parts = t.split(' ').filter(Boolean);
  const clause = parts
    .map(function quotePart(p) {
      return p.replace(/[()]/g, '');
    })
    .filter(Boolean)
    .join(' AND ');
  if (!clause.length) {
    return 'mediatype:audio';
  }
  return `mediatype:audio AND (${clause})`;
}

function pickMp3Name(files: MetadataFile[]): string | null {
  if (!Array.isArray(files)) {
    return null;
  }
  let fallback: string | null = null;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (!f || !f.name || f.private === 'true') {
      continue;
    }
    const name = f.name;
    const fmt = (f.format || '').toLowerCase();
    if (name.toLowerCase().endsWith('.mp3') || fmt.includes('mp3') || fmt.includes('mpeg')) {
      if (!name.endsWith('_speech.mp3') && !name.includes('__ia_thumb')) {
        return name;
      }
    }
    if (!fallback && name.toLowerCase().endsWith('.ogg')) {
      fallback = name;
    }
  }
  return fallback;
}

async function resolveArchivePlayUrl(identifier: string): Promise<string | null> {
  const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as MetadataResponse;
  const name = pickMp3Name(json.files ?? []);
  if (!name) {
    return null;
  }
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(name)}`;
}

/**
 * 关键词搜索可播放的 Archive 音频条目（带直链）
 */
export async function searchArchiveOrgAudio(query: string): Promise<ArchiveAudioHit[]> {
  const q = buildArchiveAudioQuery(query);
  const params = new URLSearchParams({
    q,
    rows: String(ARCHIVE_AUDIO_SEARCH_ROWS),
    page: '1',
    output: 'json',
  });
  params.append('fl[]', 'identifier');
  params.append('fl[]', 'title');
  params.append('fl[]', 'creator');
  const res = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Archive 搜索失败 HTTP ${res.status}`);
  }
  const json = (await res.json()) as AdvancedSearchResponse;
  const docs = json.response?.docs ?? [];
  const candidates = docs.filter(function hasId(d): d is AdvancedSearchDoc & { identifier: string } {
    return typeof d.identifier === 'string' && d.identifier.length > 0;
  });

  const resolved = await Promise.all(
    candidates.map(function mapDoc(d) {
      return resolveArchivePlayUrl(d.identifier).then(function withUrl(playUrl) {
        if (!playUrl) {
          return null;
        }
        const hit: ArchiveAudioHit = {
          identifier: d.identifier,
          title: typeof d.title === 'string' ? d.title : d.identifier,
          creator: typeof d.creator === 'string' ? d.creator : '',
          playUrl,
        };
        return hit;
      });
    })
  );

  const out: ArchiveAudioHit[] = [];
  for (let i = 0; i < resolved.length; i++) {
    if (resolved[i]) {
      out.push(resolved[i] as ArchiveAudioHit);
    }
  }
  return out;
}
