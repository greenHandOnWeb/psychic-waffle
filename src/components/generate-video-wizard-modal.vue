<template>
  <TransitionRoot appear :show="open" as="div">
    <!-- Dialog 根节点须有非零尺寸，否则 @headlessui/vue 内 ResizeObserver 会误判并触发 close（增删时间轴片段时易复现） -->
    <Dialog class="fixed inset-0 z-50" @close="onVideoWizardDialogRequestClose">
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
      <div class="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <TransitionChild
          as="div"
          class="w-full max-w-4xl"
          enter="ease-out duration-200"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="ease-in duration-150"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <div class="w-full max-w-4xl">
            <DialogPanel
              class="my-4 flex max-h-[94vh] w-full flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
            >
            <DialogTitle class="border-b border-slate-800 px-4 py-3 text-lg font-semibold text-white">
              视频剪辑
            </DialogTitle>

            <div class="min-h-0 flex-1 overflow-y-auto p-4">
              <!-- 导出结果 -->
              <div v-if="exportVideoUrl" class="space-y-4">
                <video
                  :key="exportVideoObjectKey"
                  ref="exportVideoRef"
                  class="max-h-[52vh] w-full rounded-lg bg-black"
                  controls
                  playsinline
                  preload="auto"
                  :src="exportVideoUrl"
                  @loadeddata="onExportVideoLoaded"
                />
                <p class="text-xs text-slate-500">
                  时间轴合计约 <span class="tabular-nums text-slate-400">{{ formatTime(exportExpectedTotalSec) }}</span>（导出前快照）。导出为
                  {{ VIDEO_EXPORT_WIDTH }}×{{ VIDEO_EXPORT_HEIGHT }}；配乐时合并 VP8/Opus WebM 音轨（依赖浏览器）。若播放器显示的时长与上值不一致，多为 WebM
                  元数据偏差，请以实际播放进度为准。
                </p>
              </div>

              <!-- 时间轴 + 实时预览 -->
              <div v-else class="space-y-4">
                <div
                  class="relative overflow-hidden rounded-lg border border-slate-800 bg-black"
                  :style="{ aspectRatio: `${VIDEO_PREVIEW_CANVAS_WIDTH} / ${VIDEO_PREVIEW_CANVAS_HEIGHT}` }"
                >
                  <canvas
                    ref="previewCanvasRef"
                    class="block h-full w-full"
                    :width="VIDEO_PREVIEW_CANVAS_WIDTH"
                    :height="VIDEO_PREVIEW_CANVAS_HEIGHT"
                  />
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                    @click="togglePlayback"
                  >
                    {{ playing ? '暂停' : '播放' }}
                  </button>
                  <label class="flex min-w-[200px] flex-1 items-center gap-2 text-xs text-slate-400">
                    <span class="shrink-0 tabular-nums">{{ formatTime(playheadSec) }}</span>
                    <input
                      v-model.number="playheadSec"
                      type="range"
                      :min="0"
                      :max="Math.max(totalDuration, 0.01)"
                      step="0.05"
                      class="h-2 flex-1 accent-violet-500"
                      @input="onScrubPlayhead"
                    />
                    <span class="shrink-0 tabular-nums">{{ formatTime(totalDuration) }}</span>
                  </label>
                </div>

                <div>
                  <h3 class="mb-2 text-sm font-medium text-slate-300">时间轴（点击片段选中，下方改时长）</h3>
                  <div class="relative rounded-lg border border-slate-700 bg-slate-950 p-1">
                    <div class="relative flex h-20 w-full overflow-hidden rounded">
                      <button
                        v-for="(seg, idx) in segments"
                        :key="seg.id"
                        type="button"
                        class="relative flex min-w-[44px] flex-col border-r border-slate-800 bg-slate-900/90 text-left transition-colors hover:bg-slate-800/90"
                        :class="selectedIdx === idx ? 'ring-2 ring-inset ring-violet-500' : ''"
                        :style="segmentFlexStyle(seg.durationSec)"
                        @click="selectedIdx = idx"
                      >
                        <img
                          v-if="seg.image.public_url"
                          :src="seg.image.public_url"
                          alt=""
                          class="pointer-events-none h-12 w-full object-cover"
                        />
                        <span class="px-1 py-0.5 text-[10px] text-slate-400"
                          >{{ segmentClampSec(seg.durationSec) }}s</span>
                      </button>
                    </div>
                    <div
                      v-if="totalDuration > 0"
                      class="pointer-events-none absolute bottom-0 left-0 top-0 w-0.5 bg-violet-400 shadow-[0_0_6px_#a78bfa]"
                      :style="{ left: `calc(${playheadPercent}% - 1px)` }"
                    />
                  </div>
                  <div v-if="selectedIdx >= 0 && segments[selectedIdx]" class="mt-3 flex flex-wrap items-center gap-3">
                    <label class="flex items-center gap-2 text-sm text-slate-300">
                      当前片段时长（秒）
                      <input
                        v-model.number="segments[selectedIdx].durationSec"
                        type="number"
                        :min="VIDEO_SLIDE_SECONDS_MIN"
                        :max="VIDEO_SLIDE_SECONDS_MAX"
                        step="0.5"
                        class="w-24 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-white"
                        @change="clampSegmentDuration(selectedIdx)"
                      />
                    </label>
                  </div>
                  <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
                    <button
                      type="button"
                      class="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                      :disabled="generating"
                      @click="galleryPickerOpen = true"
                    >
                      从画廊添加
                    </button>
                    <label
                      class="inline-flex cursor-pointer items-center rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                      :class="generating ? 'pointer-events-none opacity-50' : ''"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        class="sr-only"
                        :disabled="generating"
                        @change="onAddLocalSegmentImages"
                      />
                      本机图片
                    </label>
                    <button
                      type="button"
                      class="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                      :disabled="generating || selectedIdx < 0 || !segments.length"
                      @click="moveSegment(-1)"
                    >
                      上移
                    </button>
                    <button
                      type="button"
                      class="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                      :disabled="generating || selectedIdx < 0 || selectedIdx >= segments.length - 1"
                      @click="moveSegment(1)"
                    >
                      下移
                    </button>
                    <button
                      type="button"
                      class="rounded-lg border border-rose-900/60 px-3 py-1.5 text-xs text-rose-300 hover:bg-slate-800 disabled:opacity-50"
                      :disabled="generating || selectedIdx < 0 || !segments.length"
                      @click="removeSelectedSegment"
                    >
                      删除当前片段
                    </button>
                  </div>
                  <p class="mt-2 text-[11px] leading-relaxed text-slate-500">
                    本机添加为临时预览，关闭弹窗后需重新添加；画廊片段顺序会同步到画廊页的「加入视频」勾选顺序。
                  </p>
                </div>

                <section class="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <h3 class="mb-2 text-sm font-medium text-slate-300">预览配乐（与时间轴同步）</h3>
                  <div class="flex flex-wrap gap-3 text-sm">
                    <label class="inline-flex cursor-pointer items-center gap-1.5 text-slate-300">
                      <input v-model="musicKind" type="radio" value="none" class="text-violet-500" />
                      无
                    </label>
                    <label class="inline-flex cursor-pointer items-center gap-1.5 text-slate-300">
                      <input v-model="musicKind" type="radio" value="archive" class="text-violet-500" />
                      Internet Archive
                    </label>
                    <label class="inline-flex cursor-pointer items-center gap-1.5 text-slate-300">
                      <input v-model="musicKind" type="radio" value="local" class="text-violet-500" />
                      本机文件
                    </label>
                  </div>

                  <div v-if="musicKind === 'archive'" class="mt-3 space-y-2">
                    <div class="flex flex-wrap gap-2">
                      <input
                        v-model="archiveQuery"
                        type="search"
                        placeholder="搜索音乐关键词"
                        class="min-w-[200px] flex-1 rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
                        @keydown.enter="runArchiveSearch"
                      />
                      <button
                        type="button"
                        class="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
                        :disabled="archiveLoading"
                        @click="runArchiveSearch"
                      >
                        搜索
                      </button>
                    </div>
                    <p v-if="archiveLoading" class="text-xs text-slate-400">搜索中…</p>
                    <p v-else-if="archiveError" class="text-xs text-rose-300">{{ archiveError }}</p>
                    <ul v-else-if="archiveHits.length" class="max-h-32 space-y-1 overflow-y-auto text-xs">
                      <li
                        v-for="h in archiveHits"
                        :key="h.identifier"
                        class="flex items-center justify-between gap-2 rounded border border-slate-800 bg-slate-900 px-2 py-1"
                      >
                        <span class="min-w-0 truncate text-slate-300">{{ h.title }}</span>
                        <button
                          type="button"
                          class="shrink-0 rounded bg-slate-700 px-2 py-0.5 text-slate-200"
                          @click="pickArchiveHit(h)"
                        >
                          选用
                        </button>
                      </li>
                    </ul>
                    <p v-if="archivePickLabel" class="text-xs text-emerald-400">已选：{{ archivePickLabel }}</p>
                  </div>

                  <label
                    v-if="musicKind === 'local'"
                    class="mt-3 flex cursor-pointer flex-wrap items-center gap-2 text-xs text-slate-400"
                  >
                    <span class="rounded border border-slate-600 px-2 py-1 text-slate-200">选择音频</span>
                    <input type="file" accept="audio/*" class="sr-only" @change="onLocalMusicFile" />
                    <span v-if="localMusicName" class="text-slate-500">{{ localMusicName }}</span>
                  </label>

                  <audio
                    v-if="previewMusicSrc"
                    ref="audioRef"
                    :key="previewMusicSrc"
                    class="mt-2 h-9 w-full"
                    controls
                    preload="auto"
                    :src="previewMusicSrc"
                    :crossorigin="previewAudioCrossOrigin"
                  />
                </section>

                <p v-if="generating && progressLabel" class="text-xs text-violet-300">{{ progressLabel }}</p>
              </div>
            </div>

            <div class="flex flex-wrap justify-end gap-2 border-t border-slate-800 px-4 py-3">
              <template v-if="exportVideoUrl">
                <button
                  type="button"
                  class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                  @click="backToTimeline"
                >
                  返回时间轴
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-500"
                  :disabled="!lastBlob"
                  @click="onDownload"
                >
                  下载 WebM
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                  @click="onClose"
                >
                  关闭
                </button>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                  :disabled="generating"
                  @click="onClose"
                >
                  取消
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                  :disabled="generating || !segments.length"
                  @click="runExport"
                >
                  {{ generating ? '导出中…' : '导出 WebM' }}
                </button>
              </template>
            </div>
            </DialogPanel>
          </div>
        </TransitionChild>
      </div>
    </Dialog>
    <GalleryImagePicker v-model="galleryPickerOpen" mine-only @pick="onGalleryPickImage" />
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { toast } from 'vue-sonner';
import { useVideoGenerator } from '@/composables/useVideoGenerator';
import GalleryImagePicker from '@/components/gallery-image-picker.vue';
import {
  GALLERY_CATEGORY_SINGLE,
  VIDEO_EXPORT_HEIGHT,
  VIDEO_EXPORT_WIDTH,
  VIDEO_PREVIEW_CANVAS_HEIGHT,
  VIDEO_PREVIEW_CANVAS_WIDTH,
  VIDEO_SLIDE_SECONDS_DEFAULT,
  VIDEO_SLIDE_SECONDS_MAX,
  VIDEO_SLIDE_SECONDS_MIN,
} from '@/data';
import type { ImageRow, PuzzleLayout } from '@/types/database';
import type { VideoGeneratorAudioExport } from '@/types/video';
import { searchArchiveOrgAudio, type ArchiveAudioHit } from '@/services/archive-org-audio';
import { useSessionStore } from '@/stores/session';
import { drawImageCover, loadImageElementForVideo } from '@/utils/video-canvas';

const props = defineProps<{
  open: boolean;
  images: ImageRow[];
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  /** 仅含画廊图片 id，按时间轴顺序（不含本机临时图）；用于同步画廊勾选顺序 */
  'update:video-order': [orderedGalleryIds: string[]];
}>();

const sessionStore = useSessionStore();

const { generateVideo, downloadVideo } = useVideoGenerator();

interface TimelineSeg {
  /** 时间轴行唯一 id（与 image.id 不同，允许同一张画廊图出现多段） */
  id: string;
  source: 'gallery' | 'local';
  image: ImageRow;
  durationSec: number;
}

const galleryPickerOpen = ref(false);

type MusicKind = 'none' | 'archive' | 'local';

const segments = ref<TimelineSeg[]>([]);
const selectedIdx = ref(0);
const playheadSec = ref(0);
const playing = ref(false);
let playbackRaf = 0;
let playbackLastTs = 0;

const previewCanvasRef = ref<HTMLCanvasElement | null>(null);
const audioRef = ref<HTMLAudioElement | null>(null);
const imgCache = new Map<string, HTMLImageElement>();

const generating = ref(false);
const progressLabel = ref('');

const exportVideoUrl = ref<string | null>(null);
const exportVideoObjectKey = ref(0);
const exportVideoRef = ref<HTMLVideoElement | null>(null);
const lastBlob = ref<Blob | null>(null);
/** 点击导出瞬间的时间轴总秒数（与 segments 一致，供与播放器 metadata 对照） */
const exportExpectedTotalSec = ref(0);

const musicKind = ref<MusicKind>('none');
const archiveQuery = ref('');
const archiveLoading = ref(false);
const archiveError = ref('');
const archiveHits = ref<ArchiveAudioHit[]>([]);
const archivePickUrl = ref('');
const archivePickLabel = ref('');
const localMusicBlobUrl = ref<string | null>(null);
const localMusicName = ref('');

const totalDuration = computed(function totalDur() {
  let s = 0;
  for (let i = 0; i < segments.value.length; i++) {
    s += clampOne(Number(segments.value[i].durationSec));
  }
  return s;
});

const playheadPercent = computed(function phPct() {
  const t = totalDuration.value;
  if (t <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (playheadSec.value / t) * 100));
});

const previewMusicSrc = computed(function musicSrcComputed() {
  if (musicKind.value === 'archive' && archivePickUrl.value) {
    return archivePickUrl.value;
  }
  if (musicKind.value === 'local' && localMusicBlobUrl.value) {
    return localMusicBlobUrl.value;
  }
  return '';
});

const previewAudioCrossOrigin = computed(function crossOriginComputed() {
  return musicKind.value === 'archive' && archivePickUrl.value ? 'anonymous' : undefined;
});

function segmentClampSec(raw: unknown): number {
  return clampOne(Number(raw));
}

function segmentFlexStyle(durationSec: number) {
  const d = segmentClampSec(durationSec);
  return {
    flexGrow: d,
    flexShrink: 1,
    flexBasis: 0,
  };
}

function clampOne(n: number): number {
  if (!Number.isFinite(n)) {
    return VIDEO_SLIDE_SECONDS_DEFAULT;
  }
  return Math.min(VIDEO_SLIDE_SECONDS_MAX, Math.max(VIDEO_SLIDE_SECONDS_MIN, n));
}

function clampSegmentDuration(idx: number) {
  const seg = segments.value[idx];
  if (!seg) {
    return;
  }
  seg.durationSec = clampOne(Number(seg.durationSec));
  if (playheadSec.value > totalDuration.value) {
    playheadSec.value = Math.max(0, totalDuration.value - 0.01);
  }
  renderPreviewAt(playheadSec.value);
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) {
    return '0:00';
  }
  const m = Math.floor(sec / 60);
  const r = sec - m * 60;
  if (m > 0) {
    return `${m}:${String(Math.floor(r)).padStart(2, '0')}`;
  }
  return `${r.toFixed(1)}s`;
}

function createLocalImageRow(blobUrl: string, fileTitle: string, userId: string): ImageRow {
  const emptyLayout: PuzzleLayout = { version: 1, elements: [] };
  return {
    id: `local-${crypto.randomUUID()}`,
    user_id: userId,
    storage_path: '',
    public_url: blobUrl,
    title: fileTitle,
    tags: [],
    layout: emptyLayout,
    file_size_bytes: null,
    is_public: false,
    created_at: new Date().toISOString(),
    gallery_category: GALLERY_CATEGORY_SINGLE,
    source_image_id: null,
  };
}

function revokeSegmentLocalBlobs(list: TimelineSeg[]) {
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.source !== 'local') {
      continue;
    }
    const u = s.image.public_url;
    if (u && u.startsWith('blob:')) {
      URL.revokeObjectURL(u);
    }
  }
}

function syncVideoOrderToParent() {
  const ids = segments.value
    .filter(function galleryOnly(s) {
      return s.source === 'gallery';
    })
    .map(function galleryId(s) {
      return s.image.id;
    });
  emit('update:video-order', ids);
}

function initSegmentsFromProps() {
  segments.value = props.images.map(function mapImg(im) {
    return {
      id: crypto.randomUUID(),
      source: 'gallery' as const,
      image: im,
      durationSec: VIDEO_SLIDE_SECONDS_DEFAULT,
    };
  });
  selectedIdx.value = segments.value.length ? 0 : -1;
  playheadSec.value = 0;
}

function setupCanvasResolution() {
  const c = previewCanvasRef.value;
  if (!c) {
    return;
  }
  c.width = VIDEO_PREVIEW_CANVAS_WIDTH;
  c.height = VIDEO_PREVIEW_CANVAS_HEIGHT;
}

async function preloadSegmentImages() {
  for (let i = 0; i < segments.value.length; i++) {
    try {
      await preloadOneSegment(segments.value[i]);
    } catch (e) {
      console.error('[video-wizard] preload', e);
    }
  }
}

async function preloadOneSegment(seg: TimelineSeg) {
  const url = seg.image.public_url;
  if (!url || imgCache.has(seg.id)) {
    return;
  }
  const el = await loadImageElementForVideo(url);
  imgCache.set(seg.id, el);
}

function onGalleryPickImage(row: ImageRow) {
  const seg: TimelineSeg = {
    id: crypto.randomUUID(),
    source: 'gallery',
    image: row,
    durationSec: VIDEO_SLIDE_SECONDS_DEFAULT,
  };
  segments.value = segments.value.concat([seg]);
  selectedIdx.value = segments.value.length - 1;
  void preloadOneSegment(seg)
    .then(function afterPreload() {
      renderPreviewAt(playheadSec.value);
    })
    .catch(function onPickPreloadErr(e) {
      console.error('[video-wizard] gallery pick preload', e);
      toast.error('该图片无法加载到预览');
    });
  syncVideoOrderToParent();
}

function onAddLocalSegmentImages(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (!files.length) {
    return;
  }
  const uid = sessionStore.userId ?? '';
  const added: TimelineSeg[] = [];
  for (let f = 0; f < files.length; f++) {
    const file = files[f];
    if (!file.type.startsWith('image/')) {
      continue;
    }
    const blobUrl = URL.createObjectURL(file);
    const row = createLocalImageRow(blobUrl, file.name || '本机图片', uid);
    added.push({
      id: crypto.randomUUID(),
      source: 'local',
      image: row,
      durationSec: VIDEO_SLIDE_SECONDS_DEFAULT,
    });
  }
  if (!added.length) {
    toast.error('请选择图片文件');
    return;
  }
  segments.value = segments.value.concat(added);
  selectedIdx.value = segments.value.length - 1;
  void Promise.all(
    added.map(function preEach(s) {
      return preloadOneSegment(s).catch(function onLocalPreloadErr(e) {
        console.error('[video-wizard] local preload', e);
        return undefined;
      });
    })
  ).then(function afterAll() {
    renderPreviewAt(playheadSec.value);
  });
  syncVideoOrderToParent();
}

function moveSegment(delta: number) {
  const i = selectedIdx.value;
  const j = i + delta;
  if (j < 0 || j >= segments.value.length) {
    return;
  }
  const arr = segments.value.slice();
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
  segments.value = arr;
  selectedIdx.value = j;
  syncVideoOrderToParent();
}

function removeSelectedSegment() {
  const i = selectedIdx.value;
  const seg = segments.value[i];
  if (!seg) {
    return;
  }
  if (seg.source === 'local' && seg.image.public_url && seg.image.public_url.startsWith('blob:')) {
    URL.revokeObjectURL(seg.image.public_url);
  }
  imgCache.delete(seg.id);
  const next = segments.value.filter(function keep(_, idx) {
    return idx !== i;
  });
  segments.value = next;
  if (!next.length) {
    selectedIdx.value = -1;
  } else if (i < selectedIdx.value) {
    selectedIdx.value -= 1;
  } else if (i === selectedIdx.value) {
    selectedIdx.value = Math.min(i, next.length - 1);
  }
  clampPlayheadToTotal();
  renderPreviewAt(playheadSec.value);
  syncVideoOrderToParent();
}

function renderPreviewAt(tSec: number) {
  const canvas = previewCanvasRef.value;
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  const w = canvas.width;
  const h = canvas.height;
  const segs = segments.value;
  if (!segs.length) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const total = totalDuration.value;
  let t = Math.max(0, tSec);
  if (total > 0 && t >= total) {
    t = total - 0.001;
  }
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const d = segmentClampSec(seg.durationSec);
    if (t < acc + d) {
      const img = imgCache.get(seg.id);
      if (img && img.naturalWidth) {
        drawImageCover(ctx, img, w, h);
      } else {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, w, h);
      }
      return;
    }
    acc += d;
  }
  const lastSeg = segs[segs.length - 1];
  const lastImg = imgCache.get(lastSeg.id);
  if (lastImg && lastImg.naturalWidth) {
    drawImageCover(ctx, lastImg, w, h);
  } else {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);
  }
}

function stopPlaybackLoop() {
  if (playbackRaf) {
    cancelAnimationFrame(playbackRaf);
    playbackRaf = 0;
  }
  playing.value = false;
  pauseAudioPreview();
}

function pauseAudioPreview() {
  const a = audioRef.value;
  if (a) {
    a.pause();
  }
}

function syncPreviewAudioFromPlayhead() {
  const a = audioRef.value;
  if (!a || !previewMusicSrc.value) {
    return;
  }
  try {
    a.currentTime = playheadSec.value;
  } catch {
    /* ignore */
  }
}

function playbackTick(ts: number) {
  if (!playing.value) {
    return;
  }
  const dt = (ts - playbackLastTs) / 1000;
  playbackLastTs = ts;
  let next = playheadSec.value + dt;
  const total = totalDuration.value;
  if (next >= total) {
    next = total;
    playheadSec.value = next;
    renderPreviewAt(next);
    stopPlaybackLoop();
    return;
  }
  playheadSec.value = next;
  renderPreviewAt(next);
  const a = audioRef.value;
  if (a && previewMusicSrc.value && !a.paused) {
    const drift = Math.abs(a.currentTime - playheadSec.value);
    if (drift > 0.45) {
      a.currentTime = playheadSec.value;
    }
  }
  playbackRaf = requestAnimationFrame(playbackTick);
}

function togglePlayback() {
  if (playing.value) {
    stopPlaybackLoop();
    return;
  }
  if (totalDuration.value <= 0) {
    return;
  }
  if (playheadSec.value >= totalDuration.value) {
    playheadSec.value = 0;
  }
  playing.value = true;
  playbackLastTs = performance.now();
  renderPreviewAt(playheadSec.value);
  const a = audioRef.value;
  if (a && previewMusicSrc.value) {
    syncPreviewAudioFromPlayhead();
    void a.play().catch(function onPlayErr() {
      toast.error('配乐无法播放');
    });
  }
  playbackRaf = requestAnimationFrame(playbackTick);
}

function onScrubPlayhead() {
  stopPlaybackLoop();
  clampPlayheadToTotal();
  renderPreviewAt(playheadSec.value);
  syncPreviewAudioFromPlayhead();
}

function clampPlayheadToTotal() {
  const total = totalDuration.value;
  if (total <= 0) {
    playheadSec.value = 0;
    return;
  }
  if (playheadSec.value > total) {
    playheadSec.value = total;
  }
  if (playheadSec.value < 0) {
    playheadSec.value = 0;
  }
}

watch(totalDuration, function onTotalChange() {
  clampPlayheadToTotal();
  if (!playing.value) {
    renderPreviewAt(playheadSec.value);
  }
});

watch(
  function watchMusicForPreview() {
    return previewMusicSrc.value;
  },
  function onMusicSrcChange() {
    stopPlaybackLoop();
  }
);

watch(musicKind, function onMusicKind(k) {
  if (k !== 'archive') {
    archiveQuery.value = '';
    archiveHits.value = [];
    archiveError.value = '';
    archivePickUrl.value = '';
    archivePickLabel.value = '';
  }
  if (k !== 'local') {
    revokeLocalMusic();
  }
});

function revokeLocalMusic() {
  if (localMusicBlobUrl.value) {
    URL.revokeObjectURL(localMusicBlobUrl.value);
    localMusicBlobUrl.value = null;
  }
  localMusicName.value = '';
}

function revokeExportUrl() {
  if (exportVideoUrl.value) {
    URL.revokeObjectURL(exportVideoUrl.value);
    exportVideoUrl.value = null;
  }
}

function onExportVideoLoaded() {
  const el = exportVideoRef.value;
  if (el) {
    el.currentTime = 0;
  }
}

function onClose() {
  emit('update:open', false);
}

function onVideoWizardDialogRequestClose() {
  if (galleryPickerOpen.value) {
    galleryPickerOpen.value = false;
    return;
  }
  onClose();
}

function resetWizardState() {
  stopPlaybackLoop();
  generating.value = false;
  progressLabel.value = '';
  revokeExportUrl();
  lastBlob.value = null;
  exportExpectedTotalSec.value = 0;
  musicKind.value = 'none';
  archiveQuery.value = '';
  archiveHits.value = [];
  archiveError.value = '';
  archivePickUrl.value = '';
  archivePickLabel.value = '';
  revokeLocalMusic();
  pauseAudioPreview();
  galleryPickerOpen.value = false;
  revokeSegmentLocalBlobs(segments.value);
  imgCache.clear();
  segments.value = [];
}

watch(
  function watchOpenToggle() {
    return props.open;
  },
  async function onOpenToggle(isOpen) {
    if (isOpen) {
      initSegmentsFromProps();
      await nextTick();
      setupCanvasResolution();
      await preloadSegmentImages();
      playheadSec.value = 0;
      renderPreviewAt(0);
      syncVideoOrderToParent();
    } else {
      resetWizardState();
    }
  }
);

async function runArchiveSearch() {
  archiveLoading.value = true;
  archiveError.value = '';
  archiveHits.value = [];
  try {
    archiveHits.value = await searchArchiveOrgAudio(archiveQuery.value);
    if (!archiveHits.value.length) {
      archiveError.value = '没有可播放的结果';
    }
  } catch (e) {
    archiveError.value = e instanceof Error ? e.message : '搜索失败';
  } finally {
    archiveLoading.value = false;
  }
}

function pickArchiveHit(h: ArchiveAudioHit) {
  archivePickUrl.value = h.playUrl;
  archivePickLabel.value = h.title;
}

function onLocalMusicFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  revokeLocalMusic();
  if (!file) {
    return;
  }
  localMusicBlobUrl.value = URL.createObjectURL(file);
  localMusicName.value = file.name;
}

async function runExport() {
  if (!segments.value.length || generating.value) {
    return;
  }
  stopPlaybackLoop();
  generating.value = true;
  progressLabel.value = '正在导出…';
  try {
    exportExpectedTotalSec.value = totalDuration.value;
    const ordered = segments.value.map(function pickImage(s) {
      return s.image;
    });
    const durations = segments.value.map(function pickDur(s) {
      return clampOne(Number(s.durationSec));
    });
    let audioExport: VideoGeneratorAudioExport | null = null;
    if (musicKind.value === 'archive' && archivePickUrl.value) {
      audioExport = { url: archivePickUrl.value, crossOrigin: 'anonymous' };
    } else if (musicKind.value === 'local' && localMusicBlobUrl.value) {
      audioExport = { url: localMusicBlobUrl.value };
    }
    const blob = await generateVideo(ordered, {
      width: VIDEO_EXPORT_WIDTH,
      height: VIDEO_EXPORT_HEIGHT,
      secondsPerSlideList: durations,
      audioExport,
      onProgress: function onProg(cur: number, total: number) {
        progressLabel.value = `编码第 ${cur} / ${total} 张…`;
      },
    });
    lastBlob.value = blob;
    revokeExportUrl();
    exportVideoUrl.value = URL.createObjectURL(blob);
    exportVideoObjectKey.value += 1;
    await nextTick();
    exportVideoRef.value?.load();
    toast.success('导出完成');
  } catch (e) {
    console.error('[generate-video-wizard]', e);
    toast.error(e instanceof Error ? e.message : '导出失败');
  } finally {
    generating.value = false;
    progressLabel.value = '';
  }
}

function backToTimeline() {
  revokeExportUrl();
  lastBlob.value = null;
  nextTick(function afterBack() {
    setupCanvasResolution();
    renderPreviewAt(playheadSec.value);
  });
}

function onDownload() {
  if (!lastBlob.value) {
    return;
  }
  downloadVideo(lastBlob.value, `gallery-slideshow-${Date.now()}.webm`);
}

onBeforeUnmount(function cleanup() {
  resetWizardState();
});
</script>
