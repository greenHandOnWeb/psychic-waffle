import type { ImageRow, LikeRow, ProfileRow, PuzzleLayout, TemplateRow } from '@/types/database';
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
  likes: LikeRow[];
  templates: TemplateRow[];
  /** key: `${bucket}/${path}` -> 可访问 URL */
  storagePublicUrls: Record<string, string>;
}

function normalizeLikesArray(raw: unknown): LikeRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(function mapLike(row: unknown) {
    const r = row as Record<string, unknown>;
    return {
      id: (r.id as string) ?? crypto.randomUUID(),
      image_id: r.image_id as string,
      user_id: r.user_id as string,
      created_at: (r.created_at as string) ?? new Date().toISOString(),
    };
  });
}

function reconcileImageLikeCounts(db: MockDbSnapshot) {
  for (let i = 0; i < db.images.length; i++) {
    const id = db.images[i].id;
    let n = 0;
    for (let j = 0; j < db.likes.length; j++) {
      if (db.likes[j].image_id === id) {
        n++;
      }
    }
    db.images[i] = Object.assign({}, db.images[i], { likes_count: n });
  }
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
    const likes = normalizeLikesArray((parsed as { likes?: unknown }).likes);
    const snap: MockDbSnapshot = {
      profiles: parsed.profiles ?? [],
      images: imgs,
      likes,
      templates: parsed.templates?.length ? parsed.templates : seedTemplates(),
      storagePublicUrls: parsed.storagePublicUrls ?? {},
    };
    reconcileImageLikeCounts(snap);
    return snap;
  } catch {
    return emptySnapshot();
  }
}

function emptySnapshot(): MockDbSnapshot {
  return {
    profiles: [],
    images: [],
    likes: [],
    templates: seedTemplates(),
    storagePublicUrls: {},
  };
}

function normalizeImageRow(raw: Record<string, unknown>): ImageRow {
  const lc = raw.likes_count;
  const del = raw.deleted_at;
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
    deleted_at: typeof del === 'string' && del.length ? del : null,
    created_at: (raw.created_at as string) ?? new Date().toISOString(),
    likes_count: typeof lc === 'number' && Number.isFinite(lc) ? lc : 0,
    gallery_category:
      (raw.gallery_category as ImageRow['gallery_category']) ?? GALLERY_CATEGORY_SINGLE,
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

type Operation = 'select' | 'insert' | 'update' | 'upsert' | 'delete';

class MockTableBuilder {
  private readonly table: string;
  private operation: Operation = 'select';
  private payload: unknown[] = [];
  private filtersEq: Record<string, unknown> = {};
  private filtersContains: Record<string, unknown[]> = {};
  private filtersIn: Record<string, unknown[]> = {};
  private filtersIs: Record<string, unknown> = {};
  /** column -> value；value === null 表示 IS NOT NULL（配合 not(column,'is',null)） */
  private filtersNotIs: Record<string, unknown> = {};
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

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: unknown) {
    this.filtersEq[column] = value;
    return this;
  }

  contains(column: string, value: unknown[]) {
    this.filtersContains[column] = value;
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filtersIn[column] = values;
    return this;
  }

  is(column: string, value: unknown) {
    this.filtersIs[column] = value;
    return this;
  }

  not(column: string, op: string, value: unknown) {
    if (op === 'is') {
      this.filtersNotIs[column] = value;
    }
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
    const eq = this.filtersEq;
    const cs = this.filtersContains;
    const inn = this.filtersIn;
    const isF = this.filtersIs;
    const notIsF = this.filtersNotIs;
    return rows.filter(function matchFilters(row) {
      function cellIsEmpty(v: unknown) {
        return v == null || v === '';
      }
      const keysEq = Object.keys(eq);
      for (let i = 0; i < keysEq.length; i++) {
        const key = keysEq[i];
        if (row[key] !== eq[key]) {
          return false;
        }
      }
      const keysCs = Object.keys(cs);
      for (let i = 0; i < keysCs.length; i++) {
        const key = keysCs[i];
        const need = cs[key];
        const cell = row[key];
        if (!Array.isArray(cell)) {
          return false;
        }
        for (let j = 0; j < need.length; j++) {
          if (!cell.includes(need[j])) {
            return false;
          }
        }
      }
      const keysIn = Object.keys(inn);
      for (let i = 0; i < keysIn.length; i++) {
        const key = keysIn[i];
        const allowed = inn[key];
        if (!allowed.includes(row[key])) {
          return false;
        }
      }
      const keysIs = Object.keys(isF);
      for (let i = 0; i < keysIs.length; i++) {
        const key = keysIs[i];
        const want = isF[key];
        const cell = row[key];
        if (want === null) {
          if (!cellIsEmpty(cell)) {
            return false;
          }
        } else if (cell !== want) {
          return false;
        }
      }
      const keysNotIs = Object.keys(notIsF);
      for (let i = 0; i < keysNotIs.length; i++) {
        const key = keysNotIs[i];
        const want = notIsF[key];
        const cell = row[key];
        if (want === null) {
          if (cellIsEmpty(cell)) {
            return false;
          }
        }
      }
      return true;
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
    if (this.table === 'likes') {
      return this.execLikes();
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
          deleted_at: null,
          created_at: raw.created_at ?? new Date().toISOString(),
          likes_count: 0,
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
      const idSingle = this.filtersEq.id as string | undefined;
      const idList = this.filtersIn.id as string[] | undefined;
      const uid = this.filtersEq.user_id as string | undefined;
      if (idSingle) {
        const idx = snapshot.images.findIndex(function byId(img) {
          return img.id === idSingle;
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
      if (idList?.length && uid) {
        const idSet = new Set(idList);
        for (let i = 0; i < snapshot.images.length; i++) {
          const img = snapshot.images[i];
          if (idSet.has(img.id) && img.user_id === uid) {
            snapshot.images[i] = Object.assign({}, img, patch);
          }
        }
        persistSnapshot(snapshot);
        return ok(null);
      }
      return err('update images 需要 eq id，或 in("id") 与 eq("user_id")');
    }
    if (this.operation === 'delete') {
      const ids = this.filtersIn.id as string[] | undefined;
      const uid = this.filtersEq.user_id as string | undefined;
      if (!ids || !ids.length || !uid) {
        return err('delete images 需要 in("id", ids) 与 eq("user_id", uid)');
      }
      const idSet = new Set(ids);
      const deletedIds: string[] = [];
      const pathsToDrop: string[] = [];
      for (let i = 0; i < snapshot.images.length; i++) {
        const img = snapshot.images[i];
        if (idSet.has(img.id) && img.user_id === uid) {
          deletedIds.push(img.id);
          if (img.storage_path) {
            pathsToDrop.push(img.storage_path);
          }
        }
      }
      if (!deletedIds.length) {
        return ok(null);
      }
      const delSet = new Set(deletedIds);
      snapshot.images = snapshot.images.filter(function keepImg(img) {
        return !delSet.has(img.id);
      });
      snapshot.likes = snapshot.likes.filter(function keepLike(l) {
        return !delSet.has(l.image_id);
      });
      const bucket = STORAGE_BUCKET;
      for (let p = 0; p < pathsToDrop.length; p++) {
        const key = `${bucket}/${pathsToDrop[p]}`;
        delete snapshot.storagePublicUrls[key];
      }
      persistSnapshot(snapshot);
      return ok(null);
    }
    return err('images: 不支持的操作');
  }

  private execLikes(): MockResult<unknown> {
    const list = snapshot.likes;
    if (this.operation === 'select') {
      let rows = this.applyFilters(list as unknown as Record<string, unknown>[]);
      rows = this.sortRows(rows);
      if (this.wantSingle) {
        return ok(rows[0] ?? null);
      }
      return ok(rows);
    }
    return err('likes: Mock 下仅支持 select（点赞请走 RPC toggle_image_like）');
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

  async remove(paths: string[]) {
    await delay();
    if (!paths.length) {
      return ok({ data: [] });
    }
    const bucket = this.bucket;
    for (let i = 0; i < paths.length; i++) {
      const key = `${bucket}/${paths[i]}`;
      delete snapshot.storagePublicUrls[key];
    }
    persistSnapshot(snapshot);
    return ok({ data: [] });
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

async function executeMockRpc(
  fn: string,
  params: Record<string, unknown>
): Promise<MockResult<unknown>> {
  await delay();
  if (fn === 'gallery_distinct_tags') {
    const set = new Set<string>();
    for (let i = 0; i < snapshot.images.length; i++) {
      const img = snapshot.images[i];
      if (img.is_public !== false && !img.deleted_at) {
        const tags = img.tags ?? [];
        for (let j = 0; j < tags.length; j++) {
          const t = String(tags[j]).trim();
          if (t) {
            set.add(t);
          }
        }
      }
    }
    const sorted = [...set].sort();
    const rows = sorted.map(function toTagRow(tag) {
      return { tag };
    });
    return ok(rows);
  }
  if (fn === 'toggle_image_like') {
    const imageId = params.p_image_id as string;
    const sess = mockGetSession();
    const uid = sess?.user?.id;
    if (!uid) {
      return err('请先登录（Mock：需 ensureMockSession）');
    }
    const imgIdx = snapshot.images.findIndex(function byImgId(im) {
      return im.id === imageId;
    });
    if (imgIdx < 0) {
      return err('图片不存在');
    }
    if (snapshot.images[imgIdx].is_public === false || snapshot.images[imgIdx].deleted_at) {
      return err('图片不可访问');
    }
    const likeIdx = snapshot.likes.findIndex(function findLikeRow(l) {
      return l.image_id === imageId && l.user_id === uid;
    });
    let nowLiked: boolean;
    if (likeIdx >= 0) {
      snapshot.likes.splice(likeIdx, 1);
      nowLiked = false;
    } else {
      const row: LikeRow = {
        id: crypto.randomUUID(),
        image_id: imageId,
        user_id: uid,
        created_at: new Date().toISOString(),
      };
      snapshot.likes.push(row);
      nowLiked = true;
    }
    let cnt = 0;
    for (let k = 0; k < snapshot.likes.length; k++) {
      if (snapshot.likes[k].image_id === imageId) {
        cnt++;
      }
    }
    snapshot.images[imgIdx] = Object.assign({}, snapshot.images[imgIdx], { likes_count: cnt });
    persistSnapshot(snapshot);
    return ok({ liked: nowLiked, likes_count: cnt });
  }
  return err(`未知 RPC: ${fn}`);
}

/** 与 supabase-js 子集兼容的 Mock 客户端（经 as unknown as SupabaseClient 导出） */
export function createSupabaseMockClient() {
  return {
    from(table: string) {
      return new MockTableBuilder(table);
    },
    rpc(functionName: string, params?: Record<string, unknown>) {
      return executeMockRpc(functionName, params ?? {});
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
