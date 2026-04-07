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
