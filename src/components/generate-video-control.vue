<template>
  <div class="group relative inline-flex shrink-0">
    <button
      type="button"
      class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
      @click="wizardOpen = true"
    >
      生成视频
    </button>
    <!-- 悬停 / 键盘聚焦时展示说明（触屏可 Tab 聚焦按钮查看） -->
    <div
      class="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-72 -translate-x-1/2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-left text-xs leading-relaxed text-slate-300 shadow-xl group-hover:block group-focus-within:block"
      role="tooltip"
    >
      仅<strong class="text-slate-200">自己的作品</strong>可勾选。弹窗内可<strong class="text-slate-200"
        >增删片段、调顺序</strong
      >、改每段时长；配乐支持 <strong class="text-slate-200">Internet Archive</strong> 与本机文件。画廊勾选顺序会随时间轴同步。
    </div>
    <GenerateVideoWizardModal
      v-model:open="wizardOpen"
      :images="selectedImages"
      @update:video-order="emit('update:video-order', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import GenerateVideoWizardModal from '@/components/generate-video-wizard-modal.vue';
import type { ImageRow } from '@/types/database';

defineProps<{
  selectedImages: ImageRow[];
}>();

const emit = defineEmits<{
  'update:video-order': [orderedGalleryIds: string[]];
}>();

const wizardOpen = ref(false);
</script>
