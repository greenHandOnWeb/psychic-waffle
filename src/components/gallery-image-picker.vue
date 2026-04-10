<template>
  <TransitionRoot appear :show="modelValue" as="div">
    <Dialog class="fixed inset-0 z-[60]" @close="close">
      <TransitionChild
        as="div"
        class="fixed inset-0 bg-black/60"
        aria-hidden="true"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      />
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <TransitionChild
          as="div"
          class="w-full max-w-2xl"
          enter="ease-out duration-200"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="ease-in duration-150"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <div class="w-full max-w-2xl">
            <DialogPanel
              class="flex max-h-[85vh] w-full flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
            >
            <DialogTitle class="border-b border-slate-800 px-4 py-3 text-lg font-semibold text-white">
              从画廊选择图片
            </DialogTitle>
            <p v-if="!mineOnly" class="px-4 pt-2 text-xs text-slate-400">
              可选<strong class="text-slate-300">我的作品</strong>或<strong class="text-slate-300">公开作品</strong>（需有预览地址）。
            </p>
            <p v-else class="px-4 pt-2 text-xs text-slate-400">
              仅展示<strong class="text-slate-300">我的作品</strong>（导出视频需可绘制到画布）。
            </p>
            <div v-if="!mineOnly" class="border-b border-slate-800 px-4 py-2">
              <div class="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-sm">
                <button
                  v-for="tab in tabs"
                  :key="tab.value"
                  type="button"
                  class="rounded-md px-3 py-1.5 font-medium transition-colors"
                  :class="
                    activeTab === tab.value
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  "
                  @click="setTab(tab.value)"
                >
                  {{ tab.label }}
                </button>
              </div>
            </div>
            <div class="min-h-[200px] flex-1 overflow-y-auto p-4">
              <div v-if="loading" class="py-12 text-center text-slate-400">加载中…</div>
              <div
                v-else-if="!items.length"
                class="py-12 text-center text-sm text-slate-500"
              >
                暂无可用图片
              </div>
              <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <button
                  v-for="img in items"
                  :key="img.id"
                  type="button"
                  class="group overflow-hidden rounded-lg border border-slate-700 bg-slate-800/80 text-left ring-sky-500 transition hover:border-sky-500/80 focus:outline-none focus:ring-2"
                  @click="onPick(img)"
                >
                  <div class="relative aspect-square bg-slate-900">
                    <img
                      v-if="img.public_url"
                      :src="img.public_url"
                      :alt="img.title || ''"
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <span
                      v-if="isCollage(img)"
                      class="absolute right-1 top-1 rounded bg-violet-600/95 px-1.5 py-0.5 text-[10px] font-medium text-white"
                    >
                      拼图
                    </span>
                    <span
                      v-else
                      class="absolute right-1 top-1 rounded bg-sky-600/95 px-1.5 py-0.5 text-[10px] font-medium text-white"
                    >
                      单图
                    </span>
                  </div>
                  <p class="truncate px-2 py-1.5 text-xs text-slate-300 group-hover:text-white">
                    {{ img.title || '未命名' }}
                  </p>
                </button>
              </div>
            </div>
            <div class="border-t border-slate-800 p-3">
              <button
                type="button"
                class="w-full rounded-lg border border-slate-600 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                @click="close"
              >
                取消
              </button>
            </div>
            </DialogPanel>
          </div>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { supabase } from '@/lib/supabase';
import {
  GALLERY_CATEGORY_COLLAGE,
  GALLERY_CATEGORY_SINGLE,
} from '@/data';
import type { ImageRow } from '@/types/database';
import { useSessionStore } from '@/stores/session';

type PickerTab = 'mine' | 'public';

const props = defineProps<{
  modelValue: boolean;
  /** 为 true 时只加载当前用户作品，不展示「公开」标签 */
  mineOnly?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  pick: [row: ImageRow];
}>();

const tabs: { value: PickerTab; label: string }[] = [
  { value: 'mine', label: '我的' },
  { value: 'public', label: '公开' },
];

const sessionStore = useSessionStore();
const activeTab = ref<PickerTab>('mine');
const loading = ref(false);
const items = ref<ImageRow[]>([]);

function close() {
  emit('update:modelValue', false);
}

function isCollage(img: ImageRow): boolean {
  return (img.gallery_category ?? GALLERY_CATEGORY_SINGLE) === GALLERY_CATEGORY_COLLAGE;
}

function setTab(value: PickerTab) {
  activeTab.value = value;
  loadItems();
}

function onPick(img: ImageRow) {
  if (!img.public_url) {
    toast.error('该作品无预览地址，无法插入画布');
    return;
  }
  emit('pick', img);
  emit('update:modelValue', false);
}

async function loadItems() {
  loading.value = true;
  items.value = [];
  const uid = sessionStore.userId;
  const tab = props.mineOnly ? 'mine' : activeTab.value;
  if (tab === 'mine' && !uid) {
    loading.value = false;
    toast.error('请先等待会话初始化');
    return;
  }
  let q = supabase.from('images').select('*').order('created_at', { ascending: false });
  if (tab === 'mine') {
    q = q.eq('user_id', uid as string);
  } else {
    q = q.eq('is_public', true);
  }
  const { data, error } = await q;
  if (error) {
    console.error('[gallery-image-picker]', error);
    toast.error(error.message || '加载失败');
    loading.value = false;
    return;
  }
  const rows = (data as ImageRow[]) ?? [];
  items.value = rows.filter(function hasPreview(r) {
    return Boolean(r.public_url);
  });
  loading.value = false;
}

watch(
  function watchOpen() {
    return props.modelValue;
  },
  function onOpenChange(open) {
    if (open) {
      activeTab.value = 'mine';
      loadItems();
    }
  }
);
</script>
