import { defineStore } from 'pinia';
import {
  RUNTIME_SETTINGS_STORAGE_KEY,
  type RuntimeSupabaseMockMode,
} from '@/data';

/**
 * 可在「设置」页修改的运行时偏好（持久化到 localStorage）。
 * 构建时 .env 仍可作为默认值；此处非空字段会覆盖对应 .env。
 */
export const useRuntimeSettingsStore = defineStore('runtimeSettings', {
  state: function runtimeSettingsState() {
    return {
      /** 模板 JSON 目录完整 URL；空则使用 VITE_TEMPLATES_CATALOG_URL，再空则用内置 /templates-catalog.json */
      templatesCatalogUrl: '',
      /** Pixabay API Key；空则使用 VITE_PIXABAY_API_KEY */
      pixabayApiKey: '',
      /**
       * inherit=按 VITE_SUPABASE_MOCK；mock=强制本地 Mock；live=强制远端 Supabase。
       * 修改后需刷新页面生效。
       */
      supabaseMockMode: 'inherit' as RuntimeSupabaseMockMode,
    };
  },
  actions: {
    clearExternalOverrides() {
      Object.assign(this, {
        templatesCatalogUrl: '',
        pixabayApiKey: '',
        supabaseMockMode: 'inherit' as RuntimeSupabaseMockMode,
      });
    },
  },
  persist: {
    key: RUNTIME_SETTINGS_STORAGE_KEY,
  },
});
