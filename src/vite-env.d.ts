/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_MOCK: string;
  /** Pixabay 插图搜索（可选，见 .env.example） */
  readonly VITE_PIXABAY_API_KEY?: string;
  /** 云端模板：公开 JSON 目录 URL（可选，与 Supabase templates 合并，见 README） */
  readonly VITE_TEMPLATES_CATALOG_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
