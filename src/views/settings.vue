<template>
  <div class="mx-auto max-w-2xl space-y-8">
    <div>
      <h1 class="text-xl font-semibold text-white">设置</h1>
      <p class="mt-2 text-sm leading-relaxed text-slate-400">
        此处为<strong class="text-slate-300">可选运行时配置</strong
        >，保存在本机浏览器（localStorage）。填写后会<strong class="text-slate-300">优先于</strong>
        构建时 <code class="text-slate-300">.env</code> 中的同名变量；留空则仍使用 .env
        或项目内置默认（如 <code class="text-slate-300">/templates-catalog.json</code>）。
      </p>
      <p class="mt-2 text-xs text-amber-200/90">
        Pixabay Key 属于私密信息，勿在公共电脑勾选「记住」类浏览器同步；团队生产环境仍建议用 CI 注入
        .env。
      </p>
    </div>

    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 class="text-lg font-medium text-white">Supabase / Mock 模式</h2>
      <p class="mt-1 text-xs text-slate-500">
        选项保存在本机
        <code class="text-slate-400">localStorage</code
        >（与下方运行时配置同一存储键），可覆盖构建时的
        <code class="text-slate-400">VITE_SUPABASE_MOCK</code>。切换后将自动刷新页面以重新连接。
      </p>
      <div class="mt-4 space-y-3">
        <label
          v-for="opt in RUNTIME_SUPABASE_MOCK_MODE_OPTIONS"
          :key="opt.value"
          class="flex cursor-pointer gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 transition-colors hover:border-slate-600"
        >
          <input
            v-model="supabaseMockMode"
            type="radio"
            class="mt-1 text-sky-500"
            :value="opt.value"
            @change="onSupabaseMockModeCommit"
          />
          <span>
            <span class="block text-sm font-medium text-slate-200">{{ opt.label }}</span>
            <span class="mt-0.5 block text-xs text-slate-500">{{ opt.description }}</span>
          </span>
        </label>
      </div>
    </section>

    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 class="text-lg font-medium text-white">安装到设备（类 App）</h2>
      <p class="mt-1 text-xs text-slate-500">
        本站已提供 Web Manifest（<code class="text-slate-400">/site.webmanifest</code>）。在
        <strong class="text-slate-300">Chrome / Edge</strong> 中打开本站后，可通过菜单「
        <strong class="text-slate-300">安装应用</strong>」或「<strong class="text-slate-300"
          >添加到主屏幕</strong
        >」获得桌面图标；国内访问建议将构建产物部署到自有域名（与 Vercel 线路解耦）。
      </p>
      <p class="mt-2 text-xs text-slate-500">
        主屏幕快捷方式已配置「画廊」「拼图编辑」入口（依赖浏览器对 Manifest shortcuts 的支持）。
      </p>
    </section>

    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 class="text-lg font-medium text-white">云端模板目录</h2>
      <p class="mt-1 text-xs text-slate-500">
        须为可 CORS 访问的 JSON 数组 URL。留空则顺序为：<code class="text-slate-400"
          >VITE_TEMPLATES_CATALOG_URL</code
        >
        → 内置 <code class="text-slate-400">/templates-catalog.json</code>。
      </p>
      <input
        v-model="templatesCatalogUrl"
        type="url"
        class="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        placeholder="https://cdn.jsdelivr.net/gh/…/catalog.json"
      />
    </section>

    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 class="text-lg font-medium text-white">Pixabay（表情包联网搜索）</h2>
      <p class="mt-1 text-xs text-slate-500">
        留空则使用 <code class="text-slate-400">VITE_PIXABAY_API_KEY</code>。申请：
        <a
          class="text-sky-400 underline"
          href="https://pixabay.com/api/docs/"
          target="_blank"
          rel="noopener noreferrer"
          >Pixabay API</a
        >。
      </p>
      <input
        v-model="pixabayApiKey"
        type="password"
        autocomplete="off"
        class="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        placeholder="粘贴 API Key"
      />
    </section>

    <section class="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <h2 class="text-lg font-medium text-slate-300">仍依赖 .env 的配置</h2>
      <ul class="mt-2 list-inside list-disc text-sm text-slate-500">
        <li>
          <code class="text-slate-400">VITE_SUPABASE_URL</code>、<code class="text-slate-400"
            >VITE_SUPABASE_ANON_KEY</code
          >
          仅在构建时注入；「强制远端」前请先在 .env 中配置并重启 dev / 重新 build。
        </li>
        <li>数据库与 Storage 权限仍由 Supabase 控制台与迁移 SQL 决定。</li>
      </ul>
    </section>

    <div class="flex flex-wrap gap-3">
      <button
        type="button"
        class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        @click="onClearOverrides"
      >
        清空上述覆盖（恢复 .env / 默认）
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';
import { RUNTIME_SUPABASE_MOCK_MODE_OPTIONS } from '@/data';
import { invalidateSupabaseClient } from '@/lib/supabase';
import { useRuntimeSettingsStore } from '@/stores/runtime-settings';

const store = useRuntimeSettingsStore();
const { templatesCatalogUrl, pixabayApiKey, supabaseMockMode } = storeToRefs(store);

function onSupabaseMockModeCommit() {
  invalidateSupabaseClient();
  toast.success('已保存到本机，正在刷新页面…');
  window.setTimeout(function scheduleReload() {
    window.location.reload();
  }, 350);
}

function onClearOverrides() {
  store.clearExternalOverrides();
  invalidateSupabaseClient();
  toast.success('已清空运行时覆盖，即将刷新…');
  window.setTimeout(function scheduleReloadAfterClear() {
    window.location.reload();
  }, 350);
}
</script>
