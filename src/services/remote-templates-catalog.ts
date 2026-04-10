import { DEFAULT_TEMPLATES_CATALOG_PATH } from '@/data';
import type { PuzzleLayout, TemplateRow } from '@/types/database';

function readEnvTemplatesCatalogUrl(): string {
  const u = import.meta.env.VITE_TEMPLATES_CATALOG_URL;
  return typeof u === 'string' ? u.trim() : '';
}

/**
 * 解析最终请求的模板目录 URL：设置页覆盖 > .env > 内置路径
 */
export function resolveTemplatesCatalogUrl(settingsOverride: string): string {
  const fromSettings = (settingsOverride || '').trim();
  if (fromSettings.length > 0) {
    return fromSettings;
  }
  const fromEnv = readEnvTemplatesCatalogUrl();
  if (fromEnv.length > 0) {
    return fromEnv;
  }
  return DEFAULT_TEMPLATES_CATALOG_PATH;
}

/** 是否为内置同源 catalog（失败时不 Toast，仅 debug） */
export function isBuiltinTemplatesCatalogUrl(url: string): boolean {
  const u = (url || '').trim();
  if (u === DEFAULT_TEMPLATES_CATALOG_PATH) {
    return true;
  }
  try {
    const abs = typeof window !== 'undefined' ? new URL(u, window.location.href) : new URL(u);
    if (abs.pathname === DEFAULT_TEMPLATES_CATALOG_PATH) {
      return true;
    }
    if (abs.pathname.endsWith('/templates-catalog.json')) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function shouldToastOnCatalogFetchFailure(resolvedUrl: string): boolean {
  return !isBuiltinTemplatesCatalogUrl(resolvedUrl);
}

/**
 * @deprecated 请使用 resolveTemplatesCatalogUrl + 设置 store
 */
export function getTemplatesCatalogUrl(): string {
  return resolveTemplatesCatalogUrl('');
}

/**
 * @deprecated 请使用 shouldToastOnCatalogFetchFailure(resolveTemplatesCatalogUrl(...))
 */
export function isCustomTemplatesCatalogUrl(): boolean {
  return readEnvTemplatesCatalogUrl().length > 0;
}

function normalizeRemoteTemplateRow(raw: unknown): TemplateRow | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string') {
    return null;
  }
  const layout = r.layout as PuzzleLayout | undefined;
  if (!layout || typeof layout !== 'object' || !Array.isArray(layout.elements)) {
    return null;
  }
  return {
    id: r.id,
    name: r.name,
    description: typeof r.description === 'string' ? r.description : null,
    thumbnail_url: typeof r.thumbnail_url === 'string' ? r.thumbnail_url : null,
    layout,
    created_at: typeof r.created_at === 'string' ? r.created_at : new Date().toISOString(),
  };
}

export async function fetchRemoteTemplatesCatalogAt(catalogUrl: string): Promise<TemplateRow[]> {
  const res = await fetch(catalogUrl, { mode: 'cors' });
  if (!res.ok) {
    throw new Error(`模板目录请求失败 HTTP ${res.status}`);
  }
  const json = (await res.json()) as unknown;
  if (!Array.isArray(json)) {
    throw new Error('模板目录 JSON 须为数组');
  }
  const out: TemplateRow[] = [];
  for (let i = 0; i < json.length; i++) {
    const row = normalizeRemoteTemplateRow(json[i]);
    if (row) {
      out.push(row);
    }
  }
  return out;
}

/** 使用当前解析规则拉取（无设置覆盖时调用方传入 resolve 结果） */
export async function fetchRemoteTemplatesCatalog(): Promise<TemplateRow[]> {
  return fetchRemoteTemplatesCatalogAt(getTemplatesCatalogUrl());
}

export function mergeTemplateCatalogs(local: TemplateRow[], remote: TemplateRow[]): TemplateRow[] {
  const map = new Map<string, TemplateRow>();
  for (let i = 0; i < local.length; i++) {
    map.set(local[i].id, local[i]);
  }
  for (let i = 0; i < remote.length; i++) {
    map.set(remote[i].id, remote[i]);
  }
  return Array.from(map.values()).sort(function sortByName(a, b) {
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}
