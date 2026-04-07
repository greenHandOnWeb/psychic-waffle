import type { ImageRow, ProfileRow, PuzzleLayout, TemplateRow } from '@/types/database';
import {
  GALLERY_CATEGORY_SINGLE,
  MOCK_NETWORK_DELAY_MS,
  MOCK_STORAGE_KEY,
  STORAGE_BUCKET,
} from '@/data';
import templatesSeed from '@/mocks/templates-seed.json';

export interface MockDbSnapshot {
  profiles: ProfileRow[];
  images: ImageRow[];
  templates: TemplateRow[];
  /** key: `${bucket}/${path}` -> 可访问 URL */
  storagePublicUrls: Record<string, string>;
}

function loadSnapshot(): MockDbSnapshot {
  if (typeof localStorage === 'undefined') {
    return emptySnapshot();
  }
  const raw = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!raw) {
    return emptySnapshot();
  }
  try {
    const parsed = JSON.parse(raw) as MockDbSnapshot;
    const imgs = (parsed.images ?? []).map(function mapImg(img) {
      return normalizeImageRow(img as unknown as Record<string, unknown>);
    });
    return {
      profiles: parsed.profiles ?? [],
      images: imgs,
      templates: parsed.templates?.length ? parsed.templates : seedTemplates(),
      storagePublicUrls: parsed.storagePublicUrls ?? {},
    };
  } catch {
    return emptySnapshot();
  }
}

function emptySnapshot(): MockDbSnapshot {
  return {
    profiles: [],
    images: [],
    templates: seedTemplates(),
    storagePublicUrls: {},
  };
}

function normalizeImageRow(raw: Record<string, unknown>): ImageRow {
  return {
    id: raw.id as string,
    user_id: raw.user_id as string,
    storage_path: raw.storage_path as string,
    public_url: (raw.public_url as string | null) ?? null,
    title: (raw.title as string | null) ?? null,
    tags: (raw.tags as string[]) ?? [],
    layout: (raw.layout as PuzzleLayout) ?? { elements: [] },
    file_size_bytes: (raw.file_size_bytes as number | null) ?? null,
    is_public: raw.is_public !== false,
    created_at: (raw.created_at as string) ?? new Date().toISOString(),
    gallery_category: (raw.gallery_category as ImageRow['gallery_category']) ?? GALLERY_CATEGORY_SINGLE,
    source_image_id: (raw.source_image_id as string | null) ?? null,
  };
}

function seedTemplates(): TemplateRow[] {
  return templatesSeed as TemplateRow[];
}

function persistSnapshot(s: MockDbSnapshot) {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(s));
  } catch (e) {
    console.warn('[mock] 无法写入 localStorage（可能超出配额）', e);
  }
}

let snapshot: MockDbSnapshot = loadSnapshot();
if (!snapshot.templates.length) {
  snapshot = Object.assign(snapshot, { templates: seedTemplates() });
  persistSnapshot(snapshot);
}

function delay() {
  return new Promise<void>(function resolveDelay(r) {
    setTimeout(r, MOCK_NETWORK_DELAY_MS);
  });
}

interface MockResult<T> {
  data: T;
  error: { message: string; code?: string } | null;
}

function ok<T>(data: T): MockResult<T> {
  return { data, error: null };
}

function err<T>(message: string, code?: string): MockResult<T> {
  return { data: null as T, error: { message, code } };
}

type Operation = 'select' | 'insert' | 'update' | 'upsert';

class MockTableBuilder {
  private readonly table: string;
  private operation: Operation = 'select';
  private payload: unknown[] = [];
  private filters: Record<string, unknown> = {};
  private orderColumn: string | null = null;
  private orderAsc = true;
  private wantSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select() {
    return this;
  }

  insert(rows: unknown | unknown[]) {
    this.operation = 'insert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(patch: Record<string, unknown>) {
    this.operation = 'update';
    this.payload = [patch];
    return this;
  }

  upsert(rows: unknown | unknown[]) {
    this.operation = 'upsert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters[column] = value;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column;
    this.orderAsc = options?.ascending ?? true;
    return this;
  }

  single() {
    this.wantSingle = true;
    return this;
  }

  maybeSingle() {
    this.wantSingle = true;
    return this;
  }

  private applyFilters<T extends Record<string, unknown>>(rows: T[]): T[] {
    const filters = this.filters;
    return rows.filter(function matchFilters(row) {
      return Object.keys(filters).every(function checkKey(key) {
        return row[key] === filters[key];
      });
    });
  }

  private sortRows<T extends Record<string, unknown>>(rows: T[]): T[] {
    if (!this.orderColumn) {
      return rows;
    }
    const col = this.orderColumn;
    const asc = this.orderAsc;
    return [...rows].sort(function sortByColumn(a, b) {
      const av = a[col] as string | number;
      const bv = b[col] as string | number;
      if (av === bv) {
        return 0;
      }
      const cmp = av < bv ? -1 : 1;
      return asc ? cmp : -cmp;
    });
  }

  async execute(): Promise<MockResult<unknown>> {
    await delay();
    if (this.table === 'profiles') {
      return this.execProfiles();
    }
    if (this.table === 'images') {
      return this.execImages();
    }
    if (this.table === 'templates') {
      return this.execTemplates();
    }
    return err(`未知表: ${this.table}`);
  }

  private execProfiles(): MockResult<unknown> {
    const list = snapshot.profiles;
    if (this.operation === 'select') {
      let rows = this.applyFilters(list as unknown as Record<string, unknown>[]);
      rows = this.sortRows(rows);
      if (this.wantSingle) {
        const row = rows[0] ?? null;
        return ok(row);
      }
      return ok(rows);
    }
    if (this.operation === 'upsert') {
      for (const row of this.payload as ProfileRow[]) {
        const idx = snapshot.profiles.findIndex(function findById(p) {
          return p.id === row.id;
        });
        if (idx >= 0) {
          Object.assign(snapshot.profiles[idx], row);
        } else {
          snapshot.profiles.push(
            Object.assign({}, row, {
              created_at: row.created_at ?? new Date().toISOString(),
            })
          );
        }
      }
      persistSnapshot(snapshot);
      const last = this.payload[this.payload.length - 1] as ProfileRow;
      if (this.wantSingle) {
        const found = snapshot.profiles.find(function findLast(p) {
          return p.id === last.id;
        });
        return ok(found ?? last);
      }
      return ok(this.payload);
    }
    return err('profiles: 不支持的操作');
  }

  private execImages(): MockResult<unknown> {
    const list = snapshot.images;
    if (this.operation === 'select') {
      let rows = this.applyFilters(list as unknown as Record<string, unknown>[]);
      rows = this.sortRows(rows);
      if (this.wantSingle) {
        return ok(rows[0] ?? null);
      }
      return ok(rows);
    }
    if (this.operation === 'insert') {
      const created: ImageRow[] = [];
      for (const raw of this.payload as Partial<ImageRow>[]) {
        const row: ImageRow = {
          id: raw.id ?? crypto.randomUUID(),
          user_id: raw.user_id as string,
          storage_path: raw.storage_path as string,
          public_url: raw.public_url ?? null,
          title: raw.title ?? null,
          tags: raw.tags ?? [],
          layout: (raw.layout as PuzzleLayout) ?? { elements: [] },
          file_size_bytes: raw.file_size_bytes ?? null,
          is_public: raw.is_public ?? true,
          created_at: raw.created_at ?? new Date().toISOString(),
          gallery_category: raw.gallery_category ?? GALLERY_CATEGORY_SINGLE,
          source_image_id: raw.source_image_id ?? null,
        };
        snapshot.images.push(row);
        created.push(row);
      }
      persistSnapshot(snapshot);
      if (this.wantSingle) {
        return ok(created[0] ?? null);
      }
      return ok(created);
    }
    if (this.operation === 'update') {
      const patch = this.payload[0] as Partial<ImageRow>;
      const id = this.filters.id as string | undefined;
      if (!id) {
        return err('update images 需要 eq id');
      }
      const idx = snapshot.images.findIndex(function byId(img) {
        return img.id === id;
      });
      if (idx < 0) {
        return err('记录不存在', 'PGRST116');
      }
      Object.assign(snapshot.images[idx], patch);
      persistSnapshot(snapshot);
      if (this.wantSingle) {
        return ok(snapshot.images[idx]);
      }
      return ok(snapshot.images[idx]);
    }
    return err('images: 不支持的操作');
  }

  private execTemplates(): MockResult<unknown> {
    const list = snapshot.templates;
    if (this.operation === 'select') {
      let rows = this.applyFilters(list as unknown as Record<string, unknown>[]);
      rows = this.sortRows(rows);
      if (this.wantSingle) {
        return ok(rows[0] ?? null);
      }
      return ok(rows);
    }
    return err('templates: Mock 下只读（可改 seed 文件）');
  }

  then<TResult1 = MockResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: MockResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise(function toDataUrl(resolve, reject) {
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

class MockStorageBucket {
  constructor(private readonly bucket: string) {}

  async upload(path: string, file: File | Blob) {
    await delay();
    const key = `${this.bucket}/${path}`;
    const url = await blobToDataUrl(file);
    snapshot.storagePublicUrls[key] = url;
    persistSnapshot(snapshot);
    return ok({ path });
  }

  getPublicUrl(path: string) {
    const key = `${this.bucket}/${path}`;
    const url =
      snapshot.storagePublicUrls[key] ??
      `https://mock.invalid/${encodeURIComponent(this.bucket)}/${encodeURIComponent(path)}`;
    return { data: { publicUrl: url } };
  }
}

class MockStorageApi {
  from(bucket: string) {
    return new MockStorageBucket(bucket);
  }
}

export interface MockAuthSession {
  user: { id: string; email?: string };
}

let mockSession: MockAuthSession | null = null;

export function mockSetSession(session: MockAuthSession | null) {
  mockSession = session;
}

export function mockGetSession(): MockAuthSession | null {
  return mockSession;
}

class MockAuthApi {
  getSession() {
    return delay().then(function returnSession() {
      return ok({
        session: mockSession
          ? {
              user: mockSession.user,
            }
          : null,
      });
    });
  }

  signInAnonymously() {
    return err('Mock 模式请使用 ensureMockSession');
  }
}

/** 与 supabase-js 子集兼容的 Mock 客户端（经 as unknown as SupabaseClient 导出） */
export function createSupabaseMockClient() {
  return {
    from(table: string) {
      return new MockTableBuilder(table);
    },
    storage: new MockStorageApi(),
    auth: new MockAuthApi(),
  };
}

export function mockResetDb() {
  snapshot = emptySnapshot();
  persistSnapshot(snapshot);
}

export { STORAGE_BUCKET };
