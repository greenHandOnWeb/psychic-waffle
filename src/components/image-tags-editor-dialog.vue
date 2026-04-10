<template>
  <TransitionRoot appear :show="open" as="div" class="contents">
    <Dialog class="relative z-50" @close="onClose">
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
              class="flex w-full flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
            >
            <DialogTitle class="border-b border-slate-800 px-4 py-3 text-lg font-semibold text-white">
              编辑作品信息
            </DialogTitle>
            <div class="space-y-3 p-4">
              <label class="block">
                <span class="mb-1 block text-xs text-slate-400">名称（最多 {{ titleMaxLen }} 字）</span>
                <input
                  v-model="titleDraft"
                  type="text"
                  :maxlength="titleMaxLen"
                  class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="未命名"
                />
              </label>
              <p class="text-xs text-slate-400">
                标签：使用逗号、空格或分号分隔；最多 {{ maxTags }} 个。保存后会影响画廊筛选与公开标签统计。
              </p>
              <textarea
                v-model="draft"
                rows="4"
                class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="例如：旅行, 人像, 壁纸"
              />
            </div>
            <div class="flex justify-end gap-2 border-t border-slate-800 px-4 py-3">
              <button
                type="button"
                class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                :disabled="saving"
                @click="onClose"
              >
                取消
              </button>
              <button
                type="button"
                class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
                :disabled="saving"
                @click="onSave"
              >
                {{ saving ? '保存中…' : '保存' }}
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
import { ref, watch } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { toast } from 'vue-sonner';
import { IMAGE_TITLE_MAX_LENGTH, MAX_IMAGE_TAGS } from '@/data';
import { supabase } from '@/lib/supabase';
import type { ImageRow } from '@/types/database';
import { mergeUniqueTagGroups, parseTagsInput } from '@/utils/parse-tags';

const props = defineProps<{
  open: boolean;
  image: ImageRow | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [payload: { id: string; tags: string[]; title: string | null }];
}>();

const draft = ref('');
const titleDraft = ref('');
const saving = ref(false);
const maxTags = MAX_IMAGE_TAGS;
const titleMaxLen = IMAGE_TITLE_MAX_LENGTH;

watch(
  function watchDeps() {
    return { open: props.open, image: props.image };
  },
  function syncDraft(state) {
    if (state.open && state.image) {
      draft.value = (state.image.tags || []).join(', ');
      titleDraft.value = state.image.title ?? '';
    }
    if (!state.open) {
      saving.value = false;
    }
  },
  { deep: true }
);

function onClose() {
  emit('close');
}

async function onSave() {
  if (!props.image || saving.value) {
    return;
  }
  const parsed = parseTagsInput(draft.value);
  const merged = mergeUniqueTagGroups([parsed]);
  const rawTitle = titleDraft.value.trim();
  const nextTitle =
    rawTitle.length > IMAGE_TITLE_MAX_LENGTH ? rawTitle.slice(0, IMAGE_TITLE_MAX_LENGTH) : rawTitle;
  const titleForDb = nextTitle.length ? nextTitle : null;
  saving.value = true;
  try {
    const { data, error } = await supabase
      .from('images')
      .update({ tags: merged, title: titleForDb })
      .eq('id', props.image.id)
      .select()
      .single();
    if (error) {
      console.error('[image-tags-editor]', error);
      toast.error(error.message || '保存失败');
      return;
    }
    const row = data as ImageRow;
    emit('saved', { id: row.id, tags: row.tags ?? merged, title: row.title ?? titleForDb });
    toast.success('已保存');
    emit('close');
  } catch (e) {
    console.error('[image-tags-editor]', e);
    toast.error(e instanceof Error ? e.message : '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>
