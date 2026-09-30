/* =========================================================================
 * render.ts — paints the plan onto the canvas and exports the PNG.
 *
 * The wallpaper is only two things: one of the four artworks, and the
 * repeated / transformed copies of the two uploaded desires. No clip art,
 * no stickers, no text, no film grain — and the canvas always uses the
 * artwork's own aspect ratio.
 * ========================================================================= */

import { createRng, type Rng } from './random';
import type { DesireImage, ManifestationPlan, Placement, Size, Treatment } from './types';

export interface RenderRequest {
  canvas: HTMLCanvasElement;
  plan: ManifestationPlan;
  images: [DesireImage, DesireImage];
  /** null when the chosen template PNG is missing → plain stand-in background. */
  templateImage: CanvasImageSource | null;
}

function sourceSize(source: CanvasImageSource): Size {
  if (source instanceof HTMLImageElement) return { width: source.naturalWidth, height: source.naturalHeight };
  if (source instanceof HTMLCanvasElement) return { width: source.width, height: source.height };
  if (source instanceof ImageBitmap) return { width: source.width, height: source.height };
  if (source instanceof HTMLVideoElement) return { width: source.videoWidth, height: source.videoHeight };
  return { width: 0, height: 0 };
}

/* ---------------------------------------------------------------- scratch --- */

/** One reusable layer that each stamp is printed on before it is placed. */
let stampLayer: HTMLCanvasElement | null = null;
/** Reusable scratch canvas the uploaded picture is measured on. */
let measureLayer: HTMLCanvasElement | null = null;
let noiseTile: HTMLCanvasElement | null = null;
/** Every halftone we have already screened, kept per uploaded picture. */
const halftoneCache = new WeakMap<CanvasImageSource, Map<string, HTMLCanvasElement>>();

function getStampLayer(width: number, height: number): HTMLCanvasElement {
  const canvas = stampLayer ?? document.createElement('canvas');
  stampLayer = canvas;
  if (canvas.width < width || canvas.height < height) {
    canvas.width = Math.max(canvas.width, width);
    canvas.height = Math.max(canvas.height, height);
  } else {
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

/** Film-grain tile: grey noise at full range, printed only inside the stamp. */
function getNoiseTile(): HTMLCanvasElement {
  if (noiseTile) return noiseTile;
  const size = 160;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const data = ctx.createImageData(size, size);
  for (let i = 0; i < data.data.length; i += 4) {
    const value = Math.random() * 255;
    data.data[i] = value;
    data.data[i + 1] = value;
    data.data[i + 2] = value;
    data.data[i + 3] = 205;
  }
  ctx.putImageData(data, 0, 0);
  noiseTile = canvas;
  return canvas;
}

/* ------------------------------------------------------------- halftone --- */

/**
 * The four screens of a cheap colour print, at the classic screen angles.
 * Multiply blending of cyan, magenta, yellow and black dots on white paper.
 */
const INKS: Array<{ colour: string; angle: number }> = [
  { colour: '#00f0ff', angle: 15 }, // cyan
  { colour: '#ff00d0', angle: 75 }, // magenta
  { colour: '#ffe600', angle: 0 }, // yellow
  { colour: '#141414', angle: 45 }, // black
];

/** How much of one ink this colour needs (0..1), CMYK style. */
function inkCoverage(channel: number, r: number, g: number, b: number): number {
  const black = 1 - Math.max(r, g, b);
  if (black >= 1) return channel === 3 ? 1 : 0;
  const rest = 1 - black || 1e-6;
  const values = [(1 - r - black) / rest, (1 - g - black) / rest, (1 - b - black) / rest, black];
  return Math.min(1, Math.max(0, values[channel]));
}

/**
 * Screen one uploaded picture: average it into a grid of cells, then draw each
 * ink as one path of dots. The result is masked back to the picture's own
 * alpha, so transparent PNGs stay transparent and the dots stop at the edges.
 */
function buildHalftone(
  source: CanvasImageSource,
  width: number,
  height: number,
  pitch: number,
  rng: Rng,
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  if (!ctx) return out;

  const measure = measureLayer ?? document.createElement('canvas');
  measureLayer = measure;
  measure.width = width;
  measure.height = height;
  const mctx = measure.getContext('2d', { willReadFrequently: true });
  if (!mctx) return out;

  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.clearRect(0, 0, width, height);
  mctx.imageSmoothingQuality = 'high';
  mctx.drawImage(source, 0, 0, width, height);

  let pixels: Uint8ClampedArray;
  try {
    pixels = mctx.getImageData(0, 0, width, height).data;
  } catch {
    // A tainted canvas can never happen with same-origin uploads, but a plain
    // copy is still better than a blank stamp.
    ctx.drawImage(source, 0, 0, width, height);
    return out;
  }

  /* paper */
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  /* one average colour per cell */
  const cols = Math.ceil(width / pitch);
  const rows = Math.ceil(height / pitch);
  const cells = new Float32Array(cols * rows * 4);
  for (let cellY = 0; cellY < rows; cellY += 1) {
    for (let cellX = 0; cellX < cols; cellX += 1) {
      const x0 = cellX * pitch;
      const y0 = cellY * pitch;
      const x1 = Math.min(width, x0 + pitch);
      const y1 = Math.min(height, y0 + pitch);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const i = (y * width + x) * 4;
          r += pixels[i];
          g += pixels[i + 1];
          b += pixels[i + 2];
          a += pixels[i + 3];
          n += 1;
        }
      }
      const o = (cellY * cols + cellX) * 4;
      if (n > 0) {
        cells[o] = r / n / 255;
        cells[o + 1] = g / n / 255;
        cells[o + 2] = b / n / 255;
        cells[o + 3] = a / n / 255;
      }
    }
  }

  const reach = Math.ceil(Math.hypot(width, height) / pitch / 2) + 2;
  const radiusScale = pitch * 0.5 * 1.45;

  ctx.globalCompositeOperation = 'multiply';
  INKS.forEach((ink, channel) => {
    const rad = (ink.angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // a hair of misregistration, like a press that needed servicing
    const slipX = (rng() - 0.5) * 2.2;
    const slipY = (rng() - 0.5) * 2.2;
    const path = new Path2D();
    let dots = 0;

    for (let j = -reach; j <= reach; j += 1) {
      for (let i = -reach; i <= reach; i += 1) {
        const u = i * pitch;
        const v = j * pitch;
        const x = width / 2 + u * cos - v * sin + slipX;
        const y = height / 2 + u * sin + v * cos + slipY;
        if (x < -pitch || y < -pitch || x > width + pitch || y > height + pitch) continue;

        const cellX = Math.min(cols - 1, Math.max(0, Math.floor(x / pitch)));
        const cellY = Math.min(rows - 1, Math.max(0, Math.floor(y / pitch)));
        const o = (cellY * cols + cellX) * 4;
        const alpha = cells[o + 3];
        if (alpha < 0.06) continue;

        const coverage = inkCoverage(channel, cells[o], cells[o + 1], cells[o + 2]) * alpha;
        if (coverage <= 0.005) continue;

        const radius = Math.max(0.3, radiusScale * Math.sqrt(coverage));
        path.moveTo(x + radius, y);
        path.arc(x, y, radius, 0, Math.PI * 2);
        dots += 1;
      }
    }

    if (dots > 0) {
      ctx.fillStyle = ink.colour;
      ctx.fill(path);
    }
  });

  /* keep the picture's own shape */
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(source, 0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
  return out;
}

/** Screen sizes are capped so a wallpaper never needs more than a few ms. */
const HALFTONE_MAX_EDGE = 460;

function getHalftone(
  source: CanvasImageSource,
  width: number,
  height: number,
  pitch: number,
  rng: Rng,
): HTMLCanvasElement {
  let shelf = halftoneCache.get(source);
  if (!shelf) {
    shelf = new Map();
    halftoneCache.set(source, shelf);
  }
  const key = `${width}x${height}@${pitch}`;
  const cached = shelf.get(key);
  if (cached) return cached;
  const built = buildHalftone(source, width, height, pitch, rng);
  shelf.set(key, built);
  return built;
}

/**
 * Print one stamp: screen it into dots, then grain on top — all masked to the
 * picture's own alpha. Blend modes instead of ctx.filter, so old WebKit works.
 */
function printStamp(
  source: CanvasImageSource,
  width: number,
  height: number,
  treatment: Treatment,
  rng: Rng,
): HTMLCanvasElement {
  const shrink = Math.min(1, HALFTONE_MAX_EDGE / Math.max(width, height));
  const workWidth = Math.max(8, Math.round(width * shrink));
  const workHeight = Math.max(8, Math.round(height * shrink));
  const pitch = Math.round(Math.min(12, Math.max(4, workWidth * (0.008 + 0.018 * treatment.halftone))));
  const screened = getHalftone(source, workWidth, workHeight, pitch, rng);

  const layer = getStampLayer(workWidth, workHeight);
  const ctx = layer.getContext('2d');
  if (!ctx) return screened;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, workWidth, workHeight);
  ctx.drawImage(screened, 0, 0);

  if (treatment.grain > 0) {
    const pattern = ctx.createPattern(getNoiseTile(), 'repeat');
    if (pattern) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = treatment.grain;
      ctx.save();
      ctx.translate(-Math.floor(rng() * 160), -Math.floor(rng() * 160));
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, workWidth + 160, workHeight + 160);
      ctx.restore();
    }
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  return layer;
}

/** Cover-fit: fills the canvas while keeping the artwork's proportions. */
function coverRect(source: Size, target: Size): { x: number; y: number; w: number; h: number } {
  const scale = Math.max(target.width / source.width, target.height / source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  return { x: (target.width - w) / 2, y: (target.height - h) / 2, w, h };
}

/** Stand-in backdrop used only when an artwork PNG is missing. */
function drawMissingArtwork(ctx: CanvasRenderingContext2D, size: Size): void {
  const gradient = ctx.createLinearGradient(0, 0, size.width, size.height);
  gradient.addColorStop(0, '#ff2ea6');
  gradient.addColorStop(0.5, '#8b2bff');
  gradient.addColorStop(1, '#24e6ff');
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size.width * 0.02;
  for (let x = -size.height; x < size.width + size.height; x += size.width * 0.14) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + size.height, size.height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlacement(
  ctx: CanvasRenderingContext2D,
  placement: Placement,
  source: CanvasImageSource,
  treatment: Treatment,
  rng: Rng,
): void {
  const width = Math.max(1, Math.round(placement.width));
  const height = Math.max(1, Math.round(placement.height));
  const stamp = printStamp(source, width, height, treatment, rng);

  ctx.save();
  ctx.globalAlpha = placement.opacity;
  ctx.translate(placement.x, placement.y);
  ctx.rotate((placement.rotation * Math.PI) / 180);
  ctx.drawImage(stamp, 0, 0, stamp.width, stamp.height, -width / 2, -height / 2, width, height);
  ctx.restore();
}

export function renderWallpaper({ canvas, plan, images, templateImage }: RenderRequest): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  const size = plan.size;
  const rng = createRng((plan.seed ^ 0x5bf03635) >>> 0);
  canvas.width = size.width;
  canvas.height = size.height;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.clearRect(0, 0, size.width, size.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  /* 1 — the artwork, exactly as designed --------------------------------- */
  if (templateImage) {
    const art = coverRect(sourceSize(templateImage), size);
    ctx.drawImage(templateImage, art.x, art.y, art.w, art.h);
  } else {
    drawMissingArtwork(ctx, size);
  }

  /* 2 — the two desires, z-sorted so the hero always stays on top --------- */
  const ordered: Array<{ placement: Placement; source: CanvasImageSource }> = [
    ...plan.slots[0].map((placement) => ({ placement, source: images[0].source })),
    ...plan.slots[1].map((placement) => ({ placement, source: images[1].source })),
  ].sort((a, b) => a.placement.z - b.placement.z);

  for (const item of ordered) {
    drawPlacement(ctx, item.placement, item.source, plan.treatment, rng);
  }
}

/**
 * PNG download.
 * Resolves `true` once the file has been handed to the browser, `false` if the
 * canvas could not be encoded — so the UI can tell the user either way.
 */
export async function downloadWallpaperPng(canvas: HTMLCanvasElement, filename: string): Promise<boolean> {
  const trigger = (href: string, revoke: boolean): void => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (revoke) window.setTimeout(() => URL.revokeObjectURL(href), 5000);
  };

  try {
    const blob =
      typeof canvas.toBlob === 'function'
        ? await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/png');
          })
        : null;

    if (blob) {
      trigger(URL.createObjectURL(blob), true);
      return true;
    }
    trigger(canvas.toDataURL('image/png'), false);
    return true;
  } catch {
    return false;
  }
}
