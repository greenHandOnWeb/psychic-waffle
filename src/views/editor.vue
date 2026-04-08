<template>
  <div class="space-y-6">
    <div
      v-if="!imageId"
      class="rounded border border-amber-800/60 bg-amber-950/40 px-4 py-2 text-sm text-amber-200"
    >
      未关联作品：无法写入数据库。请从<RouterLink class="underline" to="/"> 画廊 </RouterLink
      >打开某一作品后再保存布局。
    </div>

    <div class="flex flex-wrap items-end gap-4">
      <div>
        <label class="block text-xs text-slate-400">云端模板</label>
        <select
          v-model="selectedTemplateId"
          class="mt-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          @change="onTemplateChange"
        >
          <option value="">— 请选择 —</option>
          <option v-for="t in templates" :key="t.id" :value="t.id">
            {{ t.name }}
          </option>
        </select>
      </div>
      <Menu as="div" class="relative z-20 inline-block text-left">
        <MenuButton
          type="button"
          class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          添加图片
          <ChevronDown class="h-4 w-4 opacity-90" aria-hidden="true" />
        </MenuButton>
        <transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="scale-95 opacity-0"
          enter-to-class="scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="scale-100 opacity-100"
          leave-to-class="scale-95 opacity-0"
        >
          <MenuItems
            class="absolute left-0 z-30 mt-1 w-44 origin-top-left rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl focus:outline-none"
          >
            <MenuItem v-slot="{ active }">
              <button
                type="button"
                :class="[
                  active ? 'bg-slate-800 text-white' : 'text-slate-200',
                  'block w-full px-3 py-2 text-left text-sm',
                ]"
                @click="triggerLocalImagePick"
              >
                从本机选择
              </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
              <button
                type="button"
                :class="[
                  active ? 'bg-slate-800 text-white' : 'text-slate-200',
                  'block w-full px-3 py-2 text-left text-sm',
                ]"
                @click="openGalleryPicker"
              >
                从画廊选择
              </button>
            </MenuItem>
          </MenuItems>
        </transition>
      </Menu>
      <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onImageFile" />
      <GalleryImagePicker v-model="galleryPickerOpen" @pick="onGalleryImagePicked" />
      <button
        type="button"
        class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        :disabled="saving || !imageId"
        title="写入当前图层位置到源作品，并导出一张拼团成品到「拼团画廊」"
        @click="saveLayout"
      >
        保存并生成拼团
      </button>
      <button
        type="button"
        class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        :disabled="exporting || exportingHtml"
        @click="exportPoster"
      >
        导出海报
      </button>
      <button
        type="button"
        class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        :disabled="exporting || exportingHtml"
        title="下载单个 HTML：内含海报图与按时间轴叠加播放的音频（非 JPG 内嵌，浏览器打开即可播）"
        @click="exportPosterHtmlWithAudio"
      >
        导出 HTML（含音乐）
      </button>
    </div>

    <div
      v-if="showSelectionBar"
      class="flex flex-wrap items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/90 px-3 py-2 text-sm text-slate-200 shadow"
    >
      <span class="text-slate-400">{{ selectionBarLabel }}</span>
      <button
        type="button"
        class="rounded-md bg-rose-600 px-2.5 py-1.5 font-medium text-white hover:bg-rose-500"
        @click="deleteSelectedObject"
      >
        删除
      </button>
      <template v-if="selectedFabricKind === 'text'">
        <label class="flex items-center gap-1.5 text-xs text-slate-400">
          <span>字体</span>
          <select
            class="max-w-[10rem] rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-white"
            :value="textInspector.fontFamily"
            @change="onTextFontFamilyChange"
          >
            <option
              v-if="!isKnownTextFontChoice(textInspector.fontFamily)"
              :value="textInspector.fontFamily"
            >
              当前字体
            </option>
            <option v-for="opt in EDITOR_TEXT_FONT_CHOICES" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </label>
        <label class="flex items-center gap-1.5 text-xs text-slate-400">
          <span>颜色</span>
          <input
            :value="textInspector.fillHex"
            type="color"
            class="h-8 w-9 cursor-pointer rounded border border-slate-600 bg-slate-900"
            @input="onTextFillInput"
          />
        </label>
        <label class="flex items-center gap-1.5 text-xs text-slate-400">
          <span>字号</span>
          <input
            :value="textInspector.fontSize"
            type="number"
            :min="EDITOR_TEXT_FONT_SIZE_MIN"
            :max="EDITOR_TEXT_FONT_SIZE_MAX"
            step="1"
            class="w-16 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-white"
            @change="onTextFontSizeChange"
          />
        </label>
        <label class="flex cursor-pointer items-center gap-1 text-xs text-slate-300">
          <input
            type="checkbox"
            class="rounded border-slate-500"
            :checked="textInspector.fontWeightBold"
            @change="onTextBoldChange"
          />
          粗体
        </label>
        <label class="flex cursor-pointer items-center gap-1 text-xs text-slate-300">
          <input
            type="checkbox"
            class="rounded border-slate-500"
            :checked="textInspector.fontStyleItalic"
            @change="onTextItalicChange"
          />
          斜体
        </label>
      </template>
      <template v-if="selectedFabricKind === 'image' || selectedFabricKind === 'sticker'">
        <button
          type="button"
          class="rounded-md bg-slate-600 px-2.5 py-1.5 font-medium text-white hover:bg-slate-500"
          @click="rotateSelected(-15)"
        >
          左转 15°
        </button>
        <button
          type="button"
          class="rounded-md bg-slate-600 px-2.5 py-1.5 font-medium text-white hover:bg-slate-500"
          @click="rotateSelected(15)"
        >
          右转 15°
        </button>
        <button
          v-if="selectedFabricKind === 'image'"
          type="button"
          class="rounded-md bg-indigo-600 px-2.5 py-1.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          :disabled="aiBusy"
          @click="onAiEnhanceSelected"
        >
          AI 优化
        </button>
      </template>
      <span class="text-xs text-slate-500">
        {{
          selectedFabricKind === 'text'
            ? '双击可编辑文字；可拖动与缩放。按 Delete 删除（非编辑态）。'
            : '可拖顶点缩放；上方圆点为旋转。按 Delete 删除。'
        }}
      </span>
    </div>

    <div class="flex flex-wrap items-end gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-3">
      <button
        type="button"
        class="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500"
        @click="addTextBlock"
      >
        添加文字
      </button>
      <button
        type="button"
        class="rounded-lg bg-pink-600 px-3 py-2 text-sm font-medium text-white hover:bg-pink-500"
        @click="openStickerPicker"
      >
        添加表情包
      </button>
      <StickerPickerModal
        v-model="stickerPickerOpen"
        @pick-url="onStickerPickedUrl"
        @pick-kaomoji="onStickerPickedKaomoji"
        @pick-file="onStickerPickedFile"
      />
      <div class="flex flex-wrap items-center gap-2 border-l border-slate-700 pl-3">
        <span class="text-xs text-slate-400">画布背景</span>
        <label class="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
          <span>底色</span>
          <input
            :value="uiCanvasBackgroundHex"
            type="color"
            class="h-8 w-10 cursor-pointer rounded border border-slate-600 bg-slate-900"
            @input="onCanvasBackgroundColorInput"
          />
        </label>
        <button
          type="button"
          class="rounded-md bg-slate-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-500"
          @click="triggerBackgroundImagePick"
        >
          背景图
        </button>
        <button
          type="button"
          class="rounded-md border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          @click="clearBackgroundImage"
        >
          清除背景图
        </button>
        <input
          ref="backgroundImageInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onBackgroundImageFile"
        />
      </div>
    </div>

    <div class="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-sm font-medium text-slate-200">背景音乐（时间轴分段）</span>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-500"
            @click="playTimelinePreview"
          >
            试听时间轴
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            @click="stopTimelinePreview"
          >
            停止试听
          </button>
        </div>
      </div>
      <p class="text-xs text-slate-500">
        联网地址需目标站支持 CORS；失败时请改用本地上传。音频会存入当前用户的 Storage，保存布局时写入作品 JSON。
      </p>
      <div class="flex flex-wrap items-end gap-3 border-b border-slate-800 pb-3">
        <div>
          <label class="block text-xs text-slate-400">起点（秒）</label>
          <input
            v-model.number="newAudioStartSec"
            type="number"
            min="0"
            step="0.1"
            class="mt-1 w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div class="min-w-[200px] flex-1">
          <label class="block text-xs text-slate-400">标题（可选）</label>
          <input
            v-model="newAudioTitle"
            type="text"
            placeholder="如：开场"
            class="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div class="min-w-[220px] flex-[2]">
          <label class="block text-xs text-slate-400">音频 URL（拉取并上传）</label>
          <input
            v-model="newAudioUrl"
            type="url"
            placeholder="https://…/music.mp3"
            class="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
          />
        </div>
        <button
          type="button"
          class="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
          :disabled="audioImportBusy"
          @click="addAudioFromNetwork"
        >
          拉取并存储
        </button>
        <button
          type="button"
          class="rounded-lg bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-500"
          @click="triggerAudioFilePick"
        >
          本地上传
        </button>
        <input
          ref="audioFileInputRef"
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
          class="hidden"
          @change="onAudioFile"
        />
      </div>
      <ul v-if="sortedAudioSegments.length" class="max-h-40 space-y-1 overflow-y-auto text-sm">
        <li
          v-for="seg in sortedAudioSegments"
          :key="seg.id"
          class="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 bg-slate-950/80 px-2 py-1.5"
        >
          <span class="text-slate-300">
            <span class="font-mono text-sky-400">{{ seg.startSec }}s</span>
            <span class="mx-2 text-slate-500">|</span>
            {{ seg.title || '未命名' }}
          </span>
          <button
            type="button"
            class="text-xs text-rose-400 hover:text-rose-300"
            @click="removeAudioSegment(seg.id)"
          >
            移除
          </button>
        </li>
      </ul>
      <p v-else class="text-xs text-slate-600">暂无分段，可在不同起点添加多首曲子。</p>
    </div>

    <!--
      浅色底与 Fabric background 一致，缩放后不留大块深色空边。
      勿在 canvas 上用 bg-white：upper 透明区会挡住下层。
    -->
    <div
      ref="canvasHostRef"
      class="font-export overflow-hidden rounded-lg border border-slate-600 bg-[#f8fafc] shadow-inner"
      style="touch-action: none; min-height: 120px"
    >
      <div class="flex justify-center">
        <canvas
          ref="canvasElRef"
          class="editor-fabric-canvas block touch-manipulation bg-transparent flex-1"
        />
      </div>
    </div>
    <p class="text-xs text-slate-500">
      切换云端模板时：主图会按槽位顺序对齐到新模板位置（表情包贴纸不参与）；多出的槽补示例图，多出的主图保留原位。文字与背景音乐逻辑不变。
    </p>
  </div>
</template>

<script setup lang="ts">
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { Canvas, Color, FabricImage, IText } from 'fabric';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import { useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import GalleryImagePicker from '@/components/gallery-image-picker.vue';
import StickerPickerModal from '@/components/sticker-picker-modal.vue';
import { supabase } from '@/lib/supabase';
import {
  AUDIO_STORAGE_SUBDIR,
  EDITOR_CANVAS_HEIGHT,
  EDITOR_CANVAS_WIDTH,
  EDITOR_DEFAULT_CANVAS_BACKGROUND,
  EDITOR_DEFAULT_NEW_IMAGE_LAYOUT,
  EDITOR_DEFAULT_STICKER_LAYOUT,
  EDITOR_DEFAULT_TEXT_CONTENT,
  EDITOR_DEFAULT_TEXT_FILL,
  EDITOR_DEFAULT_TEXT_FONT_FAMILY,
  EDITOR_DEFAULT_TEXT_FONT_SIZE,
  EDITOR_TEXT_FONT_CHOICES,
  EDITOR_TEXT_FONT_SIZE_MAX,
  EDITOR_TEXT_FONT_SIZE_MIN,
  EDITOR_VIEWPORT_MAX_HEIGHT_VH,
  FABRIC_STICKER_NAME_PREFIX,
  FABRIC_TEMPLATE_PLACEHOLDER_PREFIX,
  GALLERY_CATEGORY_COLLAGE,
  LAYOUT_SCHEMA_VERSION,
  MAX_AUDIO_UPLOAD_BYTES,
  STORAGE_BUCKET,
} from '@/data';
import { mockAiEnhanceFabricImage } from '@/services/ai-image-enhance';
import type {
  AudioTimelineSegment,
  ImageRow,
  LayoutElement,
  LayoutElementKind,
  PuzzleLayout,
  TemplateRow,
} from '@/types/database';
import {
  extensionFromAudioMime,
  fetchAudioBlobFromUrl,
  safeAudioFileStem,
} from '@/utils/audio-timeline';
import {
  downloadFabricPosterJpeg,
  fabricCanvasToJpegBlob,
} from '@/utils/export-poster';
import { downloadFabricPosterWithAudioHtml } from '@/utils/export-poster-html';
import { useSessionStore } from '@/stores/session';

const route = useRoute();
const sessionStore = useSessionStore();
const imageId = computed(function imageIdComputed() {
  return (route.params.id as string) || '';
});

const canvasWidth = EDITOR_CANVAS_WIDTH;
const canvasHeight = EDITOR_CANVAS_HEIGHT;

const templates = ref<TemplateRow[]>([]);
const selectedTemplateId = ref('');
/** 当前套用模板的槽位几何（百分比），用于添加图片时按槽位填充 */
const templateSlotElements = ref<LayoutElement[]>([]);
const galleryPickerOpen = ref(false);
const saving = ref(false);
const exporting = ref(false);
const exportingHtml = ref(false);

const canvasElRef = ref<HTMLCanvasElement | null>(null);
const canvasHostRef = ref<HTMLElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const stickerPickerOpen = ref(false);
const backgroundImageInputRef = ref<HTMLInputElement | null>(null);
const aiBusy = ref(false);
/** none | template = 不展示操作条；模板示例图一般不操作 */
const selectedFabricKind = ref<'none' | 'image' | 'sticker' | 'text' | 'template'>('none');
const uiCanvasBackgroundHex = ref(EDITOR_DEFAULT_CANVAS_BACKGROUND);

const audioSegments = ref<AudioTimelineSegment[]>([]);
const newAudioStartSec = ref(0);
const newAudioTitle = ref('');
const newAudioUrl = ref('');
const audioImportBusy = ref(false);
const audioFileInputRef = ref<HTMLInputElement | null>(null);
const audioPreviewTimeouts: number[] = [];
const audioPreviewElements: HTMLAudioElement[] = [];

let fabricCanvas: Canvas | null = null;
let canvasResizeObserver: ResizeObserver | null = null;

const showSelectionBar = computed(function showSelectionBarComputed() {
  const k = selectedFabricKind.value;
  return k === 'image' || k === 'sticker' || k === 'text';
});

const selectionBarLabel = computed(function selectionBarLabelComputed() {
  switch (selectedFabricKind.value) {
    case 'text':
      return '已选中文字';
    case 'sticker':
      return '已选中表情包';
    case 'image':
      return '已选中图片';
    default:
      return '';
  }
});

const sortedAudioSegments = computed(function sortedAudioSegmentsComputed() {
  return [...audioSegments.value].sort(function sortByStart(a, b) {
    return a.startSec - b.startSec;
  });
});

const textInspector = ref({
  fontSize: EDITOR_DEFAULT_TEXT_FONT_SIZE,
  fillHex: EDITOR_DEFAULT_TEXT_FILL,
  fontFamily: EDITOR_DEFAULT_TEXT_FONT_FAMILY,
  fontWeightBold: false,
  fontStyleItalic: false,
});

function isKnownTextFontChoice(family: string): boolean {
  return EDITOR_TEXT_FONT_CHOICES.some(function matchFont(opt) {
    return opt.value === family;
  });
}

function syncTextInspectorFromIText(o: IText) {
  const fillVal = o.fill;
  let hex = EDITOR_DEFAULT_TEXT_FILL;
  if (typeof fillVal === 'string') {
    hex = colorToHexForInput(fillVal);
  } else if (fillVal != null) {
    try {
      hex = colorToHexForInput(fillVal as unknown as string);
    } catch {
      hex = EDITOR_DEFAULT_TEXT_FILL;
    }
  }
  const fw = o.fontWeight;
  const bold =
    fw === 'bold' ||
    fw === 700 ||
    fw === '700' ||
    (typeof fw === 'string' && fw.toLowerCase().includes('bold'));
  const italic = o.fontStyle === 'italic' || o.fontStyle === 'oblique';
  Object.assign(textInspector.value, {
    fontSize: Math.min(
      EDITOR_TEXT_FONT_SIZE_MAX,
      Math.max(EDITOR_TEXT_FONT_SIZE_MIN, Math.round(o.fontSize ?? EDITOR_DEFAULT_TEXT_FONT_SIZE))
    ),
    fillHex: hex,
    fontFamily: typeof o.fontFamily === 'string' ? o.fontFamily : EDITOR_DEFAULT_TEXT_FONT_FAMILY,
    fontWeightBold: Boolean(bold),
    fontStyleItalic: Boolean(italic),
  });
}

function applyTextStyleToActiveIText() {
  const c = fabricCanvas;
  if (!c) {
    return;
  }
  const o = c.getActiveObject();
  if (!(o instanceof IText)) {
    return;
  }
  const ins = textInspector.value;
  o.set({
    fontSize: ins.fontSize,
    fill: ins.fillHex,
    fontFamily: ins.fontFamily,
    fontWeight: ins.fontWeightBold ? 'bold' : 'normal',
    fontStyle: ins.fontStyleItalic ? 'italic' : 'normal',
  });
  o.setCoords();
  c.requestRenderAll();
}

function onTextFontFamilyChange(ev: Event) {
  const v = (ev.target as HTMLSelectElement).value;
  textInspector.value.fontFamily = v;
  applyTextStyleToActiveIText();
}

function onTextFillInput(ev: Event) {
  textInspector.value.fillHex = (ev.target as HTMLInputElement).value;
  applyTextStyleToActiveIText();
}

function onTextFontSizeChange(ev: Event) {
  const raw = Number.parseInt((ev.target as HTMLInputElement).value, 10);
  const n = Number.isFinite(raw)
    ? Math.min(EDITOR_TEXT_FONT_SIZE_MAX, Math.max(EDITOR_TEXT_FONT_SIZE_MIN, raw))
    : EDITOR_DEFAULT_TEXT_FONT_SIZE;
  textInspector.value.fontSize = n;
  (ev.target as HTMLInputElement).value = String(n);
  applyTextStyleToActiveIText();
}

function onTextBoldChange(ev: Event) {
  textInspector.value.fontWeightBold = (ev.target as HTMLInputElement).checked;
  applyTextStyleToActiveIText();
}

function onTextItalicChange(ev: Event) {
  textInspector.value.fontStyleItalic = (ev.target as HTMLInputElement).checked;
  applyTextStyleToActiveIText();
}

function onFabricObjectModified() {
  const c = fabricCanvas;
  if (!c) {
    return;
  }
  const o = c.getActiveObject();
  if (o instanceof IText) {
    syncTextInspectorFromIText(o);
  }
}

function updateSelectionUi() {
  const c = fabricCanvas;
  if (!c) {
    selectedFabricKind.value = 'none';
    return;
  }
  const o = c.getActiveObject();
  if (!o) {
    selectedFabricKind.value = 'none';
    return;
  }
  if (o instanceof IText) {
    selectedFabricKind.value = 'text';
    syncTextInspectorFromIText(o);
    return;
  }
  if (o instanceof FabricImage) {
    if (isFabricTemplatePlaceholder(o)) {
      selectedFabricKind.value = 'template';
      return;
    }
    const named = o as unknown as { name?: string };
    if ((named.name ?? '').startsWith(FABRIC_STICKER_NAME_PREFIX)) {
      selectedFabricKind.value = 'sticker';
      return;
    }
    selectedFabricKind.value = 'image';
    return;
  }
  selectedFabricKind.value = 'none';
}

function onFabricSelectionCleared() {
  selectedFabricKind.value = 'none';
}

function deleteSelectedObject() {
  if (!fabricCanvas) {
    return;
  }
  const o = fabricCanvas.getActiveObject();
  if (o instanceof IText) {
    fabricCanvas.remove(o);
    fabricCanvas.discardActiveObject();
    selectedFabricKind.value = 'none';
    fabricCanvas.requestRenderAll();
    return;
  }
  if (o instanceof FabricImage && !isFabricTemplatePlaceholder(o)) {
    fabricCanvas.remove(o);
    fabricCanvas.discardActiveObject();
    selectedFabricKind.value = 'none';
    fabricCanvas.requestRenderAll();
  }
}

function rotateSelected(deltaDeg: number) {
  if (!fabricCanvas) {
    return;
  }
  const o = fabricCanvas.getActiveObject();
  if (!(o instanceof FabricImage)) {
    return;
  }
  o.rotate((o.angle ?? 0) + deltaDeg);
  o.setCoords();
  fabricCanvas.requestRenderAll();
}

async function onAiEnhanceSelected() {
  if (!fabricCanvas || aiBusy.value) {
    return;
  }
  const o = fabricCanvas.getActiveObject();
  if (!(o instanceof FabricImage)) {
    return;
  }
  aiBusy.value = true;
  try {
    await mockAiEnhanceFabricImage(o);
    fabricCanvas.requestRenderAll();
    toast.success('AI 优化完成（Mock：提亮），保存布局仍使用原图地址');
  } catch (e) {
    console.error('[editor] ai enhance', e);
    toast.error('AI 优化失败');
  } finally {
    aiBusy.value = false;
  }
}

function syncCanvasDisplayScale() {
  const host = canvasHostRef.value;
  const canvas = fabricCanvas;
  if (!host || !canvas?.wrapperEl) {
    return;
  }
  const hostW = host.clientWidth;
  if (hostW <= 0) {
    return;
  }
  const maxH = (EDITOR_VIEWPORT_MAX_HEIGHT_VH / 100) * window.innerHeight;
  let scale = hostW / EDITOR_CANVAS_WIDTH;
  if (EDITOR_CANVAS_HEIGHT * scale > maxH) {
    scale = maxH / EDITOR_CANVAS_HEIGHT;
  }
  scale = Math.min(scale, 1);
  const wrap = canvas.wrapperEl as HTMLDivElement;
  wrap.style.transformOrigin = 'top center';
  wrap.style.transform = `scale(${scale})`;
  host.style.height = `${Math.ceil(EDITOR_CANVAS_HEIGHT * scale)}px`;
}

function bindCanvasHostResize() {
  if (canvasResizeObserver) {
    canvasResizeObserver.disconnect();
    canvasResizeObserver = null;
  }
  const host = canvasHostRef.value;
  if (!host || typeof ResizeObserver === 'undefined') {
    return;
  }
  canvasResizeObserver = new ResizeObserver(function onHostResize() {
    syncCanvasDisplayScale();
  });
  canvasResizeObserver.observe(host);
}

function bindFabricUiEvents() {
  if (!fabricCanvas) {
    return;
  }
  fabricCanvas.on('selection:created', updateSelectionUi);
  fabricCanvas.on('selection:updated', updateSelectionUi);
  fabricCanvas.on('selection:cleared', onFabricSelectionCleared);
  fabricCanvas.on('object:modified', onFabricObjectModified);
}

function unbindFabricUiEvents() {
  if (!fabricCanvas) {
    return;
  }
  fabricCanvas.off('selection:created', updateSelectionUi);
  fabricCanvas.off('selection:updated', updateSelectionUi);
  fabricCanvas.off('selection:cleared', onFabricSelectionCleared);
  fabricCanvas.off('object:modified', onFabricObjectModified);
}

function onWindowResize() {
  syncCanvasDisplayScale();
}

function onEditorKeydown(e: KeyboardEvent) {
  if (e.key !== 'Delete') {
    return;
  }
  const t = e.target as HTMLElement | null;
  if (!t) {
    return;
  }
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) {
    return;
  }
  if (!fabricCanvas) {
    return;
  }
  const o = fabricCanvas.getActiveObject();
  if (!o) {
    return;
  }
  if (o instanceof IText && o.isEditing) {
    return;
  }
  if (!(o instanceof FabricImage || o instanceof IText)) {
    return;
  }
  if (o instanceof FabricImage && isFabricTemplatePlaceholder(o)) {
    return;
  }
  e.preventDefault();
  deleteSelectedObject();
}

/** data:/blob: URL 不能带 crossOrigin，否则 fromURL 常失败，画廊进入时 layout 多为 Data URL */
function fabricLoadOptionsForSrc(src: string) {
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return undefined;
  }
  return { crossOrigin: 'anonymous' as const };
}

function isFabricTemplatePlaceholder(obj: FabricImage): boolean {
  const named = obj as unknown as { name?: string };
  const n = named.name ?? '';
  return n.startsWith(FABRIC_TEMPLATE_PLACEHOLDER_PREFIX);
}

function removeFabricTemplatePlaceholders() {
  const c = fabricCanvas;
  if (!c) {
    return;
  }
  const toRemove = c.getObjects().filter(function filterPh(o) {
    return o instanceof FabricImage && isFabricTemplatePlaceholder(o);
  });
  toRemove.forEach(function removeOne(o) {
    c.remove(o);
  });
}

/** 可参与模板槽位对齐的主图（非示例占位、非表情包贴纸） */
function isLayoutSlotCandidateImage(obj: FabricImage): boolean {
  if (isFabricTemplatePlaceholder(obj)) {
    return false;
  }
  const named = obj as unknown as { name?: string };
  if ((named.name ?? '').startsWith(FABRIC_STICKER_NAME_PREFIX)) {
    return false;
  }
  return true;
}

/** 按大致阅读顺序（上→下、左→右）排列，便于与模板槽位顺序对应 */
function collectUserImagesForTemplateRemap(c: Canvas): FabricImage[] {
  const list = c.getObjects().filter(function filterCand(o) {
    return o instanceof FabricImage && isLayoutSlotCandidateImage(o);
  }) as FabricImage[];
  return list.sort(function sortByPosition(a, b) {
    a.setCoords();
    b.setCoords();
    const ra = a.getBoundingRect();
    const rb = b.getBoundingRect();
    if (Math.abs(ra.top - rb.top) > 8) {
      return ra.top - rb.top;
    }
    return ra.left - rb.left;
  });
}

function placeImageFromLayout(img: FabricImage, el: LayoutElement, cw: number, ch: number) {
  img.set({
    originX: 'left',
    originY: 'top',
    objectCaching: false,
    lockRotation: false,
    hasControls: true,
    touchCornerSize: 44,
    cornerSize: 12,
    borderColor: '#0ea5e9',
    cornerColor: '#38bdf8',
    cornerStrokeColor: '#0c4a6e',
    transparentCorners: false,
  });
  img.setControlVisible('mtr', true);
  const boxW = (el.wPct / 100) * cw;
  const boxH = (el.hPct / 100) * ch;
  const elHtml = img.getElement();
  const natW =
    img.width ||
    (elHtml && 'naturalWidth' in elHtml ? (elHtml as HTMLImageElement).naturalWidth : 0) ||
    1;
  const natH =
    img.height ||
    (elHtml && 'naturalHeight' in elHtml ? (elHtml as HTMLImageElement).naturalHeight : 0) ||
    1;
  const scale = Math.min(boxW / natW, boxH / natH);
  img.set({
    scaleX: scale,
    scaleY: scale,
    left: (el.xPct / 100) * cw,
    top: (el.yPct / 100) * ch,
    angle: el.rotation ?? 0,
    name: el.id,
  });
}

function resolveLayoutElementKind(el: LayoutElement): LayoutElementKind {
  if (el.kind) {
    return el.kind;
  }
  if (el.text != null && el.text !== '') {
    return 'text';
  }
  return 'image';
}

function colorToHexForInput(value: unknown): string {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }
  try {
    const hex = new Color(value as string).toHex();
    return `#${hex}`;
  } catch {
    return EDITOR_DEFAULT_CANVAS_BACKGROUND;
  }
}

function canvasBackgroundToCssString(c: Canvas): string {
  const raw = c.backgroundColor;
  if (raw == null || raw === '') {
    return EDITOR_DEFAULT_CANVAS_BACKGROUND;
  }
  if (typeof raw === 'string') {
    return raw;
  }
  try {
    const hex = new Color(raw as unknown as string).toHex();
    return `#${hex}`;
  } catch {
    return EDITOR_DEFAULT_CANVAS_BACKGROUND;
  }
}

function clearCanvasBackgroundImageSilently() {
  const c = fabricCanvas;
  if (!c) {
    return;
  }
  if (c.backgroundImage) {
    c.backgroundImage.dispose();
    c.backgroundImage = undefined;
  }
}

function applyCanvasSolidBackground(hex: string) {
  const c = fabricCanvas;
  if (!c) {
    return;
  }
  c.backgroundColor = hex;
  c.requestRenderAll();
}

async function setCanvasBackgroundImageFromSrc(src: string) {
  const c = fabricCanvas;
  if (!c) {
    return;
  }
  clearCanvasBackgroundImageSilently();
  const cw = c.getWidth();
  const ch = c.getHeight();
  const opts = fabricLoadOptionsForSrc(src);
  const img = opts ? await FabricImage.fromURL(src, opts) : await FabricImage.fromURL(src);
  const nw = img.width || 1;
  const nh = img.height || 1;
  const sc = Math.max(cw / nw, ch / nh);
  img.set({
    scaleX: sc,
    scaleY: sc,
    left: cw / 2,
    top: ch / 2,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  });
  c.backgroundImage = img;
  c.requestRenderAll();
}

function resolveLayoutTextFontWeight(el: LayoutElement): string | number {
  const fw = el.fontWeight;
  if (fw !== undefined && fw !== null && fw !== '') {
    return fw;
  }
  return 'normal';
}

function resolveLayoutTextFontStyle(el: LayoutElement): 'normal' | 'italic' {
  if (el.fontStyle === 'italic' || el.fontStyle === 'oblique') {
    return 'italic';
  }
  return 'normal';
}

function placeTextFromLayout(textObj: IText, el: LayoutElement, cw: number, ch: number) {
  textObj.set({
    originX: 'left',
    originY: 'top',
    objectCaching: false,
    lockRotation: false,
    hasControls: true,
    touchCornerSize: 44,
    cornerSize: 12,
    borderColor: '#0ea5e9',
    cornerColor: '#38bdf8',
    cornerStrokeColor: '#0c4a6e',
    transparentCorners: false,
    left: (el.xPct / 100) * cw,
    top: (el.yPct / 100) * ch,
    angle: el.rotation ?? 0,
    fontSize: el.fontSize ?? EDITOR_DEFAULT_TEXT_FONT_SIZE,
    fill: el.fill ?? EDITOR_DEFAULT_TEXT_FILL,
    fontFamily: el.fontFamily ?? EDITOR_DEFAULT_TEXT_FONT_FAMILY,
    fontWeight: resolveLayoutTextFontWeight(el),
    fontStyle: resolveLayoutTextFontStyle(el),
    name: el.id,
  });
  textObj.setControlVisible('mtr', true);
}

async function loadTemplatesList() {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      console.error('[editor] templates', error);
      toast.error(error.message || '加载模板失败');
      return;
    }
    templates.value = (data as TemplateRow[]) ?? [];
  } catch (e) {
    console.error('[editor] templates', e);
    toast.error('加载模板失败');
  }
}

async function loadImageLayout(row: ImageRow) {
  if (!fabricCanvas) {
    return;
  }
  const layout: PuzzleLayout = row.layout ?? { elements: [] };
  fabricCanvas.clear();
  audioSegments.value = (layout.audioSegments ?? []).map(function cloneAudioSeg(s) {
    return Object.assign({}, s);
  });
  const bg = layout.backgroundColor ?? EDITOR_DEFAULT_CANVAS_BACKGROUND;
  fabricCanvas.backgroundColor = bg;
  uiCanvasBackgroundHex.value = colorToHexForInput(bg);
  if (layout.backgroundImageSrc) {
    await setCanvasBackgroundImageFromSrc(layout.backgroundImageSrc);
  } else {
    clearCanvasBackgroundImageSilently();
  }
  const cw = fabricCanvas.getWidth();
  const ch = fabricCanvas.getHeight();
  const elements = layout.elements ?? [];
  for (const el of elements) {
    const kind = resolveLayoutElementKind(el);
    if (kind === 'text') {
      if (el.text == null) {
        continue;
      }
      const t = new IText(el.text, {
        name: el.id,
      });
      placeTextFromLayout(t, el, cw, ch);
      fabricCanvas.add(t);
      continue;
    }
    if (!el.src) {
      continue;
    }
    try {
      const opts = fabricLoadOptionsForSrc(el.src);
      const img = opts
        ? await FabricImage.fromURL(el.src, opts)
        : await FabricImage.fromURL(el.src);
      placeImageFromLayout(img, el, cw, ch);
      if (kind === 'sticker') {
        img.set({ name: FABRIC_STICKER_NAME_PREFIX + el.id });
      }
      fabricCanvas.add(img);
    } catch (e) {
      console.warn('[editor] skip element', el.id, e);
    }
  }
  requestAnimationFrame(function rerenderLayout() {
    fabricCanvas?.renderAll();
    fabricCanvas?.requestRenderAll();
    syncCanvasDisplayScale();
  });
}

async function loadCurrentImage() {
  if (!imageId.value || !fabricCanvas) {
    return;
  }
  try {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .eq('id', imageId.value)
      .single();
    if (error) {
      console.error('[editor] load image', error);
      toast.error(error.message || '加载作品失败');
      return;
    }
    const row = data as ImageRow;
    selectedTemplateId.value = '';
    templateSlotElements.value = [];
    await loadImageLayout(row);
  } catch (e) {
    console.error('[editor] load image', e);
    toast.error('加载作品失败');
  }
}

async function applyTemplateById(tplId: string) {
  if (!fabricCanvas || !tplId) {
    return;
  }
  const tpl = templates.value.find(function findTpl(t) {
    return t.id === tplId;
  });
  if (!tpl) {
    return;
  }
  templateSlotElements.value = tpl.layout.elements.map(function copySlot(el) {
    return Object.assign({}, el);
  });
  removeFabricTemplatePlaceholders();
  const c = fabricCanvas;
  const cw = c.getWidth();
  const ch = c.getHeight();
  const slotEls = tpl.layout.elements.filter(function slotHasSrc(el) {
    return Boolean(el.src);
  });
  const userImages = collectUserImagesForTemplateRemap(c);

  for (let i = 0; i < slotEls.length; i++) {
    const slot = slotEls[i];
    if (i < userImages.length) {
      const img = userImages[i];
      const named = img as unknown as { name?: string };
      const keepId = named.name || crypto.randomUUID();
      const el: LayoutElement = Object.assign({}, slot, {
        id: keepId,
        src: img.getSrc(),
        rotation: slot.rotation ?? 0,
        zIndex: slot.zIndex,
      });
      placeImageFromLayout(img, el, cw, ch);
      continue;
    }
    try {
      const opts = fabricLoadOptionsForSrc(slot.src!);
      const ph = opts
        ? await FabricImage.fromURL(slot.src!, opts)
        : await FabricImage.fromURL(slot.src!);
      placeImageFromLayout(ph, slot, cw, ch);
      ph.set({ name: FABRIC_TEMPLATE_PLACEHOLDER_PREFIX + slot.id });
      c.add(ph);
      c.sendObjectToBack(ph);
    } catch (e) {
      console.warn('[editor] template placeholder', slot.id, e);
    }
  }

  requestAnimationFrame(function rerenderTpl() {
    fabricCanvas?.renderAll();
    fabricCanvas?.requestRenderAll();
    syncCanvasDisplayScale();
  });
}

function onTemplateChange() {
  if (!selectedTemplateId.value) {
    templateSlotElements.value = [];
    removeFabricTemplatePlaceholders();
    fabricCanvas?.requestRenderAll();
    return;
  }
  applyTemplateById(selectedTemplateId.value).catch(function onTplErr(e) {
    console.error(e);
    toast.error('套用模板失败');
  });
}

async function ingestImageSources(urls: string[]) {
  if (!urls.length) {
    return;
  }
  if (!fabricCanvas) {
    await nextTick();
    initFabricIfNeeded();
  }
  if (!fabricCanvas) {
    toast.error('画布尚未就绪，请稍后再试');
    return;
  }
  const cw = fabricCanvas.getWidth();
  const ch = fabricCanvas.getHeight();
  const slots = templateSlotElements.value;
  const hasPlaceholders = fabricCanvas.getObjects().some(function hasPh(o) {
    return o instanceof FabricImage && isFabricTemplatePlaceholder(o);
  });

  if (slots.length > 0 && hasPlaceholders) {
    removeFabricTemplatePlaceholders();
    let lastAdded: FabricImage | null = null;
    const fillCount = Math.min(slots.length, urls.length);
    for (let i = 0; i < fillCount; i++) {
      const url = urls[i];
      const slot = slots[i];
      const el: LayoutElement = Object.assign({}, slot, {
        id: crypto.randomUUID(),
        src: url,
        zIndex: i,
      });
      const opts = fabricLoadOptionsForSrc(url);
      const img = opts ? await FabricImage.fromURL(url, opts) : await FabricImage.fromURL(url);
      placeImageFromLayout(img, el, cw, ch);
      fabricCanvas.add(img);
      lastAdded = img;
    }
    if (lastAdded) {
      fabricCanvas.setActiveObject(lastAdded);
    }
    updateSelectionUi();
  } else {
    let lastAdded: FabricImage | null = null;
    for (const url of urls) {
      const opts = fabricLoadOptionsForSrc(url);
      const img = opts ? await FabricImage.fromURL(url, opts) : await FabricImage.fromURL(url);
      const el: LayoutElement = {
        id: crypto.randomUUID(),
        src: url,
        xPct: EDITOR_DEFAULT_NEW_IMAGE_LAYOUT.xPct,
        yPct: EDITOR_DEFAULT_NEW_IMAGE_LAYOUT.yPct,
        wPct: EDITOR_DEFAULT_NEW_IMAGE_LAYOUT.wPct,
        hPct: EDITOR_DEFAULT_NEW_IMAGE_LAYOUT.hPct,
        zIndex: fabricCanvas.getObjects().length,
        rotation: 0,
      };
      placeImageFromLayout(img, el, cw, ch);
      fabricCanvas.add(img);
      lastAdded = img;
    }
    if (lastAdded) {
      fabricCanvas.setActiveObject(lastAdded);
    }
    updateSelectionUi();
  }
  requestAnimationFrame(function rerenderIngest() {
    fabricCanvas?.renderAll();
    fabricCanvas?.requestRenderAll();
    syncCanvasDisplayScale();
  });
}

function serializeLayout(c: Canvas): PuzzleLayout {
  const w = c.getWidth();
  const h = c.getHeight();
  const elements: LayoutElement[] = [];
  c.getObjects().forEach(function eachObj(obj, index) {
    obj.setCoords();
    const br = obj.getBoundingRect();
    if (obj instanceof IText) {
      const named = obj as unknown as { name?: string };
      const fillVal = obj.fill;
      const fStyle = obj.fontStyle;
      elements.push({
        id: named.name || crypto.randomUUID(),
        kind: 'text',
        text: obj.text,
        fontSize: obj.fontSize,
        fill: typeof fillVal === 'string' ? fillVal : EDITOR_DEFAULT_TEXT_FILL,
        fontFamily:
          typeof obj.fontFamily === 'string' ? obj.fontFamily : EDITOR_DEFAULT_TEXT_FONT_FAMILY,
        fontWeight: obj.fontWeight,
        fontStyle:
          fStyle === 'italic' || fStyle === 'oblique'
            ? 'italic'
            : fStyle === 'normal'
              ? 'normal'
              : undefined,
        xPct: (br.left / w) * 100,
        yPct: (br.top / h) * 100,
        wPct: (br.width / w) * 100,
        hPct: (br.height / h) * 100,
        zIndex: index,
        rotation: obj.angle,
      });
      return;
    }
    if (obj instanceof FabricImage) {
      const named = obj as unknown as { name?: string };
      const rawName = named.name || crypto.randomUUID();
      let kind: LayoutElementKind = 'image';
      let id = rawName;
      if (rawName.startsWith(FABRIC_STICKER_NAME_PREFIX)) {
        kind = 'sticker';
        id = rawName.slice(FABRIC_STICKER_NAME_PREFIX.length);
      }
      elements.push({
        id,
        kind,
        src: obj.getSrc(),
        xPct: (br.left / w) * 100,
        yPct: (br.top / h) * 100,
        wPct: (br.width / w) * 100,
        hPct: (br.height / h) * 100,
        zIndex: index,
        rotation: obj.angle,
      });
    }
  });
  let backgroundImageSrc: string | null = null;
  const bgi = c.backgroundImage;
  if (bgi instanceof FabricImage) {
    backgroundImageSrc = bgi.getSrc();
  }
  return Object.assign(
    {},
    {
      version: LAYOUT_SCHEMA_VERSION,
      backgroundColor: canvasBackgroundToCssString(c),
      backgroundImageSrc,
      elements,
      audioSegments: audioSegments.value.map(function cloneSeg(s) {
        return Object.assign({}, s);
      }),
    }
  ) as PuzzleLayout;
}

async function saveLayout() {
  if (!fabricCanvas || !imageId.value) {
    toast.error('请先打开画廊中的某一作品');
    return;
  }
  const uid = sessionStore.userId;
  if (!uid) {
    toast.error('请先等待会话初始化');
    return;
  }
  saving.value = true;
  try {
    const layout = serializeLayout(fabricCanvas);
    const { error: upErr } = await supabase
      .from('images')
      .update({ layout })
      .eq('id', imageId.value)
      .select()
      .single();
    if (upErr) {
      console.error('[editor] save layout', upErr);
      toast.error(upErr.message || '保存布局失败');
      return;
    }

    const blob = await fabricCanvasToJpegBlob(fabricCanvas);
    const collagePath = `${uid}/collages/${Date.now()}-puzzle.jpg`;
    const { error: upBlobErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(collagePath, blob, {
        upsert: true,
        contentType: 'image/jpeg',
      });
    if (upBlobErr) {
      console.error('[editor] collage upload', upBlobErr);
      toast.error(upBlobErr.message || '拼团图上传失败');
      return;
    }

    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(collagePath);
    const collageUrl = pub.publicUrl;
    const title = `拼团-${new Date().toLocaleString('zh-CN', { hour12: false })}`;

    const { error: insErr } = await supabase
      .from('images')
      .insert({
        user_id: uid,
        storage_path: collagePath,
        public_url: collageUrl,
        title,
        tags: ['拼团'],
        layout,
        file_size_bytes: blob.size,
        is_public: true,
        gallery_category: GALLERY_CATEGORY_COLLAGE,
        source_image_id: imageId.value,
      })
      .select()
      .single();

    if (insErr) {
      console.error('[editor] collage insert', insErr);
      toast.error(insErr.message || '拼团记录写入失败');
      return;
    }

    toast.success('已保存布局，并生成拼团作品（可在画廊「拼团」中查看）');
  } catch (e) {
    console.error('[editor] save', e);
    toast.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function exportPoster() {
  if (!fabricCanvas) {
    return;
  }
  exporting.value = true;
  try {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready;
    }
    downloadFabricPosterJpeg(fabricCanvas, `poster-${imageId.value || 'draft'}.jpg`);
    toast.success('已开始下载海报');
  } catch (e) {
    console.error('[editor] export', e);
    toast.error('导出失败');
  } finally {
    exporting.value = false;
  }
}

async function exportPosterHtmlWithAudio() {
  if (!fabricCanvas) {
    return;
  }
  exportingHtml.value = true;
  try {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready;
    }
    await downloadFabricPosterWithAudioHtml(
      fabricCanvas,
      audioSegments.value,
      `poster-audio-${imageId.value || 'draft'}`
    );
    toast.success('已开始下载 HTML（请用浏览器打开；多段音乐会按时间轴叠加播放）');
  } catch (e) {
    console.error('[editor] export html+audio', e);
    toast.error(e instanceof Error ? e.message : '导出 HTML 失败');
  } finally {
    exportingHtml.value = false;
  }
}

async function addTextBlock() {
  if (!fabricCanvas) {
    await nextTick();
    initFabricIfNeeded();
  }
  if (!fabricCanvas) {
    toast.error('画布尚未就绪，请稍后再试');
    return;
  }
  const cw = fabricCanvas.getWidth();
  const ch = fabricCanvas.getHeight();
  const id = crypto.randomUUID();
  const t = new IText(EDITOR_DEFAULT_TEXT_CONTENT, {
    name: id,
  });
  const el: LayoutElement = {
    id,
    xPct: 8,
    yPct: 8,
    wPct: 84,
    hPct: 14,
    rotation: 0,
  };
  placeTextFromLayout(t, el, cw, ch);
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  updateSelectionUi();
  fabricCanvas.requestRenderAll();
  requestAnimationFrame(function afterAddText() {
    fabricCanvas?.renderAll();
    syncCanvasDisplayScale();
  });
}

function openStickerPicker() {
  stickerPickerOpen.value = true;
}

async function addStickerImageFromSrc(src: string) {
  if (!fabricCanvas) {
    await nextTick();
    initFabricIfNeeded();
  }
  if (!fabricCanvas) {
    toast.error('画布尚未就绪，请稍后再试');
    return;
  }
  const opts = fabricLoadOptionsForSrc(src);
  const img = opts
    ? await FabricImage.fromURL(src, opts)
    : await FabricImage.fromURL(src);
  const id = crypto.randomUUID();
  const cw = fabricCanvas.getWidth();
  const ch = fabricCanvas.getHeight();
  const el: LayoutElement = {
    id,
    src,
    xPct: EDITOR_DEFAULT_STICKER_LAYOUT.xPct,
    yPct: EDITOR_DEFAULT_STICKER_LAYOUT.yPct,
    wPct: EDITOR_DEFAULT_STICKER_LAYOUT.wPct,
    hPct: EDITOR_DEFAULT_STICKER_LAYOUT.hPct,
    rotation: 0,
  };
  placeImageFromLayout(img, el, cw, ch);
  img.set({ name: FABRIC_STICKER_NAME_PREFIX + id });
  fabricCanvas.add(img);
  fabricCanvas.setActiveObject(img);
  updateSelectionUi();
  fabricCanvas.requestRenderAll();
  requestAnimationFrame(function afterStickerFromSrc() {
    fabricCanvas?.renderAll();
    syncCanvasDisplayScale();
  });
}

async function onStickerPickedUrl(url: string) {
  try {
    await addStickerImageFromSrc(url);
  } catch (e) {
    console.error('[editor] sticker url', e);
    toast.error('加载贴纸失败，请检查网络或换一张图');
  }
}

async function onStickerPickedKaomoji(text: string) {
  if (!fabricCanvas) {
    await nextTick();
    initFabricIfNeeded();
  }
  if (!fabricCanvas) {
    toast.error('画布尚未就绪，请稍后再试');
    return;
  }
  try {
    const id = crypto.randomUUID();
    const cw = fabricCanvas.getWidth();
    const ch = fabricCanvas.getHeight();
    const t = new IText(text, {
      name: id,
    });
    const el: LayoutElement = {
      id,
      xPct: EDITOR_DEFAULT_STICKER_LAYOUT.xPct,
      yPct: EDITOR_DEFAULT_STICKER_LAYOUT.yPct,
      wPct: 36,
      hPct: 12,
      rotation: 0,
      fontSize: 22,
    };
    placeTextFromLayout(t, el, cw, ch);
    fabricCanvas.add(t);
    fabricCanvas.setActiveObject(t);
    updateSelectionUi();
    fabricCanvas.requestRenderAll();
    requestAnimationFrame(function afterKaomoji() {
      fabricCanvas?.renderAll();
      syncCanvasDisplayScale();
    });
  } catch (e) {
    console.error('[editor] kaomoji', e);
    toast.error('添加颜文字失败');
  }
}

async function onStickerPickedFile(file: File) {
  try {
    const dataUrl = await new Promise<string>(function readStickerFile(resolve, reject) {
      const reader = new FileReader();
      reader.onload = function onLoad() {
        resolve(reader.result as string);
      };
      reader.onerror = function onError() {
        reject(reader.error);
      };
      reader.readAsDataURL(file);
    });
    await addStickerImageFromSrc(dataUrl);
  } catch (e) {
    console.error('[editor] sticker file', e);
    toast.error('添加表情包失败');
  }
}

function onCanvasBackgroundColorInput(ev: Event) {
  const hex = (ev.target as HTMLInputElement).value;
  uiCanvasBackgroundHex.value = hex;
  applyCanvasSolidBackground(hex);
}

function triggerBackgroundImagePick() {
  backgroundImageInputRef.value?.click();
}

async function onBackgroundImageFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) {
    return;
  }
  if (!fabricCanvas) {
    await nextTick();
    initFabricIfNeeded();
  }
  if (!fabricCanvas) {
    toast.error('画布尚未就绪');
    return;
  }
  try {
    const dataUrl = await new Promise<string>(function readBg(resolve, reject) {
      const reader = new FileReader();
      reader.onload = function onLoad() {
        resolve(reader.result as string);
      };
      reader.onerror = function onError() {
        reject(reader.error);
      };
      reader.readAsDataURL(file);
    });
    await setCanvasBackgroundImageFromSrc(dataUrl);
  } catch (e) {
    console.error('[editor] background image', e);
    toast.error('设置背景图失败');
  }
}

function clearBackgroundImage() {
  clearCanvasBackgroundImageSilently();
  fabricCanvas?.requestRenderAll();
}

function stopTimelinePreview() {
  audioPreviewTimeouts.forEach(function clearTid(tid) {
    window.clearTimeout(tid);
  });
  audioPreviewTimeouts.length = 0;
  audioPreviewElements.forEach(function stopAudio(a) {
    a.pause();
    a.removeAttribute('src');
    a.load();
  });
  audioPreviewElements.length = 0;
}

function playTimelinePreview() {
  stopTimelinePreview();
  if (!sortedAudioSegments.value.length) {
    toast.error('请先添加至少一段音乐');
    return;
  }
  sortedAudioSegments.value.forEach(function scheduleSeg(seg) {
    const delayMs = Math.max(0, seg.startSec) * 1000;
    const tid = window.setTimeout(function playSeg() {
      const a = new Audio(seg.publicUrl);
      audioPreviewElements.push(a);
      a.play().catch(function onPlayErr(e) {
        console.error('[editor] audio preview', e);
        toast.error('某段音频无法播放，请检查地址或格式');
      });
    }, delayMs);
    audioPreviewTimeouts.push(tid);
  });
  toast.success('已按时间轴排队播放（多段可重叠）');
}

function removeAudioSegment(id: string) {
  audioSegments.value = audioSegments.value.filter(function notId(s) {
    return s.id !== id;
  });
}

function triggerAudioFilePick() {
  audioFileInputRef.value?.click();
}

async function uploadAudioBlobAndAppendSegment(
  blob: Blob,
  startSec: number,
  title: string | undefined,
  sourceUrl: string | undefined,
  filenameHint: string
) {
  const uid = sessionStore.userId;
  if (!uid) {
    toast.error('请先等待会话初始化');
    return;
  }
  if (blob.size > MAX_AUDIO_UPLOAD_BYTES) {
    toast.error(`音频超过 ${MAX_AUDIO_UPLOAD_BYTES / (1024 * 1024)}MB 上限`);
    return;
  }
  const ext = extensionFromAudioMime(blob.type || 'audio/mpeg');
  const stem = safeAudioFileStem(filenameHint);
  const path = `${uid}/${AUDIO_STORAGE_SUBDIR}/${Date.now()}-${stem}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, {
      upsert: true,
      contentType: blob.type || 'audio/mpeg',
    });
  if (upErr) {
    console.error('[editor] audio upload', upErr);
    toast.error(upErr.message || '音频上传失败');
    return;
  }
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const seg: AudioTimelineSegment = {
    id: crypto.randomUUID(),
    startSec,
    storagePath: path,
    publicUrl: pub.publicUrl,
    title: title || undefined,
    sourceUrl: sourceUrl || undefined,
  };
  audioSegments.value = audioSegments.value.concat([seg]);
  toast.success('已添加音频分段');
}

async function addAudioFromNetwork() {
  const url = newAudioUrl.value.trim();
  if (!url) {
    toast.error('请填写音频 URL');
    return;
  }
  audioImportBusy.value = true;
  let blob: Blob;
  try {
    blob = await fetchAudioBlobFromUrl(url);
  } catch (e) {
    console.error('[editor] fetch audio', e);
    toast.error(
      '拉取失败（常为跨域限制）。请换可 CORS 的直链，或使用本地上传。'
    );
    audioImportBusy.value = false;
    return;
  }
  try {
    await uploadAudioBlobAndAppendSegment(
      blob,
      Number(newAudioStartSec.value) || 0,
      newAudioTitle.value.trim() || undefined,
      url,
      'from-url'
    );
    newAudioUrl.value = '';
  } finally {
    audioImportBusy.value = false;
  }
}

async function onAudioFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) {
    return;
  }
  audioImportBusy.value = true;
  try {
    await uploadAudioBlobAndAppendSegment(
      file,
      Number(newAudioStartSec.value) || 0,
      newAudioTitle.value.trim() || file.name,
      undefined,
      file.name
    );
  } finally {
    audioImportBusy.value = false;
  }
}

function triggerLocalImagePick() {
  fileInputRef.value?.click();
}

function openGalleryPicker() {
  galleryPickerOpen.value = true;
}

function onGalleryImagePicked(url: string) {
  ingestImageSources([url]).catch(function onGalleryPickErr(e) {
    console.error('[editor] gallery pick', e);
    toast.error('插入图片失败');
  });
}

async function onImageFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) {
    return;
  }
  try {
    const dataUrl = await new Promise<string>(function readFile(resolve, reject) {
      const reader = new FileReader();
      reader.onload = function onLoad() {
        resolve(reader.result as string);
      };
      reader.onerror = function onError() {
        reject(reader.error);
      };
      reader.readAsDataURL(file);
    });
    await ingestImageSources([dataUrl]);
  } catch (e) {
    console.error('[editor] add image', e);
    toast.error('添加图片失败');
  }
}

function initFabricIfNeeded() {
  const el = canvasElRef.value;
  if (!el || fabricCanvas) {
    return;
  }
  fabricCanvas = new Canvas(el, {
    width: canvasWidth,
    height: canvasHeight,
    backgroundColor: EDITOR_DEFAULT_CANVAS_BACKGROUND,
    // 避免离屏剔除误判导致整图不绘制（部分环境下 vpt + 坐标偶发异常）
    skipOffscreen: false,
    // 避免 backingStore 与 CSS 缩放不一致导致「有画布无像素」
    enableRetinaScaling: false,
    preserveObjectStacking: true,
  });
  // 双 canvas 叠层：upper 透明区必须看到 lower，禁止继承任何不透明白底
  const upper = fabricCanvas.upperCanvasEl;
  if (upper) {
    upper.style.backgroundColor = 'transparent';
  }
  const lower = fabricCanvas.lowerCanvasEl;
  if (lower) {
    lower.style.backgroundColor = 'transparent';
  }
  bindFabricUiEvents();
  uiCanvasBackgroundHex.value = colorToHexForInput(EDITOR_DEFAULT_CANVAS_BACKGROUND);
  nextTick(function afterFabricDom() {
    syncCanvasDisplayScale();
    bindCanvasHostResize();
  });
}

onMounted(function editorMounted() {
  window.addEventListener('keydown', onEditorKeydown);
  window.addEventListener('resize', onWindowResize);
  loadTemplatesList().catch(function noop() {});
  nextTick(function afterMount() {
    initFabricIfNeeded();
    loadCurrentImage().catch(function noop() {});
  });
});

watch(imageId, function onImageIdChange() {
  nextTick(function afterIdChange() {
    initFabricIfNeeded();
    loadCurrentImage().catch(function noop() {});
  });
});

onBeforeUnmount(function editorUnmount() {
  stopTimelinePreview();
  window.removeEventListener('keydown', onEditorKeydown);
  window.removeEventListener('resize', onWindowResize);
  if (canvasResizeObserver) {
    canvasResizeObserver.disconnect();
    canvasResizeObserver = null;
  }
  if (fabricCanvas) {
    unbindFabricUiEvents();
    fabricCanvas.dispose();
    fabricCanvas = null;
  }
});
</script>
