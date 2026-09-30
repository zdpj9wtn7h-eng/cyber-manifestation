/* =========================================================================
 * plan.ts — decides everything before a single pixel is drawn.
 * Random template → random rule set → controlled transforms. The plan is
 * small and printable, which is what the "manifestation report" on the
 * result screen shows back to the user.
 * ========================================================================= */

import { buildComposition, modeLabel } from './compositions';
import { clamp, createRng, pad, pick, randInt, randRange, weightedPick } from './random';
import { TEMPLATES } from './templates';
import type { CompositionMode, DesireImage, ManifestationPlan, Size, TemplateId } from './types';

export interface BuildPlanOptions {
  seed: number;
  /** Templates whose PNG actually loaded — the machine only picks from these. */
  pool: TemplateId[];
  images: [DesireImage, DesireImage];
  /** The loaded artworks, used to match the output ratio to the artwork. */
  templateImages: Partial<Record<TemplateId, HTMLImageElement>>;
}

/** Fallback ratio when no artwork is available (templates 1–4 are 402 × 874). */
const FALLBACK_SIZE = { width: 402, height: 874 };

/**
 * The exported image always keeps the artwork's own aspect ratio, at phone
 * wallpaper resolution: the current 402 × 874 artworks give 1080 × 2348.
 */
function outputSizeFor(artwork: HTMLImageElement | undefined): Size {
  const sourceWidth = artwork?.naturalWidth || FALLBACK_SIZE.width;
  const sourceHeight = artwork?.naturalHeight || FALLBACK_SIZE.height;
  const width = Math.round(clamp(sourceWidth * 2, 1080, 2160));
  const height = Math.round((width * sourceHeight) / sourceWidth);
  return { width, height };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function stamp(): string {
  const now = new Date();
  return `${now.getFullYear()}.${pad2(now.getMonth() + 1)}.${pad2(now.getDate())}`;
}

export function buildPlan({ seed, pool, images, templateImages }: BuildPlanOptions): ManifestationPlan {
  const rng = createRng(seed);
  const available = pool.length ? pool : ([1] as TemplateId[]);
  const templateId = pick(rng, available);
  const cfg = TEMPLATES[templateId];
  const size = outputSizeFor(templateImages[templateId]);

  const mode = weightedPick<CompositionMode>(rng, [
    ['A', cfg.modeWeights.A],
    ['B', cfg.modeWeights.B],
    ['C', cfg.modeWeights.C],
    ['D', cfg.modeWeights.D],
  ]);

  const slots = buildComposition(
    rng,
    cfg,
    mode,
    [
      { width: Math.max(1, images[0].width), height: Math.max(1, images[0].height) },
      { width: Math.max(1, images[1].width), height: Math.max(1, images[1].height) },
    ],
    size,
  );

  const templateMissing = !pool.length;
  const treatment = {
    halftone: randRange(rng, 0.35, 0.85),
    grain: randRange(rng, 0.05, 0.14),
  };

  return {
    seed,
    templateId,
    templateMissing,
    mode,
    size,
    treatment,
    slots,
    meta: {
      templateId,
      templateName: cfg.name,
      mode,
      modeLabel: modeLabel(mode),
      copies: [slots[0].length, slots[1].length],
      seed,
      serial: pad(randInt(rng, 1, 999999), 6),
      createdAt: stamp(),
      templateMissing,
      output: size,
    },
  };
}
