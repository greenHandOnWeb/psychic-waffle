<template>
  <main class="mx-auto max-w-3xl space-y-6 px-4 py-8" aria-label="作品分享">
    <div v-if="loading" class="text-center text-slate-400">加载中…</div>
    <div
      v-else-if="loadError || !image"
      class="rounded-lg border border-slate-700 bg-slate-900/80 px-6 py-10 text-center text-slate-300"
    >
      <p class="text-lg text-white">无法查看该作品</p>
      <p class="mt-2 text-sm text-slate-400">
        链接无效、作品已设为不公开，或尚未生成可访问的图片地址。
      </p>
      <RouterLink
        to="/"
        class="mt-6 inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
      >
        返回画廊
      </RouterLink>
    </div>
    <template v-else>
      <header class="space-y-2">
        <p class="text-xs font-medium uppercase tracking-wide text-sky-400/90">灵动画册 · 分享</p>
        <h1 class="text-2xl font-semibold text-white">{{ image.title || '未命名作品' }}</h1>
        <p v-if="(image.tags || []).length" class="text-sm text-slate-400">
          {{ (image.tags || []).join(' · ') }}
        </p>
      </header>
      <div class="overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-xl">
        <img
          :src="image.public_url || ''"
          :alt="image.title || '分享图'"
          class="block w-full object-contain"
          decoding="async"
          fetchpriority="high"
        />
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          @click="onCopyPageLink"
        >
          复制本页链接
        </button>
        <RouterLink
          to="/"
          class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          打开灵动画册
        </RouterLink>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import { supabase } from '@/lib/supabase';
import { buildSharePosterUrl, DEFAULT_SITE_DOC_TITLE } from '@/data';
import type { ImageRow } from '@/types/database';

const route = useRoute();
const loading = ref(true);
const loadError = ref(false);
const image = ref<ImageRow | null>(null);
const prevTitle = typeof document !== 'undefined' ? document.title : '';

function clearShareHeadMarkers(): void {
  document
    .querySelectorAll('meta[data-app-share-meta], link[data-app-share-meta]')
    .forEach(function removeNode(n) {
      n.remove();
    });
}

function upsertPropertyMeta(property: string, content: string): void {
  const sel = `meta[property="${property}"][data-app-share-meta]`;
  let el = document.querySelector(sel) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    el.setAttribute('data-app-share-meta', '1');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertNameMeta(name: string, content: string): void {
  const sel = `meta[name="${name}"][data-app-share-meta]`;
  let el = document.querySelector(sel) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    el.setAttribute('data-app-share-meta', '1');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  let el = document.querySelector(
    'link[rel="canonical"][data-app-share-meta]'
  ) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    el.setAttribute('data-app-share-meta', '1');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function applyShareSocialMeta(row: ImageRow, pageUrl: string): void {
  const title = (row.title || '作品分享').trim() || '作品分享';
  const tags = (row.tags || []).filter(Boolean);
  const desc = tags.length ? tags.join('、') : `${DEFAULT_SITE_DOC_TITLE}分享：${title}`;
  upsertPropertyMeta('og:type', 'website');
  upsertPropertyMeta('og:title', `${title} · ${DEFAULT_SITE_DOC_TITLE}`);
  upsertPropertyMeta('og:description', desc);
  upsertPropertyMeta('og:url', pageUrl);
  if (row.public_url) {
    upsertPropertyMeta('og:image', row.public_url);
  }
  upsertNameMeta('twitter:card', 'summary_large_image');
  upsertNameMeta('twitter:title', `${title} · ${DEFAULT_SITE_DOC_TITLE}`);
  if (row.public_url) {
    upsertNameMeta('twitter:image', row.public_url);
  }
  upsertNameMeta('description', desc);
  upsertCanonicalLink(pageUrl);
}

function resolveImageId(): string {
  const raw = route.params.id;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return typeof s === 'string' ? s.trim() : '';
}

async function loadShare() {
  const rid = resolveImageId();
  clearShareHeadMarkers();
  loading.value = true;
  loadError.value = false;
  image.value = null;
  if (!rid) {
    loading.value = false;
    loadError.value = true;
    document.title = DEFAULT_SITE_DOC_TITLE;
    return;
  }
  const { data, error } = await supabase
    .from('images')
    .select('*')
    .eq('id', rid)
    .is('deleted_at', null)
    .maybeSingle();
  loading.value = false;
  if (error || !data) {
    loadError.value = true;
    document.title = DEFAULT_SITE_DOC_TITLE;
    return;
  }
  const row = data as ImageRow;
  if (!row.is_public || !row.public_url || row.deleted_at) {
    loadError.value = true;
    document.title = DEFAULT_SITE_DOC_TITLE;
    return;
  }
  image.value = row;
  const pageTitle = `${(row.title || '作品分享').trim() || '作品分享'} · ${DEFAULT_SITE_DOC_TITLE}`;
  document.title = pageTitle;
  const pageUrl = buildSharePosterUrl(rid);
  applyShareSocialMeta(row, pageUrl);
}

function onCopyPageLink() {
  const rid = resolveImageId();
  if (!rid) {
    toast.error('无法复制链接');
    return;
  }
  const href = buildSharePosterUrl(rid);
  void navigator.clipboard.writeText(href).then(
    function onCopyOk() {
      toast.success('链接已复制');
    },
    function onCopyFail() {
      toast.error('复制失败，请手动复制地址栏');
    }
  );
}

watch(
  function shareRouteId() {
    return resolveImageId();
  },
  function onShareIdChange() {
    void loadShare();
  },
  { immediate: true }
);

onBeforeUnmount(function shareUnmount() {
  clearShareHeadMarkers();
  document.title = prevTitle;
});
</script>
