import { defineStore } from 'pinia';

/** Mock 模式下的匿名用户 ID，真实模式由 Supabase Auth 填充 */
export interface SessionSnapshot {
  userId: string | null;
  email: string | null;
}

export const useSessionStore = defineStore('session', {
  state: (): SessionSnapshot => ({
    userId: null,
    email: null,
  }),
  actions: {
    setSession(payload: Partial<SessionSnapshot>) {
      Object.assign(this, payload);
    },
    clearSession() {
      this.userId = null;
      this.email = null;
    },
  },
  persist: {
    pick: ['userId', 'email'],
  },
});
