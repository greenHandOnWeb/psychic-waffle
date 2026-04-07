import imageCompression from 'browser-image-compression';
import {
  COMPRESS_MAX_DIMENSION,
  COMPRESS_MAX_SIZE_MB,
  COMPRESS_SKIP_BELOW_BYTES,
  MAX_UPLOAD_BYTES,
} from '@/data';

export class UploadTooLargeError extends Error {
  constructor(message = '图片超过 5MB 上限') {
    super(message);
    this.name = 'UploadTooLargeError';
  }
}

/**
 * 上传前校验大小；超过 {@link MAX_UPLOAD_BYTES} 时抛出 {@link UploadTooLargeError}
 */
export function assertWithinMaxUploadSize(file: File): void {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadTooLargeError();
  }
}

/**
 * 尝试压缩；失败或原文件已小于阈值则返回原始 File
 */
export async function compressImageForUpload(file: File): Promise<File> {
  try {
    if (file.size <= COMPRESS_SKIP_BELOW_BYTES) {
      return file;
    }
    const options = {
      maxWidthOrHeight: COMPRESS_MAX_DIMENSION,
      maxSizeMB: COMPRESS_MAX_SIZE_MB,
      useWebWorker: true,
    };
    const compressed = await imageCompression(file, options);
    return compressed;
  } catch (e) {
    console.warn('[compressImageForUpload] 压缩失败，使用原图', e);
    return file;
  }
}
