<template>
  <div class="space-y-8">
    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 class="mb-2 text-lg font-medium text-white">上传图片</h2>
      <p class="mb-4 text-sm text-slate-400">
        上传的素材会进入<strong class="text-slate-200">单图画廊</strong
        >，可进入编辑器排版；在编辑器中「保存并生成拼图」后，成品出现在<strong
          class="text-slate-200"
          >拼图画廊</strong
        >。
      </p>
      <label class="mb-3 block text-sm text-slate-400">
        <span class="mb-1 block text-xs"
          >自定义标签（可选，逗号或空格分隔，将与 AI 猜标合并去重）</span
        >
        <input
          v-model="uploadTagsRaw"
          type="text"
          class="mt-1 w-full max-w-xl rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="例如：旅行, 壁纸"
          :disabled="uploading"
        />
      </label>
      <div class="flex flex-wrap items-center gap-3">
        <label
          class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          <input
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            :disabled="uploading"
            @change="onPickFile"
          />
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
            v-for="tab in galleryTabsVisible"
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
        <button
          v-if="galleryTab === 'trash' && sessionStore.userId && images.length && !loading"
          type="button"
          class="rounded-lg border border-rose-900/70 bg-rose-950/30 px-3 py-1.5 text-sm text-rose-200 hover:bg-rose-950/50 disabled:opacity-50"
          :disabled="deleting"
          @click="onEmptyTrashConfirm"
        >
          清空回收站
        </button>
      </div>

      <div
        v-show="galleryTab !== 'trash'"
        class="mb-4 flex flex-wrap items-end justify-between gap-4"
      >
        <GalleryTagFilter
          v-model="selectedTagFilters"
          class="min-w-0 flex-1"
          :tags="distinctTags"
        />
        <div class="flex flex-wrap items-center gap-2">
          <template v-if="sessionStore.userId">
            <button
              type="button"
              class="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              :disabled="deleting"
              @click="bulkDeleteMode = !bulkDeleteMode"
            >
              {{ bulkDeleteMode ? '退出批量删除' : '批量删除' }}
            </button>
            <button
              v-if="bulkDeleteMode && selectedForVideoIds.length"
              type="button"
              class="rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2 text-sm text-rose-200 hover:bg-rose-950/60 disabled:opacity-50"
              :disabled="deleting"
              @click="onBulkSoftDeleteConfirm"
            >
              移入回收站（{{ selectedForVideoIds.length }}）
            </button>
          </template>
          <GenerateVideoControl
            :selected-images="selectedVideoImages"
            @update:video-order="onWizardVideoOrder"
          />
        </div>
      </div>

      <div v-if="loading" class="text-slate-400">加载中…</div>
      <div v-else class="columns-1 gap-4 sm:columns-2 lg:columns-3" style="column-fill: balance">
        <GalleryImageCard
          v-for="img in images"
          :key="img.id"
          :image="img"
          :is-collage="isCollageItem(img)"
          :liked-by-me="Boolean(likedByMeMap[img.id])"
          :video-selected="selectedForVideoIds.includes(img.id)"
          :is-owner="Boolean(sessionStore.userId && sessionStore.userId === img.user_id)"
          :in-trash="galleryTab === 'trash'"
          :deleting="deleting"
          @toggle-like="onToggleLike"
          @toggle-video-select="toggleVideoSelect"
          @edit-tags="openTagEditor"
          @delete-image="onSoftDeleteOneImage"
          @restore-image="onRestoreOneImage"
          @purge-image="onPurgeOneImage"
        />
      </div>
      <p v-if="!loading && !images.length" class="text-slate-500">
        {{ emptyHint }}
      </p>
    </section>

    <ImageTagsEditorDialog
      :open="tagsEditorImage !== null"
      :image="tagsEditorImage"
      @close="tagsEditorImage = null"
      @saved="onImageTagsSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import GalleryImageCard from '@/components/gallery-image-card.vue';
import GalleryTagFilter from '@/components/gallery-tag-filter.vue';
import GenerateVideoControl from '@/components/generate-video-control.vue';
import ImageTagsEditorDialog from '@/components/image-tags-editor-dialog.vue';
import { fetchGalleryDistinctTags } from '@/composables/useGalleryTags';
import { toggleImageLikeRpc } from '@/composables/useLikes';
import { getWriterUserId, supabase } from '@/lib/supabase';
import {
  GALLERY_CATEGORY_COLLAGE,
  GALLERY_CATEGORY_SINGLE,
  GALLERY_PURGE_ONE_CONFIRM,
  GALLERY_PURGE_TRASH_CONFIRM,
  GALLERY_RESTORE_ONE_CONFIRM,
  GALLERY_SOFT_DELETE_BATCH_CONFIRM,
  GALLERY_SOFT_DELETE_ONE_CONFIRM,
  GALLERY_TAG_FILTER_DEBOUNCE_MS,
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
import { mergeUniqueTagGroups, parseTagsInput } from '@/utils/parse-tags';

type GalleryTab = 'all' | 'single' | 'collage' | 'trash';

const galleryTabsBase: { value: GalleryTab; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'single', label: '单图' },
  { value: 'collage', label: '拼图' },
];

const galleryTabsVisible = computed(function galleryTabsVisibleComputed() {
  const uid = sessionStore.userId;
  const out = galleryTabsBase.slice();
  if (uid) {
    out.push({ value: 'trash', label: '回收站' });
  }
  return out;
});

const images = ref<ImageRow[]>([]);
const loading = ref(true);
const uploading = ref(false);
const galleryTab = ref<GalleryTab>('all');
const distinctTags = ref<string[]>([]);
const selectedTagFilters = ref<string[]>([]);
const likedByMeMap = ref<Record<string, boolean>>({});
const sessionStore = useSessionStore();
/** 勾选顺序即视频中图片顺序 */
const selectedForVideoIds = ref<string[]>([]);
const tagsEditorImage = ref<ImageRow | null>(null);
const uploadTagsRaw = ref('');
/** 批量删除：与导出视频共用同一组勾选（selectedForVideoIds） */
const bulkDeleteMode = ref(false);
const deleting = ref(false);

function isCollageItem(img: ImageRow): boolean {
  return (img.gallery_category ?? GALLERY_CATEGORY_SINGLE) === GALLERY_CATEGORY_COLLAGE;
}

const emptyHint = computed(function emptyHintComputed() {
  if (galleryTab.value === 'trash') {
    return '回收站为空。';
  }
  if (galleryTab.value === 'single') {
    return '暂无单图素材，请先上传。';
  }
  if (galleryTab.value === 'collage') {
    return '暂无拼图成品，请在编辑器中点击「保存并生成拼图」。';
  }
  return '暂无作品，先上传一张单图吧。';
});

function setGalleryTab(value: GalleryTab) {
  galleryTab.value = value;
}

const selectedVideoImages = computed(function selectedVideoImagesComputed() {
  const order = selectedForVideoIds.value;
  const list = images.value;
  const map = new Map(
    list.map(function toMapEntry(r) {
      return [r.id, r] as const;
    })
  );
  const out: ImageRow[] = [];
  for (let i = 0; i < order.length; i++) {
    const row = map.get(order[i]);
    if (row) {
      out.push(row);
    }
  }
  return out;
});

function pruneVideoSelection() {
  const uid = sessionStore.userId;
  if (!uid) {
    selectedForVideoIds.value = [];
    return;
  }
  const allowed = new Set(
    images.value
      .filter(function owned(r) {
        return r.user_id === uid;
      })
      .map(function idOnly(r) {
        return r.id;
      })
  );
  selectedForVideoIds.value = selectedForVideoIds.value.filter(function keep(id) {
    return allowed.has(id);
  });
}

function onWizardVideoOrder(orderedGalleryIds: string[]) {
  selectedForVideoIds.value = orderedGalleryIds.slice();
}

function toggleVideoSelect(img: ImageRow) {
  const uid = sessionStore.userId;
  if (!uid || img.user_id !== uid) {
    return;
  }
  const id = img.id;
  const cur = selectedForVideoIds.value;
  const idx = cur.indexOf(id);
  if (idx >= 0) {
    selectedForVideoIds.value = cur.filter(function notId(x) {
      return x !== id;
    });
  } else {
    selectedForVideoIds.value = cur.concat([id]);
  }
}

function onSoftDeleteOneImage(img: ImageRow) {
  if (deleting.value) {
    return;
  }
  const uid = sessionStore.userId;
  if (!uid || img.user_id !== uid) {
    return;
  }
  const label = (img.title || '未命名').trim() || '未命名';
  const msg = GALLERY_SOFT_DELETE_ONE_CONFIRM.replace('{title}', label);
  if (!window.confirm(msg)) {
    return;
  }
  void runSoftDeleteImages([img.id]);
}

function onRestoreOneImage(img: ImageRow) {
  if (deleting.value) {
    return;
  }
  const uid = sessionStore.userId;
  if (!uid || img.user_id !== uid) {
    return;
  }
  const label = (img.title || '未命名').trim() || '未命名';
  const msg = GALLERY_RESTORE_ONE_CONFIRM.replace('{title}', label);
  if (!window.confirm(msg)) {
    return;
  }
  void runRestoreImages([img.id]);
}

function onPurgeOneImage(img: ImageRow) {
  if (deleting.value) {
    return;
  }
  const uid = sessionStore.userId;
  if (!uid || img.user_id !== uid) {
    return;
  }
  const label = (img.title || '未命名').trim() || '未命名';
  const msg = GALLERY_PURGE_ONE_CONFIRM.replace('{title}', label);
  if (!window.confirm(msg)) {
    return;
  }
  void runPurgeImages([img.id]);
}

function onBulkSoftDeleteConfirm() {
  const ids = selectedForVideoIds.value.slice();
  if (!ids.length || deleting.value) {
    return;
  }
  const msg = GALLERY_SOFT_DELETE_BATCH_CONFIRM.replace('{n}', String(ids.length));
  if (!window.confirm(msg)) {
    return;
  }
  void runSoftDeleteImages(ids);
}

function onEmptyTrashConfirm() {
  const uid = sessionStore.userId;
  if (!uid || deleting.value || galleryTab.value !== 'trash') {
    return;
  }
  const rows = images.value.filter(function ownedTrash(r) {
    return r.user_id === uid && Boolean(r.deleted_at);
  });
  if (!rows.length) {
    return;
  }
  const msg = GALLERY_PURGE_TRASH_CONFIRM.replace('{n}', String(rows.length));
  if (!window.confirm(msg)) {
    return;
  }
  void runPurgeImages(
    rows.map(function rowIdOnly(r) {
      return r.id;
    })
  );
}

async function runSoftDeleteImages(ids: string[]) {
  const uid = sessionStore.userId;
  if (!uid || !ids.length || deleting.value) {
    return;
  }
  const idSet = new Set(ids);
  const rows = images.value.filter(function rowOwned(r) {
    return idSet.has(r.id) && r.user_id === uid;
  });
  if (!rows.length) {
    return;
  }
  const ownedIds = rows.map(function rowId(r) {
    return r.id;
  });
  const ts = new Date().toISOString();
  deleting.value = true;
  const { error } = await supabase
    .from('images')
    .update(Object.assign({}, { deleted_at: ts }))
    .in('id', ownedIds)
    .eq('user_id', uid);
  if (error) {
    console.error('[gallery] soft delete images', error);
    toast.error(error.message || '移入回收站失败');
    deleting.value = false;
    return;
  }
  selectedForVideoIds.value = selectedForVideoIds.value.filter(function keepVid(id) {
    return !idSet.has(id);
  });
  bulkDeleteMode.value = false;
  deleting.value = false;
  toast.success(ownedIds.length === 1 ? '已移入回收站' : `已移入回收站 ${ownedIds.length} 张`);
  void loadDistinctTags();
  void loadImages();
}

async function runRestoreImages(ids: string[]) {
  const uid = sessionStore.userId;
  if (!uid || !ids.length || deleting.value) {
    return;
  }
  const idSet = new Set(ids);
  deleting.value = true;
  const { error } = await supabase
    .from('images')
    .update(Object.assign({}, { deleted_at: null }))
    .in('id', [...idSet])
    .eq('user_id', uid);
  if (error) {
    console.error('[gallery] restore images', error);
    toast.error(error.message || '恢复失败');
    deleting.value = false;
    return;
  }
  deleting.value = false;
  toast.success(ids.length === 1 ? '已恢复' : `已恢复 ${ids.length} 张`);
  void loadDistinctTags();
  void loadImages();
}

async function runPurgeImages(ids: string[]) {
  const uid = sessionStore.userId;
  if (!uid || !ids.length || deleting.value) {
    return;
  }
  const idSet = new Set(ids);
  const rows = images.value.filter(function rowOwned(r) {
    return idSet.has(r.id) && r.user_id === uid;
  });
  if (!rows.length) {
    return;
  }
  const ownedIds = rows.map(function rowId(r) {
    return r.id;
  });
  const paths = rows
    .map(function rowPath(r) {
      return r.storage_path;
    })
    .filter(Boolean);
  deleting.value = true;
  const { error } = await supabase.from('images').delete().in('id', ownedIds).eq('user_id', uid);
  if (error) {
    console.error('[gallery] delete images', error);
    toast.error(error.message || '删除失败');
    deleting.value = false;
    return;
  }
  if (paths.length) {
    const { error: storageErr } = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
    if (storageErr) {
      console.error('[gallery] storage remove', storageErr);
      toast.error(storageErr.message || '存储中的文件删除失败');
    }
  }
  const removed = new Set(ownedIds);
  images.value = images.value.filter(function keepRow(r) {
    return !removed.has(r.id);
  });
  selectedForVideoIds.value = selectedForVideoIds.value.filter(function keepVid(id) {
    return !removed.has(id);
  });
  if (tagsEditorImage.value && removed.has(tagsEditorImage.value.id)) {
    tagsEditorImage.value = null;
  }
  const nextLiked = Object.assign({}, likedByMeMap.value);
  for (let i = 0; i < ownedIds.length; i++) {
    delete nextLiked[ownedIds[i]];
  }
  likedByMeMap.value = nextLiked;
  deleting.value = false;
  toast.success(ownedIds.length === 1 ? '已彻底删除' : `已彻底删除 ${ownedIds.length} 张`);
  void loadDistinctTags();
  void loadImages();
}

function openTagEditor(img: ImageRow) {
  tagsEditorImage.value = img;
}

function onImageTagsSaved(payload: { id: string; tags: string[]; title: string | null }) {
  const idx = images.value.findIndex(function byImageId(r) {
    return r.id === payload.id;
  });
  if (idx >= 0) {
    images.value[idx] = Object.assign({}, images.value[idx], {
      tags: payload.tags,
      title: payload.title,
    });
  }
  void loadDistinctTags();
}

async function hydrateLikesForRows(rows: ImageRow[]) {
  const uid = sessionStore.userId;
  if (!uid || !rows.length) {
    likedByMeMap.value = {};
    return;
  }
  const ids = rows.map(function idOf(r) {
    return r.id;
  });
  const { data, error } = await supabase
    .from('likes')
    .select('image_id')
    .eq('user_id', uid)
    .in('image_id', ids);
  if (error) {
    console.error('[gallery] load likes', error);
    likedByMeMap.value = {};
    return;
  }
  const map: Record<string, boolean> = {};
  const hitRows = (data ?? []) as { image_id: string }[];
  for (let i = 0; i < hitRows.length; i++) {
    map[hitRows[i].image_id] = true;
  }
  likedByMeMap.value = map;
}

async function loadDistinctTags() {
  try {
    distinctTags.value = await fetchGalleryDistinctTags();
  } catch (e) {
    console.error('[gallery] distinct tags', e);
    distinctTags.value = [];
    toast.error(e instanceof Error ? e.message : '加载标签失败');
  }
}

async function loadImages() {
  loading.value = true;
  try {
    const uid = sessionStore.userId;
    let q = supabase.from('images').select('*').order('created_at', { ascending: false });
    if (galleryTab.value === 'trash') {
      if (!uid) {
        images.value = [];
        likedByMeMap.value = {};
        return;
      }
      q = q.not('deleted_at', 'is', null).eq('user_id', uid);
    } else {
      q = q.is('deleted_at', null);
      if (galleryTab.value === 'single') {
        q = q.eq('gallery_category', GALLERY_CATEGORY_SINGLE);
      } else if (galleryTab.value === 'collage') {
        q = q.eq('gallery_category', GALLERY_CATEGORY_COLLAGE);
      }
      const tagList = selectedTagFilters.value
        .map(function trimTag(t) {
          return t.trim();
        })
        .filter(Boolean);
      if (tagList.length) {
        q = q.contains('tags', tagList);
      }
    }
    const { data, error } = await q;
    if (error) {
      console.error('[gallery] load images', error);
      toast.error(error.message || '加载画廊失败');
      return;
    }
    const rows = (data as ImageRow[]) ?? [];
    images.value = rows;
    await hydrateLikesForRows(rows);
    pruneVideoSelection();
  } catch (e) {
    console.error('[gallery] load images', e);
    toast.error('加载画廊失败');
  } finally {
    loading.value = false;
  }
}

async function onToggleLike(img: ImageRow) {
  const uid = sessionStore.userId;
  if (!uid) {
    toast.error('请先等待会话初始化');
    return;
  }
  const prevCount = img.likes_count ?? 0;
  const prevLiked = Boolean(likedByMeMap.value[img.id]);
  const optimisticLiked = !prevLiked;
  const optimisticCount = optimisticLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
  patchImageLikeState(img.id, optimisticCount, optimisticLiked);
  try {
    const res = await toggleImageLikeRpc(img.id);
    patchImageLikeState(img.id, res.likes_count, res.liked);
  } catch (e) {
    patchImageLikeState(img.id, prevCount, prevLiked);
    console.error('[gallery] toggle like', e);
    toast.error(e instanceof Error ? e.message : '点赞失败');
  }
}

function patchImageLikeState(imageId: string, likesCount: number, liked: boolean) {
  const idx = images.value.findIndex(function byId(r) {
    return r.id === imageId;
  });
  if (idx >= 0) {
    images.value[idx] = Object.assign({}, images.value[idx], { likes_count: likesCount });
  }
  const next = Object.assign({}, likedByMeMap.value);
  if (liked) {
    next[imageId] = true;
  } else {
    delete next[imageId];
  }
  likedByMeMap.value = next;
}

async function onPickFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (!files.length) {
    return;
  }
  for (let f = 0; f < files.length; f++) {
    try {
      assertWithinMaxUploadSize(files[f]);
    } catch (e) {
      if (e instanceof UploadTooLargeError) {
        toast.error(`${files[f].name}: ${e.message}`);
      } else {
        console.error(e);
        toast.error('文件校验失败');
      }
      return;
    }
  }

  uploading.value = true;
  let uid: string;
  try {
    uid = await getWriterUserId();
  } catch (e) {
    uploading.value = false;
    toast.error(e instanceof Error ? e.message : '会话初始化失败');
    return;
  }

  let ok = 0;
  let lastErr = '';
  const baseTs = Date.now();
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressed = await compressImageForUpload(file);
        const customTags = parseTagsInput(uploadTagsRaw.value);
        const aiTags = await generateMockTags(compressed);
        const tags = mergeUniqueTagGroups([customTags, aiTags]);
        const safeName = compressed.name.replace(/[^\w.-]+/g, '_');
        const path = `${uid}/${baseTs}-${i}-${safeName}`;

        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, compressed, { upsert: true });
        if (upErr) {
          console.error('[gallery] storage upload', upErr);
          lastErr = upErr.message || '上传存储失败';
          continue;
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
          lastErr = insErr.message || '写入数据库失败';
          continue;
        }
        ok++;
      } catch (rowErr) {
        console.error('[gallery] single file upload', rowErr);
        lastErr = rowErr instanceof Error ? rowErr.message : '单张处理失败';
      }
    }

    if (ok > 0) {
      uploadTagsRaw.value = '';
      toast.success(
        ok === files.length ? `已上传 ${ok} 张（单图）` : `已上传 ${ok}/${files.length} 张`
      );
      await loadDistinctTags();
      await loadImages();
    }
    if (ok < files.length && lastErr) {
      toast.error(lastErr);
    }
  } catch (e) {
    console.error('[gallery] upload flow', e);
    toast.error('上传流程异常');
  } finally {
    uploading.value = false;
  }
}

let tagFilterDebounceTimer = 0;

watch(galleryTab, function onTabChange(tab) {
  if (tab === 'trash') {
    selectedForVideoIds.value = [];
    bulkDeleteMode.value = false;
  }
  void loadImages();
});

watch(
  selectedTagFilters,
  function onTagFilterChange() {
    if (tagFilterDebounceTimer) {
      window.clearTimeout(tagFilterDebounceTimer);
    }
    tagFilterDebounceTimer = window.setTimeout(function runTagFilterLoad() {
      tagFilterDebounceTimer = 0;
      void loadImages();
    }, GALLERY_TAG_FILTER_DEBOUNCE_MS);
  },
  { deep: true }
);

watch(
  function sessionUserId() {
    return sessionStore.userId;
  },
  function onSessionUserChange(uid) {
    pruneVideoSelection();
    bulkDeleteMode.value = false;
    if (!uid && galleryTab.value === 'trash') {
      galleryTab.value = 'all';
    }
  }
);

onBeforeUnmount(function galleryUnmount() {
  if (tagFilterDebounceTimer) {
    window.clearTimeout(tagFilterDebounceTimer);
    tagFilterDebounceTimer = 0;
  }
});

onMounted(function galleryMounted() {
  void Promise.all([loadDistinctTags(), loadImages()]);
});
</script>
