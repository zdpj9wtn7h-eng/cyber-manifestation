/* =========================================================================
 * imageLoading.ts — turning a dropped File into something drawable.
 * Nothing ever leaves the browser: we only create local object URLs.
 * ========================================================================= */

import { TEMPLATES, templateSrcFor } from './templates';
import type { DesireImage, TemplateId } from './types';

const MAX_DIMENSION = 1600;
const ACCEPTED = /^image\/(png|jpe?g|webp|gif|avif|bmp)$/i;

export type UploadErrorCode = 'unsupported' | 'decode';

export class UploadError extends Error {
  code: UploadErrorCode;

  constructor(code: UploadErrorCode, message: string) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
  }
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new UploadError('decode', `Could not read ${src}`));
    image.src = src;
  });
}

function detectAlpha(source: CanvasImageSource, width: number, height: number): boolean {
  const size = 40;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(source, 0, 0, size, size);
  try {
    const data = ctx.getImageData(0, 0, size, size).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 240) return true;
    }
  } catch {
    return false;
  }
  void width;
  void height;
  return false;
}

/** Downscale big uploads so the collage stays snappy on a laptop. */
function shrink(image: HTMLImageElement): CanvasImageSource {
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  const longest = Math.max(w, h);
  if (longest <= MAX_DIMENSION) return image;

  const scale = MAX_DIMENSION / longest;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return image;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function fileToDesireImage(file: File): Promise<DesireImage> {
  if (!file.type || !ACCEPTED.test(file.type)) {
    throw new UploadError('unsupported', `${file.name || 'That file'} is not a PNG / JPG / WEBP image.`);
  }

  const url = URL.createObjectURL(file);
  let image: HTMLImageElement;
  try {
    image = await loadImageElement(url);
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error instanceof UploadError
      ? error
      : new UploadError('decode', `${file.name} could not be decoded.`);
  }

  const source = shrink(image);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name || 'desire.png',
    url,
    source,
    width,
    height,
    hasAlpha: detectAlpha(source, width, height),
  };
}

export function releaseDesireImage(image: DesireImage | null): void {
  if (image) URL.revokeObjectURL(image.url);
}

export interface TemplateShelf {
  /** Which template PNGs loaded successfully. */
  pool: TemplateId[];
  /** Base URLs that failed to load, so the UI can tell the user what to drop in. */
  missing: string[];
  images: Partial<Record<TemplateId, HTMLImageElement>>;
}

/**
 * Load the four artworks from /public/templates.
 * A missing file never stops the machine — it is just left out of the pool
 * and reported back so it can be dropped in later.
 */
export async function loadTemplateShelf(): Promise<TemplateShelf> {
  const ids: TemplateId[] = [1, 2, 3, 4];
  const shelf: TemplateShelf = { pool: [], missing: [], images: {} };

  await Promise.all(
    ids.map(async (id) => {
      const src = templateSrcFor(id);
      try {
        const image = await loadImageElement(src);
        shelf.images[id] = image;
        shelf.pool.push(id);
      } catch {
        shelf.missing.push(`public/${TEMPLATES[id].src}`);
      }
    }),
  );

  shelf.pool.sort((a, b) => a - b);
  return shelf;
}
