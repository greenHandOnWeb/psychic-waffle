import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  RUNTIME_SETTINGS_STORAGE_KEY,
  type RuntimeSupabaseMockMode,
} from '@/data';
import { useSessionStore } from '@/stores/session';
import { createSupabaseMockClient, mockSetSession } from '@/lib/supabase-mock';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const envMockDefault = import.meta.env.VITE_SUPABASE_MOCK === 'true';

function readPersistedMockMode(): RuntimeSupabaseMockMode | null {
  try {
    const raw = localStorage.getItem(RUNTIME_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw) as Record<string, unknown>;
    const state = (data.state as Record<string, unknown> | undefined) ?? data;
    const m = state.supabaseMockMode;
    if (m === 'mock' || m === 'live' || m === 'inherit') {
      return m;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function resolveEffectiveMock(): boolean {
  const mode = readPersistedMockMode();
  if (mode === 'mock') {
    return true;
  }
  if (mode === 'live') {
    return false;
  }
  return envMockDefault;
}

let clientInstance: SupabaseClient | null = null;
let clientWasMock: boolean | null = null;

function getOrCreateClient(): SupabaseClient {
  const wantMock = resolveEffectiveMock();
  if (clientInstance !== null && clientWasMock === wantMock) {
    return clientInstance;
  }
  clientInstance = wantMock
    ? (createSupabaseMockClient() as unknown as SupabaseClient)
    : createClient(supabaseUrl, supabaseAnonKey);
  clientWasMock = wantMock;
  return clientInstance;
}

/**
 * 切换 Mock / 远端后调用，再刷新页面，使新客户端与引导逻辑生效。
 */
export function invalidateSupabaseClient(): void {
  clientInstance = null;
  clientWasMock = null;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getOrCreateClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

/**
 * Mock 模式下确保本地用户与 profiles 行存在，并同步到 Mock Auth 视图。
 * 请在 Pinia 挂载之后调用（例如 App.vue onMounted）。
 */
export async function ensureMockSession(): Promise<void> {
  if (!isSupabaseMockMode()) {
    return;
  }
  const sessionStore = useSessionStore();
  if (!sessionStore.userId) {
    sessionStore.setSession({
      userId: crypto.randomUUID(),
      email: 'mock@local.test',
    });
  }
  const uid = sessionStore.userId as string;
  mockSetSession({
    user: { id: uid, email: sessionStore.email ?? undefined },
  });
  const username = `user_${uid.replace(/-/g, '').slice(0, 8)}`;
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: uid,
        username,
        display_name: 'Mock 用户',
        avatar_url: null,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();
  if (error) {
    console.error('[ensureMockSession] profiles upsert failed', error);
  }
}

export function isSupabaseMockMode(): boolean {
  return resolveEffectiveMock();
}

/**
 * 写库 / 上传 Storage 前调用：保证 JWT 与 Pinia 中的 userId 已对齐（避免 RLS 拒绝）。
 */
export async function getWriterUserId(): Promise<string> {
  if (isSupabaseMockMode()) {
    await ensureMockSession();
  } else {
    await ensureSupabaseAuthSession();
  }
  const uid = useSessionStore().userId;
  if (!uid) {
    throw new Error('会话未就绪');
  }
  return uid;
}

function formatAuthOrDbError(prefix: string, err: unknown): Error {
  if (err && typeof err === 'object' && 'message' in err) {
    const row = err as { message: string; code?: string; hint?: string };
    const parts = [prefix + ':', row.message];
    if (row.code) {
      parts.push(`(${row.code})`);
    }
    if (row.hint) {
      parts.push('-', row.hint);
    }
    return new Error(parts.join(' '));
  }
  if (err instanceof Error) {
    return new Error(`${prefix}: ${err.message}`);
  }
  return new Error(`${prefix}: ${String(err)}`);
}

/**
 * 非 Mock：用 Supabase **匿名登录** 拿到 JWT，使 `auth.uid()` 与写入的 `user_id` 一致，满足 RLS。
 * 需在控制台 Authentication → Providers 中开启 **Anonymous sign-ins**。
 */
export async function ensureSupabaseAuthSession(): Promise<void> {
  if (isSupabaseMockMode()) {
    return;
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '缺少环境变量：请在 .env / .env.development 中配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY，并重启 dev'
    );
  }
  const sessionStore = useSessionStore();
  const { data: sessionData, error: getErr } = await supabase.auth.getSession();
  if (getErr) {
    console.error('[ensureSupabaseAuthSession] getSession', getErr);
    throw formatAuthOrDbError('读取会话失败', getErr);
  }
  let session = sessionData.session;
  if (!session) {
    const { data: signData, error: signErr } = await supabase.auth.signInAnonymously();
    if (signErr) {
      console.error('[ensureSupabaseAuthSession] signInAnonymously', signErr);
      throw formatAuthOrDbError('匿名登录失败（常见：未在控制台开启 Anonymous 登录）', signErr);
    }
    session = signData.session ?? null;
  }
  if (!session) {
    throw new Error('匿名登录成功但未返回会话，请刷新页面重试');
  }
  const uid = session.user.id;
  sessionStore.setSession({
    userId: uid,
    email: session.user.email ?? null,
  });
  const username = `user_${uid.replace(/-/g, '').slice(0, 8)}`;
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert(
      {
        id: uid,
        username,
        display_name: '访客',
        avatar_url: null,
      },
      { onConflict: 'id' }
    )
    .select()
    .single();
  if (profileErr) {
    console.error('[ensureSupabaseAuthSession] profiles upsert', profileErr);
    throw formatAuthOrDbError('写入 profiles 失败（请确认已执行 001_init.sql 迁移）', profileErr);
  }
}
