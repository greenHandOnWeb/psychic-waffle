<template>
  <article
    class="mb-4 break-inside-avoid rounded-lg border border-slate-800 bg-slate-900/80 shadow-lg"
  >
    <template v-if="isCollage">
      <div class="flex gap-0">
        <label
          v-if="isOwner"
          class="flex shrink-0 cursor-pointer items-start border-r border-slate-800 bg-slate-900/90 p-2"
          title="勾选后加入视频导出顺序；批量删除模式下表示待删除（同一勾选）"
          @click.stop
        >
          <input
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
            :checked="videoSelected"
            :disabled="deleting"
            @change="emitToggleVideoSelect"
          />
        </label>
        <div class="relative min-w-0 flex-1">
          <div class="relative block">
            <img
              v-if="image.public_url"
              :src="image.public_url"
              :alt="image.title || '拼图'"
              class="w-full rounded-tr-lg object-cover"
              loading="lazy"
            />
            <div
              v-else
              class="flex h-40 items-center justify-center rounded-tr-lg bg-slate-800 text-slate-500"
            >
              无预览
            </div>
            <span
              class="absolute right-2 top-2 rounded bg-violet-600/95 px-2 py-0.5 text-xs font-medium text-white shadow"
            >
              拼图
            </span>
          </div>
          <div class="p-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-white">{{ image.title || '拼图成品' }}</p>
                <p class="mt-1 line-clamp-2 text-xs text-slate-400">
                  {{ (image.tags || []).join(' · ') || '栅格拼图导出' }}
                </p>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                :aria-pressed="likedByMe"
                :disabled="deleting"
                @click.stop="emitToggleLike"
              >
                <span class="text-rose-400">{{ likedByMe ? '♥' : '♡' }}</span>
                <span class="ml-1 tabular-nums text-slate-400">{{ likesCount }}</span>
              </button>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <RouterLink
                v-if="image.source_image_id"
                class="text-sm text-sky-400 hover:text-sky-300"
                :to="{
                  path: `/editor/${image.source_image_id}`,
                  query: { [EDITOR_ROUTE_QUERY_PUZZLE_DRAFT]: '1' },
                }"
                @click.stop
              >
                继续编辑原稿
              </RouterLink>
              <button
                v-if="isOwner"
                type="button"
                class="text-sm text-amber-400/90 hover:text-amber-300"
                :disabled="deleting"
                @click.stop="emitEditTags"
              >
                编辑信息
              </button>
              <button
                v-if="isOwner"
                type="button"
                class="text-sm text-rose-400/90 hover:text-rose-300"
                :disabled="deleting"
                @click.stop="emitDeleteImage"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="block">
      <div class="flex gap-0">
        <label
          v-if="isOwner"
          class="flex shrink-0 cursor-pointer items-start border-r border-slate-800 bg-slate-900/90 p-2"
          title="勾选后加入视频导出顺序；批量删除模式下表示待删除（同一勾选）"
          @click.stop
        >
          <input
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
            :checked="videoSelected"
            :disabled="deleting"
            @change="emitToggleVideoSelect"
          />
        </label>
        <RouterLink
          class="min-w-0 flex-1"
          :to="{
            path: `/editor/${image.id}`,
            query: { [EDITOR_ROUTE_QUERY_GALLERY_KIND]: GALLERY_CATEGORY_SINGLE },
          }"
        >
          <div class="relative block">
            <img
              v-if="image.public_url"
              :src="image.public_url"
              :alt="image.title || 'gallery'"
              class="w-full rounded-tr-lg object-cover"
              loading="lazy"
            />
            <div
              v-else
              class="flex h-40 items-center justify-center rounded-tr-lg bg-slate-800 text-slate-500"
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
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 px-3 py-2">
        <div v-if="isOwner" class="mr-auto flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-600 px-2 py-1 text-xs text-amber-400/90 hover:bg-slate-800"
            :disabled="deleting"
            @click="emitEditTags"
          >
            编辑信息
          </button>
          <button
            type="button"
            class="rounded-md border border-rose-900/60 px-2 py-1 text-xs text-rose-400/90 hover:bg-slate-800"
            :disabled="deleting"
            @click="emitDeleteImage"
          >
            删除
          </button>
        </div>
        <button
          type="button"
          class="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
          :aria-pressed="likedByMe"
          :disabled="deleting"
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
import {
  EDITOR_ROUTE_QUERY_GALLERY_KIND,
  EDITOR_ROUTE_QUERY_PUZZLE_DRAFT,
  GALLERY_CATEGORY_SINGLE,
} from '@/data';
import type { ImageRow } from '@/types/database';

const props = defineProps<{
  image: ImageRow;
  isCollage: boolean;
  likedByMe: boolean;
  videoSelected: boolean;
  /** 自己的作品：可编辑标签、可勾选编入视频（他人公开图跨域无法绘制到 canvas） */
  isOwner: boolean;
  deleting: boolean;
}>();

const emit = defineEmits<{
  'toggle-like': [image: ImageRow];
  'toggle-video-select': [image: ImageRow];
  'edit-tags': [image: ImageRow];
  'delete-image': [image: ImageRow];
}>();

const likesCount = computed(function likesCountComputed() {
  return props.image.likes_count ?? 0;
});

function emitToggleLike() {
  emit('toggle-like', props.image);
}

function emitToggleVideoSelect() {
  emit('toggle-video-select', props.image);
}

function emitEditTags() {
  emit('edit-tags', props.image);
}

function emitDeleteImage() {
  emit('delete-image', props.image);
}
</script>
