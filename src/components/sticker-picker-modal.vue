<template>
  <TransitionRoot appear :show="modelValue" as="div" class="contents">
    <Dialog class="relative z-50" @close="close">
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
          class="w-full max-w-lg"
          enter="ease-out duration-200"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="ease-in duration-150"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <div class="w-full max-w-lg">
            <DialogPanel
              class="flex max-h-[88vh] w-full flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
            >
            <DialogTitle class="border-b border-slate-800 px-4 py-3 text-lg font-semibold text-white">
              添加表情包
            </DialogTitle>
            <div class="border-b border-slate-800 px-2 py-2">
              <div class="inline-flex w-full flex-wrap rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-sm">
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

            <div class="min-h-[240px] flex-1 overflow-y-auto p-3">
              <div v-if="activeTab === 'twemoji'" class="grid grid-cols-8 gap-2 sm:grid-cols-9">
                <button
                  v-for="code in COMMON_TWEMOJI_CODES"
                  :key="code"
                  type="button"
                  class="flex aspect-square items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 p-1 hover:border-pink-500/80 hover:bg-slate-800"
                  :title="code"
                  @click="pickTwemoji(code)"
                >
                  <span
                    class="pointer-events-none text-[1.65rem] leading-none"
                    role="img"
                    :aria-label="'emoji-' + code"
                    >{{ twemojiHexToEmojiChar(code) }}</span
                  >
                </button>
              </div>

              <div v-else-if="activeTab === 'kaomoji'" class="flex flex-col gap-2">
                <button
                  v-for="(k, i) in COMMON_KAOMOJI"
                  :key="i"
                  type="button"
                  class="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-left text-sm text-slate-200 hover:border-pink-500/60"
                  @click="pickKaomoji(k)"
                >
                  {{ k }}
                </button>
              </div>

              <div v-else-if="activeTab === 'search'" class="space-y-3">
                <p
                  v-if="!pixabayReady"
                  class="rounded border border-amber-800/50 bg-amber-950/40 px-3 py-2 text-xs leading-relaxed text-amber-200"
                >
                  未配置 Pixabay Key。可在顶部导航进入<strong class="text-amber-100">设置</strong>页填写（会保存在本机），或在
                  <code class="text-amber-100">.env</code> 中设置
                  <code class="text-amber-100">VITE_PIXABAY_API_KEY</code>（需重启 dev）。免费申请见
                  <a
                    class="underline"
                    href="https://pixabay.com/api/docs/"
                    target="_blank"
                    rel="noopener noreferrer"
                    >Pixabay API</a
                  >
                  （插图搜索，适合贴图；结果需遵守 Pixabay 许可说明）。
                </p>
                <div class="flex flex-wrap gap-2">
                  <input
                    v-model="searchQuery"
                    type="search"
                    placeholder="搜索插图关键词，如：猫、卡通、爱心"
                    class="min-w-[200px] flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                    @keydown.enter="runSearch"
                  />
                  <button
                    type="button"
                    class="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500 disabled:opacity-50"
                    :disabled="searchLoading || !pixabayReady"
                    @click="runSearch"
                  >
                    搜索
                  </button>
                </div>
                <div v-if="searchLoading" class="py-8 text-center text-sm text-slate-400">搜索中…</div>
                <div
                  v-else-if="searchError"
                  class="rounded border border-rose-800/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-200"
                >
                  {{ searchError }}
                </div>
                <div v-else-if="searchResults.length" class="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  <button
                    v-for="(hit, idx) in searchResults"
                    :key="idx"
                    type="button"
                    class="overflow-hidden rounded-lg border border-slate-700 bg-slate-800/80 hover:border-pink-500/80"
                    :title="hit.title"
                    @click="pickSearchHit(hit.url)"
                  >
                    <img
                      :src="hit.url"
                      :alt="hit.title"
                      class="h-20 w-full object-contain p-1"
                      loading="lazy"
                    />
                  </button>
                </div>
                <p v-else-if="pixabayReady && searchAttempted" class="text-center text-sm text-slate-500">
                  没有结果，换个词试试
                </p>
              </div>

              <div v-else class="space-y-3 text-center">
                <p class="text-sm text-slate-400">从本机选择一张图片作为表情包（支持动图）</p>
                <button
                  type="button"
                  class="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500"
                  @click="triggerLocalPick"
                >
                  选择文件
                </button>
                <input
                  ref="localFileRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="onLocalFile"
                />
              </div>
            </div>

            <div class="border-t border-slate-800 p-3">
              <button
                type="button"
                class="w-full rounded-lg border border-slate-600 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                @click="close"
              >
                关闭
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
import { computed, ref, watch } from 'vue';
import {
  COMMON_KAOMOJI,
  COMMON_TWEMOJI_CODES,
  twemojiAssetUrl,
  twemojiHexToEmojiChar,
} from '@/data/stickers-common';
import { searchPixabayStickers, resolvePixabayApiKey } from '@/services/pixabay-stickers';
import type { PixabayStickerHit } from '@/services/pixabay-stickers';
import { useRuntimeSettingsStore } from '@/stores/runtime-settings';

type Tab = 'twemoji' | 'kaomoji' | 'search' | 'local';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'pick-url': [url: string];
  'pick-kaomoji': [text: string];
  'pick-file': [file: File];
}>();

const tabs: { value: Tab; label: string }[] = [
  { value: 'twemoji', label: '常用贴纸' },
  { value: 'kaomoji', label: '颜文字' },
  { value: 'search', label: '联网搜索' },
  { value: 'local', label: '本机图片' },
];

const activeTab = ref<Tab>('twemoji');
const localFileRef = ref<HTMLInputElement | null>(null);
const searchQuery = ref('');
const searchLoading = ref(false);
const searchError = ref('');
const searchResults = ref<PixabayStickerHit[]>([]);
const searchAttempted = ref(false);
const runtimeSettings = useRuntimeSettingsStore();
const pixabayReady = computed(function pixabayReadyComputed() {
  return resolvePixabayApiKey(runtimeSettings.pixabayApiKey).length > 0;
});

function close() {
  emit('update:modelValue', false);
}

function setTab(value: Tab) {
  activeTab.value = value;
  if (value === 'search') {
    searchError.value = '';
  }
}

function pickTwemoji(code: string) {
  emit('pick-url', twemojiAssetUrl(code));
  close();
}

function pickKaomoji(text: string) {
  emit('pick-kaomoji', text);
  close();
}

function pickSearchHit(url: string) {
  emit('pick-url', url);
  close();
}

function triggerLocalPick() {
  localFileRef.value?.click();
}

function onLocalFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) {
    return;
  }
  emit('pick-file', file);
  close();
}

async function runSearch() {
  if (!pixabayReady.value) {
    return;
  }
  searchLoading.value = true;
  searchError.value = '';
  searchAttempted.value = true;
  searchResults.value = [];
  try {
    searchResults.value = await searchPixabayStickers(searchQuery.value, 24, runtimeSettings.pixabayApiKey);
  } catch (e) {
    console.error('[sticker-picker] pixabay', e);
    searchError.value = e instanceof Error ? e.message : '搜索失败';
  } finally {
    searchLoading.value = false;
  }
}

watch(
  function watchStickerOpen() {
    return props.modelValue;
  },
  function onStickerOpen(open) {
    if (open) {
      activeTab.value = 'twemoji';
      searchQuery.value = '';
      searchResults.value = [];
      searchError.value = '';
      searchAttempted.value = false;
    }
  }
);
</script>
