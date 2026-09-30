/* =========================================================================
 * compositions.ts — how the copies of your two desires are arranged.
 *
 * This is a **repeat** machine, not a collage machine: each desire is stamped
 * over and over in one direction, and the stamps sit on top of each other in
 * a hand-stacked pile — the logic of a shanzhai wish poster.
 *
 * What stays constant per image: the angle (one shared lean for the whole
 * wallpaper), the distortion, the orientation. What varies a little: the
 * size of each stamp and the exact spacing, so the pile looks stacked by a
 * person rather than by a photocopier.
 *
 * Hard rules enforced here:
 *   · at most 4 copies of one desire
 *   · the top quarter of the screen is never touched (room for the clock)
 *   · the two desires sit in separate lanes that are allowed to overlap
 * ========================================================================= */

import { chance, clamp, jitter, randInt, randRange, type Rng } from './random';
import { MODE_LABELS, type TemplateConfig } from './templates';
import type { CompositionMode, Placement, Size } from './types';

/**
 * Lockscreen-safe area. Everything above `top` stays empty so the phone's
 * clock, date and notifications have somewhere clean to sit.
 */
export const SAFE = { top: 0.26, bottom: 0.935, left: 0.02, right: 0.98 };

/** Hard ceiling on how often one uploaded image may be stamped. */
export const MAX_COPIES = 4;

/** How much the stamp size may wobble inside one pile. */
const SIZE_WOBBLE = 0.07;
/** How uneven the spacing inside one pile may be. */
const SPACING_WOBBLE = 0.24;

interface Offset {
  x: number;
  y: number;
}

type Layout = 'columns' | 'bands';

interface PatternSpec {
  label: string;
  /** min/max number of stamps, before the template's own delta */
  copies: [number, number];
  /** side of the square a stamp is fitted into, as a fraction of canvas width */
  box: number;
  /**
   * Step between two stamps, as a fraction of the stamp's own size:
   * [along the shortest axis, along the marching axis].
   * 0.6 = each stamp overlaps the previous one by 40%.
   */
  step: [number, number];
  /** how much of the template tilt this pattern uses */
  tiltFactor: number;
  /** true = a 2 x 2 block of stamps instead of a chain */
  grid?: boolean;
}

const MODES: Record<CompositionMode, PatternSpec> = {
  A: {
    label: MODE_LABELS.A,
    copies: [1, 2],
    box: 0.56,
    step: [0.14, 0.36],
    tiltFactor: 0.5,
  },
  B: {
    // the reference pile: big bills marching diagonally, heavily overlapped
    label: MODE_LABELS.B,
    copies: [3, 4],
    box: 0.46,
    step: [0.24, 0.6],
    tiltFactor: 1,
  },
  C: {
    label: MODE_LABELS.C,
    copies: [4, 4],
    box: 0.34,
    step: [0.86, 0.8],
    tiltFactor: 0,
    grid: true,
  },
  D: {
    label: MODE_LABELS.D,
    copies: [3, 4],
    box: 0.42,
    step: [0.08, 0.56],
    tiltFactor: 0.35,
  },
};

export function modeLabel(mode: CompositionMode): string {
  return MODE_LABELS[mode];
}

/** Where each desire's pile sits. Slot order is shuffled per generation. */
const LANES: Record<Layout, [Offset, Offset]> = {
  // side by side: one pile upper-left, the other lower-right (see reference)
  columns: [
    { x: 0.33, y: 0.37 },
    { x: 0.67, y: 0.73 },
  ],
  // stacked: one pile in the upper band, one in the lower band
  bands: [
    { x: 0.5, y: 0.35 },
    { x: 0.5, y: 0.71 },
  ],
};

/** Half extents of a rotated stamp, in canvas fractions. */
function extents(width: number, height: number, rotation: number, size: Size): Offset {
  const rad = (Math.abs(rotation) * Math.PI) / 180;
  const ex = (width * Math.cos(rad) + height * Math.sin(rad)) / 2;
  const ey = (width * Math.sin(rad) + height * Math.cos(rad)) / 2;
  return { x: ex / size.width, y: ey / size.height };
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export interface CompositionInput {
  width: number;
  height: number;
}

/**
 * Build the stamp piles for both desires. Both piles are planned together so
 * they always occupy different lanes — but the lanes may overlap.
 */
export function buildComposition(
  rng: Rng,
  cfg: TemplateConfig,
  mode: CompositionMode,
  images: [CompositionInput, CompositionInput],
  size: Size,
): [Placement[], Placement[]] {
  const spec = MODES[mode];
  const layout: Layout = chance(rng, 0.55) ? 'columns' : 'bands';
  const lanes = LANES[layout];
  // which desire takes the first lane is part of the roll
  const laneOrder: [number, number] = chance(rng, 0.5) ? [0, 1] : [1, 0];
  // one shared lean for the whole wallpaper, mirrored when a pile marches left
  const baseTilt = randRange(rng, cfg.tilt * 0.6, cfg.tilt);
  const direction = chance(rng, 0.5) ? 1 : -1;
  const topSlot = chance(rng, 0.5) ? 0 : 1;

  const slots: [Placement[], Placement[]] = [[], []];

  for (let slot = 0; slot < 2; slot += 1) {
    const image = images[slot];
    const count = clamp(randInt(rng, spec.copies[0], spec.copies[1]) + cfg.copyDelta, 1, MAX_COPIES);

    /* --- one stamp size and one distortion for the whole pile -------------- */
    const box = spec.box * cfg.scaleMul * size.width;
    const fit = Math.min(box / image.width, box / image.height);
    const baseWidth = image.width * fit;
    const baseHeight = image.height * fit;
    const stretchX = randRange(rng, 0.96, 1.06);
    const stretchY = randRange(rng, 0.96, 1.08);
    const rotation = direction * baseTilt * spec.tiltFactor;
    const opacity = randRange(rng, Math.max(cfg.opacityMin, 0.88), 1);

    /* --- one step per pile, measured in stamp sizes so the pile always
           overlaps the same way whatever the upload's proportions are -------- */
    const widthNorm = (baseWidth * stretchX) / size.width;
    const heightNorm = (baseHeight * stretchY) / size.height;
    const march =
      layout === 'columns'
        ? { x: spec.step[0] * widthNorm * direction, y: spec.step[1] * heightNorm }
        : { x: spec.step[1] * widthNorm * direction, y: spec.step[0] * heightNorm };

    /* --- the pile: uneven spacing, slightly different sizes ---------------- */
    const offsets: Offset[] = [];
    const scales: number[] = [];
    if (spec.grid) {
      // a block of four stamps instead of a marching pile
      const corners: Array<[number, number]> = [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ];
      for (let i = 0; i < count; i += 1) {
        const [sx, sy] = corners[i % corners.length];
        offsets.push({
          x: direction * sx * spec.step[0] * widthNorm * 0.5 + jitter(rng, 0.012),
          y: sy * spec.step[1] * heightNorm * 0.5 + jitter(rng, 0.012),
        });
        scales.push(1 + jitter(rng, SIZE_WOBBLE));
      }
    } else {
      for (let i = 0; i < count; i += 1) {
        const uneven = 1 + jitter(rng, SPACING_WOBBLE);
        offsets.push({
          x: march.x * i * uneven + jitter(rng, 0.014),
          y: march.y * i * uneven + jitter(rng, 0.012),
        });
        scales.push(1 + jitter(rng, SIZE_WOBBLE));
      }
    }

    const centre = { x: mean(offsets.map((o) => o.x)), y: mean(offsets.map((o) => o.y)) };
    const fitted = offsets.map((offset) => ({ x: offset.x - centre.x, y: offset.y - centre.y }));

    /* --- keep the pile out of the clock zone ------------------------------- */
    const biggest = Math.max(...scales);
    const footprint = extents(
      baseWidth * stretchX * biggest,
      baseHeight * stretchY * biggest,
      rotation,
      size,
    );
    const spanY = (Math.max(...fitted.map((o) => o.y)) - Math.min(...fitted.map((o) => o.y))) || 0;
    const availableY = SAFE.bottom - SAFE.top - footprint.y * 2;
    const squeeze = spanY > availableY && spanY > 0 ? Math.max(0.4, availableY / spanY) : 1;
    const pile = fitted.map((offset) => ({ x: offset.x * squeeze, y: offset.y * squeeze }));

    const lane = lanes[laneOrder[slot]];
    const wanted = { x: lane.x + jitter(rng, 0.045), y: lane.y + jitter(rng, 0.045) };

    const yMin = Math.min(...pile.map((o) => o.y)) - footprint.y;
    const yMax = Math.max(...pile.map((o) => o.y)) + footprint.y;
    const xMin = Math.min(...pile.map((o) => o.x)) - footprint.x;
    const xMax = Math.max(...pile.map((o) => o.x)) + footprint.x;

    const groupX = clamp(wanted.x, Math.min(SAFE.left - xMin, SAFE.right - xMax), Math.max(SAFE.left - xMin, SAFE.right - xMax));
    const groupY = clamp(wanted.y, Math.min(SAFE.top - yMin, SAFE.bottom - yMax), Math.max(SAFE.top - yMin, SAFE.bottom - yMax));

    pile.forEach((offset, index) => {
      const localScale = scales[index];
      const width = baseWidth * stretchX * localScale;
      const height = baseHeight * stretchY * localScale;
      slots[slot].push({
        x: (groupX + offset.x) * size.width,
        y: (groupY + offset.y) * size.height,
        width,
        height,
        scale: Math.max(width, height) / size.width,
        rotation,
        opacity,
        stretchX,
        stretchY,
        z: (slot === topSlot ? 1 : 0) + index * 0.01,
        index,
      });
    });
  }

  return slots;
}
