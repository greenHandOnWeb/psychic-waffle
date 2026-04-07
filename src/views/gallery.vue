<template>
  <div class="space-y-8">
    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 class="mb-2 text-lg font-medium text-white">上传图片</h2>
      <p class="mb-4 text-sm text-slate-400">
        上传的素材会进入<strong class="text-slate-200">单图画廊</strong>，可进入编辑器排版；在编辑器中「保存并生成拼团」后，成品出现在<strong
          class="text-slate-200"
          >拼团画廊</strong
        >。
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <label
          class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          <input type="file" accept="image/*" class="hidden" :disabled="uploading" @change="onPickFile" />
          选择图片
        </label>
        <span v-if="uploading" class="text-sm text-slate-400">处理中…</span>
      </div>
    </section>

    <section>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-medium text-white">画廊</h2>
        <div class="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-0.5 text-sm">
          <button
            v-for="tab in galleryTabs"
            :key="tab.value"
            type="button"
            class="rounded-md px-3 py-1.5 font-medium transition-colors"
            :class="
              galleryTab === tab.value
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            "
            @click="setGalleryTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="text-slate-400">加载中…</div>
      <div
        v-else
        class="columns-1 gap-4 sm:columns-2 lg:columns-3"
        style="column-fill: balance"
      >
        <article
          v-for="img in images"
          :key="img.id"
          class="mb-4 break-inside-avoid rounded-lg border border-slate-800 bg-slate-900/80 shadow-lg"
        >
          <template v-if="isCollageItem(img)">
            <div class="relative block">
              <img
                v-if="img.public_url"
                :src="img.public_url"
                :alt="img.title || '拼团'"
                class="w-full rounded-t-lg object-cover"
                loading="lazy"
              />
              <div
                v-else
                class="flex h-40 items-center justify-center rounded-t-lg bg-slate-800 text-slate-500"
              >
                无预览
              </div>
              <span
                class="absolute right-2 top-2 rounded bg-violet-600/95 px-2 py-0.5 text-xs font-medium text-white shadow"
              >
                拼团
              </span>
            </div>
            <div class="p-3">
              <p class="truncate font-medium text-white">{{ img.title || '拼团成品' }}</p>
              <p class="mt-1 line-clamp-2 text-xs text-slate-400">
                {{ (img.tags || []).join(' · ') || '栅格拼图导出' }}
              </p>
              <RouterLink
                v-if="img.source_image_id"
                class="mt-2 inline-block text-sm text-sky-400 hover:text-sky-300"
                :to="`/editor/${img.source_image_id}`"
              >
                继续编辑原稿
              </RouterLink>
            </div>
          </template>
          <RouterLink v-else :to="`/editor/${img.id}`" class="block">
            <div class="relative">
              <img
                v-if="img.public_url"
                :src="img.public_url"
                :alt="img.title || 'gallery'"
                class="w-full rounded-t-lg object-cover"
                loading="lazy"
              />
              <div
                v-else
                class="flex h-40 items-center justify-center rounded-t-lg bg-slate-800 text-slate-500"
              >
                无预览
              </div>
              <span
                class="absolute right-2 top-2 rounded bg-sky-600/95 px-2 py-0.5 text-xs font-medium text-white shadow"
              >
                单图
              </span>
            </div>
            <div class="p-3">
              <p class="truncate font-medium text-white">{{ img.title || '未命名' }}</p>
              <p class="mt-1 line-clamp-2 text-xs text-slate-400">
                {{ (img.tags || []).join(' · ') || '暂无标签' }}
              </p>
            </div>
          </RouterLink>
        </article>
      </div>
      <p v-if="!loading && !images.length" class="text-slate-500">
        {{ emptyHint }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { supabase } from '@/lib/supabase';
import {
  GALLERY_CATEGORY_COLLAGE,
  GALLERY_CATEGORY_SINGLE,
  STORAGE_BUCKET,
} from '@/data';
import type { ImageRow } from '@/types/database';
import { useSessionStore } from '@/stores/session';
import { generateMockTags } from '@/services/ai-tags';
import {
  assertWithinMaxUploadSize,
  compressImageForUpload,
  UploadTooLargeError,
} from '@/utils/image-compress';

type GalleryTab = 'all' | 'single' | 'collage';

const galleryTabs: { value: GalleryTab; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'single', label: '单图' },
  { value: 'collage', label: '拼团' },
];

const images = ref<ImageRow[]>([]);
const loading = ref(true);
const uploading = ref(false);
const galleryTab = ref<GalleryTab>('all');
const sessionStore = useSessionStore();

function isCollageItem(img: ImageRow): boolean {
  return (img.gallery_category ?? GALLERY_CATEGORY_SINGLE) === GALLERY_CATEGORY_COLLAGE;
}

const emptyHint = computed(function emptyHintComputed() {
  if (galleryTab.value === 'single') {
    return '暂无单图素材，请先上传。';
  }
  if (galleryTab.value === 'collage') {
    return '暂无拼团成品，请在编辑器中点击「保存并生成拼团」。';
  }
  return '暂无作品，先上传一张单图吧。';
});

function setGalleryTab(value: GalleryTab) {
  galleryTab.value = value;
}

async function loadImages() {
  loading.value = true;
  try {
    let q = supabase.from('images').select('*').order('created_at', { ascending: false });
    if (galleryTab.value === 'single') {
      q = q.eq('gallery_category', GALLERY_CATEGORY_SINGLE);
    } else if (galleryTab.value === 'collage') {
      q = q.eq('gallery_category', GALLERY_CATEGORY_COLLAGE);
    }
    const { data, error } = await q;
    if (error) {
      console.error('[gallery] load images', error);
      toast.error(error.message || '加载画廊失败');
      return;
    }
    images.value = (data as ImageRow[]) ?? [];
  } catch (e) {
    console.error('[gallery] load images', e);
    toast.error('加载画廊失败');
  } finally {
    loading.value = false;
  }
}

async function onPickFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) {
    return;
  }
  try {
    assertWithinMaxUploadSize(file);
  } catch (e) {
    if (e instanceof UploadTooLargeError) {
      toast.error(e.message);
    } else {
      console.error(e);
      toast.error('文件校验失败');
    }
    return;
  }

  uploading.value = true;
  try {
    const uid = sessionStore.userId;
    if (!uid) {
      toast.error('请先等待会话初始化');
      return;
    }
    const compressed = await compressImageForUpload(file);
    const tags = await generateMockTags(compressed);
    const safeName = compressed.name.replace(/[^\w.-]+/g, '_');
    const path = `${uid}/${Date.now()}-${safeName}`;

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, compressed, { upsert: true });
    if (upErr) {
      console.error('[gallery] storage upload', upErr);
      toast.error(upErr.message || '上传存储失败');
      return;
    }

    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const defaultLayout = {
      version: 1,
      elements: [
        {
          id: crypto.randomUUID(),
          src: publicUrl,
          xPct: 5,
          yPct: 5,
          wPct: 90,
          hPct: 90,
          zIndex: 1,
          rotation: 0,
        },
      ],
    };

    const { error: insErr } = await supabase
      .from('images')
      .insert({
        user_id: uid,
        storage_path: path,
        public_url: publicUrl,
        title: safeName,
        tags,
        layout: defaultLayout,
        file_size_bytes: compressed.size,
        is_public: true,
        gallery_category: GALLERY_CATEGORY_SINGLE,
        source_image_id: null,
      })
      .select()
      .single();

    if (insErr) {
      console.error('[gallery] insert image', insErr);
      toast.error(insErr.message || '写入数据库失败');
      return;
    }

    toast.success('上传成功（已归入单图）');
    await loadImages();
  } catch (e) {
    console.error('[gallery] upload flow', e);
    toast.error('上传流程异常');
  } finally {
    uploading.value = false;
  }
}

watch(galleryTab, function onTabChange() {
  loadImages();
});

onMounted(function galleryMounted() {
  loadImages();
});
</script>
