<template>
  <article
    class="mb-4 break-inside-avoid rounded-lg border border-slate-800 bg-slate-900/80 shadow-lg"
  >
    <template v-if="isCollage">
      <div class="flex gap-0">
        <label
          v-if="isOwner && !inTrash"
          class="flex shrink-0 cursor-pointer items-start border-r border-slate-800 bg-slate-900/90 p-2"
          title="勾选后加入视频导出顺序；批量删除模式下表示待移入回收站（同一勾选）"
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
                v-if="!inTrash"
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
              <button
                v-if="canSharePublic"
                type="button"
                class="text-sm text-emerald-400/90 hover:text-emerald-300"
                :disabled="deleting"
                @click.stop="onCopyShareLink"
              >
                复制分享链接
              </button>
              <a
                v-if="canSharePublic"
                :href="sharePageHref"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-slate-400 hover:text-slate-200"
                @click.stop
              >
                分享页
              </a>
              <RouterLink
                v-if="image.source_image_id && !inTrash"
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
                v-if="isOwner && !inTrash"
                type="button"
                class="text-sm text-amber-400/90 hover:text-amber-300"
                :disabled="deleting"
                @click.stop="emitEditTags"
              >
                编辑信息
              </button>
              <button
                v-if="isOwner && inTrash"
                type="button"
                class="text-sm text-sky-400/90 hover:text-sky-300"
                :disabled="deleting"
                @click.stop="emitRestoreImage"
              >
                恢复
              </button>
              <button
                v-if="isOwner && inTrash"
                type="button"
                class="text-sm text-rose-400/90 hover:text-rose-300"
                :disabled="deleting"
                @click.stop="emitPurgeImage"
              >
                彻底删除
              </button>
              <button
                v-if="isOwner && !inTrash"
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
          v-if="isOwner && !inTrash"
          class="flex shrink-0 cursor-pointer items-start border-r border-slate-800 bg-slate-900/90 p-2"
          title="勾选后加入视频导出顺序；批量删除模式下表示待移入回收站（同一勾选）"
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
          v-if="!inTrash"
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
        <div v-else class="min-w-0 flex-1">
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
        </div>
      </div>
      <div
        class="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 px-3 py-2"
      >
        <div class="mr-auto flex flex-wrap gap-2">
          <button
            v-if="canSharePublic"
            type="button"
            class="rounded-md border border-emerald-800/60 px-2 py-1 text-xs text-emerald-400/90 hover:bg-slate-800"
            :disabled="deleting"
            @click="onCopyShareLink"
          >
            复制分享链接
          </button>
          <a
            v-if="canSharePublic"
            :href="sharePageHref"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800"
          >
            分享页
          </a>
          <button
            v-if="isOwner && !inTrash"
            type="button"
            class="rounded-md border border-slate-600 px-2 py-1 text-xs text-amber-400/90 hover:bg-slate-800"
            :disabled="deleting"
            @click="emitEditTags"
          >
            编辑信息
          </button>
          <button
            v-if="isOwner && inTrash"
            type="button"
            class="rounded-md border border-sky-800/60 px-2 py-1 text-xs text-sky-400/90 hover:bg-slate-800"
            :disabled="deleting"
            @click="emitRestoreImage"
          >
            恢复
          </button>
          <button
            v-if="isOwner && inTrash"
            type="button"
            class="rounded-md border border-rose-900/60 px-2 py-1 text-xs text-rose-400/90 hover:bg-slate-800"
            :disabled="deleting"
            @click="emitPurgeImage"
          >
            彻底删除
          </button>
          <button
            v-if="isOwner && !inTrash"
            type="button"
            class="rounded-md border border-rose-900/60 px-2 py-1 text-xs text-rose-400/90 hover:bg-slate-800"
            :disabled="deleting"
            @click="emitDeleteImage"
          >
            删除
          </button>
        </div>
        <button
          v-if="!inTrash"
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
  buildSharePosterUrl,
  EDITOR_ROUTE_QUERY_GALLERY_KIND,
  EDITOR_ROUTE_QUERY_PUZZLE_DRAFT,
  GALLERY_CATEGORY_SINGLE,
} from '@/data';
import type { ImageRow } from '@/types/database';
import { toast } from 'vue-sonner';

const props = defineProps<{
  image: ImageRow;
  isCollage: boolean;
  likedByMe: boolean;
  videoSelected: boolean;
  /** 自己的作品：可编辑标签、可勾选编入视频（他人公开图跨域无法绘制到 canvas） */
  isOwner: boolean;
  /** 回收站列表：不跳转编辑器、不分享、不点赞 */
  inTrash?: boolean;
  deleting: boolean;
}>();

const emit = defineEmits<{
  'toggle-like': [image: ImageRow];
  'toggle-video-select': [image: ImageRow];
  'edit-tags': [image: ImageRow];
  'delete-image': [image: ImageRow];
  'restore-image': [image: ImageRow];
  'purge-image': [image: ImageRow];
}>();

const likesCount = computed(function likesCountComputed() {
  return props.image.likes_count ?? 0;
});

const canSharePublic = computed(function canSharePublicComputed() {
  return Boolean(
    props.image.is_public && props.image.public_url && !props.inTrash && !props.image.deleted_at
  );
});

const sharePageHref = computed(function sharePageHrefComputed() {
  if (!canSharePublic.value) {
    return '#';
  }
  return buildSharePosterUrl(props.image.id);
});

function onCopyShareLink() {
  if (!canSharePublic.value) {
    return;
  }
  const href = buildSharePosterUrl(props.image.id);
  void navigator.clipboard.writeText(href).then(
    function onShareCopyOk() {
      toast.success('分享链接已复制');
    },
    function onShareCopyFail() {
      toast.error('复制失败，请手动复制浏览器地址');
    }
  );
}

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

function emitRestoreImage() {
  emit('restore-image', props.image);
}

function emitPurgeImage() {
  emit('purge-image', props.image);
}
</script>
