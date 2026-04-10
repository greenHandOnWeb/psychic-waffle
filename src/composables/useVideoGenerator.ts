import {
  MEDIA_RECORDER_TIMESLICE_MS,
  MIN_WEBM_EXPORT_BYTES,
  VIDEO_CAPTURE_STREAM_FPS,
  VIDEO_EXPORT_HEIGHT,
  VIDEO_EXPORT_RECORD_TICK_MS,
  VIDEO_EXPORT_WIDTH,
  VIDEO_RECORD_ENCODER_WARMUP_MS,
  VIDEO_SLIDE_SECONDS_DEFAULT,
  VIDEO_SLIDE_SECONDS_MAX,
  VIDEO_SLIDE_SECONDS_MIN,
} from '@/data';
import type {
  VideoGeneratorAudioExport,
  VideoGeneratorImage,
  VideoGeneratorOptions,
} from '@/types/video';
import {
  drawImageCover,
  loadImageElementForVideo,
  requestCanvasStreamFrame,
} from '@/utils/video-canvas';

type HtmlMediaWithCapture = HTMLMediaElement & { captureStream?: () => MediaStream };

function mediaElementCaptureStream(el: HTMLMediaElement): MediaStream {
  const fn = (el as HtmlMediaWithCapture).captureStream;
  if (typeof fn !== 'function') {
    throw new Error('当前环境不支持 captureStream');
  }
  return fn.call(el);
}

function hasMediaCaptureStream(): boolean {
  return typeof (HTMLMediaElement.prototype as HtmlMediaWithCapture).captureStream === 'function';
}

/** 墙钟等待，避免整段 sleep 与编码器不同步导致总时长偏短 */
function waitDeadlineMs(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  const end = performance.now() + ms;
  return new Promise(function waitLoop(resolve) {
    function tick() {
      if (performance.now() >= end) {
        resolve();
        return;
      }
      const left = end - performance.now();
      window.setTimeout(tick, Math.min(48, Math.max(1, left)));
    }
    tick();
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(function scheduleSleep(resolve) {
    window.setTimeout(resolve, ms);
  });
}

function clampSecondsPerSlide(sec: number): number {
  if (!Number.isFinite(sec)) {
    return VIDEO_SLIDE_SECONDS_DEFAULT;
  }
  return Math.min(VIDEO_SLIDE_SECONDS_MAX, Math.max(VIDEO_SLIDE_SECONDS_MIN, sec));
}

function buildSlideDurationsSec(
  imageCount: number,
  options?: VideoGeneratorOptions
): number[] {
  const list = options?.secondsPerSlideList;
  const out: number[] = [];
  if (Array.isArray(list) && list.length > 0 && imageCount > 0) {
    const lastInList = list[list.length - 1];
    for (let i = 0; i < imageCount; i++) {
      const raw =
        list[i] ?? lastInList ?? options?.secondsPerSlide ?? VIDEO_SLIDE_SECONDS_DEFAULT;
      out.push(clampSecondsPerSlide(Number(raw)));
    }
    return out;
  }
  const per = clampSecondsPerSlide(
    options?.secondsPerSlide ?? VIDEO_SLIDE_SECONDS_DEFAULT
  );
  for (let j = 0; j < imageCount; j++) {
    out.push(per);
  }
  return out;
}

function pickWebmMimeType(withAudio: boolean): string {
  if (withAudio) {
    const withOpus = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm',
    ];
    for (let i = 0; i < withOpus.length; i++) {
      if (
        typeof MediaRecorder !== 'undefined' &&
        MediaRecorder.isTypeSupported(withOpus[i])
      ) {
        return withOpus[i];
      }
    }
    return '';
  }
  const videoOnly = [
    'video/webm;codecs=vp8',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  for (let j = 0; j < videoOnly.length; j++) {
    if (
      typeof MediaRecorder !== 'undefined' &&
      MediaRecorder.isTypeSupported(videoOnly[j])
    ) {
      return videoOnly[j];
    }
  }
  return '';
}

function attachRecordingCanvas(canvas: HTMLCanvasElement, width: number, height: number): void {
  canvas.style.position = 'fixed';
  canvas.style.left = '-10000px';
  canvas.style.top = '0';
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);
}

function detachRecordingCanvas(canvas: HTMLCanvasElement): void {
  if (canvas.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }
}

async function loadExportAudio(spec: VideoGeneratorAudioExport): Promise<HTMLAudioElement> {
  const el = document.createElement('audio');
  el.setAttribute('playsinline', 'true');
  el.volume = 1;
  el.muted = false;
  el.preload = 'auto';
  if (spec.crossOrigin) {
    el.crossOrigin = spec.crossOrigin;
  }
  el.src = spec.url;
  await new Promise<void>(function waitAudioReady(resolve, reject) {
    function onLoaded() {
      el.removeEventListener('loadeddata', onLoaded);
      el.removeEventListener('error', onErr);
      resolve();
    }
    function onErr() {
      el.removeEventListener('loadeddata', onLoaded);
      el.removeEventListener('error', onErr);
      reject(new Error('配乐加载失败，无法写入视频'));
    }
    el.addEventListener('loadeddata', onLoaded);
    el.addEventListener('error', onErr);
  });
  return el;
}

export function useVideoGenerator() {
  async function generateVideo(
    images: VideoGeneratorImage[],
    options?: VideoGeneratorOptions
  ): Promise<Blob> {
    const width = options?.width ?? VIDEO_EXPORT_WIDTH;
    const height = options?.height ?? VIDEO_EXPORT_HEIGHT;
    const slideDurationsSec = buildSlideDurationsSec(images.length, options);
    if (slideDurationsSec.length !== images.length) {
      throw new Error(
        `幻灯时长与图片数量不一致（${slideDurationsSec.length}≠${images.length}），请重试导出`
      );
    }
    const onProgress = options?.onProgress;
    const audioSpec = options?.audioExport;

    if (!images.length) {
      throw new Error('请至少选择一张图片');
    }

    const wantAudio = Boolean(audioSpec?.url) && hasMediaCaptureStream();

    if (audioSpec?.url && !wantAudio) {
      throw new Error('当前浏览器不支持将配乐录入视频（缺少 captureStream）');
    }

    let mimeType = pickWebmMimeType(wantAudio);
    if (wantAudio && !mimeType) {
      throw new Error('当前浏览器不支持带配乐的 WebM 编码（需 VP8/VP9 + Opus 等）');
    }
    if (!mimeType) {
      mimeType = pickWebmMimeType(false);
    }
    if (!mimeType) {
      throw new Error('当前浏览器不支持 WebM 视频录制');
    }

    const decoded: HTMLImageElement[] = await Promise.all(
      images.map(function decodeRow(row) {
        const url = row.public_url;
        if (!url) {
          return Promise.reject(new Error(`图片「${row.title || row.id}」缺少预览地址`));
        }
        return loadImageElementForVideo(url);
      })
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法创建 Canvas 2D 上下文');
    }

    attachRecordingCanvas(canvas, width, height);

    const canvasCaptureStream = canvas.captureStream(VIDEO_CAPTURE_STREAM_FPS);

    let exportAudioEl: HTMLAudioElement | null = null;
    function cleanupAudio(): void {
      if (exportAudioEl) {
        exportAudioEl.pause();
        exportAudioEl.src = '';
        exportAudioEl.load();
        exportAudioEl = null;
      }
    }

    let recordStream: MediaStream = canvasCaptureStream;
    const chunks: BlobPart[] = [];
    let recorder: MediaRecorder | null = null;
    let recorderStarted = false;

    try {
      if (wantAudio && audioSpec) {
        exportAudioEl = await loadExportAudio(audioSpec);
      }

      if (exportAudioEl) {
        exportAudioEl.loop = true;
        exportAudioEl.currentTime = 0;
        await exportAudioEl.play();
        const audioCap = mediaElementCaptureStream(exportAudioEl);
        const aTracks = audioCap.getAudioTracks();
        if (!aTracks.length) {
          cleanupAudio();
          throw new Error('未能从配乐获取音轨');
        }
        recordStream = new MediaStream([
          ...canvasCaptureStream.getVideoTracks(),
          ...aTracks,
        ]);
      }

      recorder = new MediaRecorder(recordStream, {
        mimeType,
        audioBitsPerSecond: exportAudioEl ? 128000 : undefined,
      });

      const finished = new Promise<Blob>(function bindRecorderPromise(resolve, reject) {
        recorder!.ondataavailable = function onData(e: BlobEvent) {
          if (e.data) {
            chunks.push(e.data);
          }
        };
        recorder!.onerror = function onRecErr(ev) {
          const err = (ev as unknown as { error?: Error }).error;
          reject(err ?? new Error('MediaRecorder 错误'));
        };
        recorder!.onstop = function onStop() {
          const nonEmpty = chunks.filter(function hasSize(part) {
            return part instanceof Blob && part.size > 0;
          });
          resolve(new Blob(nonEmpty.length ? nonEmpty : chunks, { type: mimeType }));
        };
      });

      const tickMs = VIDEO_EXPORT_RECORD_TICK_MS;

      for (let i = 0; i < images.length; i++) {
        if (onProgress) {
          onProgress(i + 1, images.length);
        }

        drawImageCover(ctx, decoded[i], width, height);

        if (!recorderStarted) {
          recorder.start(MEDIA_RECORDER_TIMESLICE_MS);
          recorderStarted = true;
        }

        let slideMs = Math.round(Number(slideDurationsSec[i]) * 1000);
        if (!Number.isFinite(slideMs) || slideMs < 1) {
          slideMs = Math.round(VIDEO_SLIDE_SECONDS_DEFAULT * 1000);
        }
        if (i === 0) {
          const warmupMs = Math.min(
            VIDEO_RECORD_ENCODER_WARMUP_MS,
            Math.max(0, slideMs - 1)
          );
          requestCanvasStreamFrame(canvasCaptureStream);
          await waitDeadlineMs(warmupMs);
          slideMs -= warmupMs;
        } else {
          requestCanvasStreamFrame(canvasCaptureStream);
        }

        let left = slideMs;
        while (left > 0) {
          const step = Math.min(tickMs, left);
          requestCanvasStreamFrame(canvasCaptureStream);
          await waitDeadlineMs(step);
          left -= step;
        }
      }

      await sleep(Math.max(400, MEDIA_RECORDER_TIMESLICE_MS * 2));

      if (!recorderStarted) {
        throw new Error('录制未启动');
      }

      if (recorder.state !== 'inactive') {
        if (typeof recorder.requestData === 'function') {
          recorder.requestData();
        }
        await sleep(250);
        recorder.stop();
      }

      const blob = await finished;
      cleanupAudio();

      if (blob.size < MIN_WEBM_EXPORT_BYTES) {
        throw new Error(
          '导出文件仍过小。若使用 Chrome/Edge，请尝试关闭硬件加速后重试，或检查图片地址是否能在无痕窗口单独打开。'
        );
      }
      return blob;
    } catch (e) {
      if (recorder && recorderStarted && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
      cleanupAudio();
      throw e;
    } finally {
      cleanupAudio();
      detachRecordingCanvas(canvas);
    }
  }

  function downloadVideo(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function revoke() {
      URL.revokeObjectURL(url);
    }, 2000);
  }

  return {
    generateVideo,
    downloadVideo,
  };
}
