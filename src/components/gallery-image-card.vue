<template>
  <article
    class="mb-4 break-inside-avoid rounded-lg border border-slate-800 bg-slate-900/80 shadow-lg"
  >
    <template v-if="isCollage">
      <div class="relative block">
        <img
          v-if="image.public_url"
          :src="image.public_url"
          :alt="image.title || '拼团'"
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
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-white">{{ image.title || '拼团成品' }}</p>
            <p class="mt-1 line-clamp-2 text-xs text-slate-400">
              {{ (image.tags || []).join(' · ') || '栅格拼图导出' }}
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
            :aria-pressed="likedByMe"
            @click.stop="emitToggleLike"
          >
            <span class="text-rose-400">{{ likedByMe ? '♥' : '♡' }}</span>
            <span class="ml-1 tabular-nums text-slate-400">{{ likesCount }}</span>
          </button>
        </div>
        <RouterLink
          v-if="image.source_image_id"
          class="mt-2 inline-block text-sm text-sky-400 hover:text-sky-300"
          :to="`/editor/${image.source_image_id}`"
        >
          继续编辑原稿
        </RouterLink>
      </div>
    </template>
    <div v-else class="block">
      <RouterLink :to="`/editor/${image.id}`" class="block">
        <div class="relative">
          <img
            v-if="image.public_url"
            :src="image.public_url"
            :alt="image.title || 'gallery'"
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
          <p class="truncate font-medium text-white">{{ image.title || '未命名' }}</p>
          <p class="mt-1 line-clamp-2 text-xs text-slate-400">
            {{ (image.tags || []).join(' · ') || '暂无标签' }}
          </p>
        </div>
      </RouterLink>
      <div class="flex justify-end border-t border-slate-800 px-3 py-2">
        <button
          type="button"
          class="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
          :aria-pressed="likedByMe"
          @click="emitToggleLike"
        >
          <span class="text-rose-400">{{ likedByMe ? '♥' : '♡' }}</span>
          <span class="ml-1 tabular-nums text-slate-400">{{ likesCount }}</span>
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ImageRow } from '@/types/database';

const props = defineProps<{
  image: ImageRow;
  isCollage: boolean;
  likedByMe: boolean;
}>();

const emit = defineEmits<{
  'toggle-like': [image: ImageRow];
}>();

const likesCount = computed(function likesCountComputed() {
  return props.image.likes_count ?? 0;
});

function emitToggleLike() {
  emit('toggle-like', props.image);
}
</script>
