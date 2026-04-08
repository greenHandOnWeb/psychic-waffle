import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useSessionStore } from '@/stores/session';
import { createSupabaseMockClient, mockSetSession } from '@/lib/supabase-mock';

const isMock = import.meta.env.VITE_SUPABASE_MOCK === 'true';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase: SupabaseClient = isMock
  ? (createSupabaseMockClient() as unknown as SupabaseClient)
  : createClient(supabaseUrl, supabaseAnonKey);

/**
 * Mock 模式下确保本地用户与 profiles 行存在，并同步到 Mock Auth 视图。
 * 请在 Pinia 挂载之后调用（例如 App.vue onMounted）。
 */
export async function ensureMockSession(): Promise<void> {
  if (!isMock) {
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
  return isMock;
}

/**
 * 写库 / 上传 Storage 前调用：保证 JWT 与 Pinia 中的 userId 已对齐（避免 RLS 拒绝）。
 */
export async function getWriterUserId(): Promise<string> {
  if (isMock) {
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
  if (isMock) {
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
