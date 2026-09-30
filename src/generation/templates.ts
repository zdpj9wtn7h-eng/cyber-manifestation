/* =========================================================================
 * templates.ts — the four background artworks + how each one behaves.
 * This is the file to edit when you want to re-tune the machine: every knob
 * (how many copies, how large, how much chaos) lives here, not in the
 * rendering code.
 * ========================================================================= */

import type { CompositionMode, TemplateId } from './types';

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  src: string;
  mood: string;

  /** How likely each composition rule set is for this artwork. */
  modeWeights: Record<CompositionMode, number>;
  /** Added to the base copy count of every composition mode. */
  copyDelta: number;
  /** Multiplies every scale (bigger = louder). */
  scaleMul: number;
  /**
   * How far the whole repeat chain leans, in degrees. Every copy in one
   * wallpaper shares the exact same angle — nothing is turned individually.
   */
  tilt: number;
  /** Lowest opacity a copy may get. */
  opacityMin: number;
}

export const MODE_LABELS: Record<CompositionMode, string> = {
  A: 'CENTERED STACK · 正中疊放',
  B: 'CASCADE REPEAT · 斜向重複',
  C: 'STAMP GRID · 四方蓋印',
  D: 'COLUMN REPEAT · 直向重複',
};

export const TEMPLATES: Record<TemplateId, TemplateConfig> = {
  1: {
    id: 1,
    name: 'RAINBOW ORBIT · 彩虹星軌',
    src: 'templates/template-1.png',
    mood: 'chaotic · saturated · diagonal',
    modeWeights: { A: 1.5, B: 3, C: 2.5, D: 2 },
    copyDelta: 1,
    scaleMul: 1.04,
    tilt: 16,
    opacityMin: 0.9,
  },
  2: {
    id: 2,
    name: 'LOTUS DREAM · 蓮花夜夢',
    src: 'templates/template-2.png',
    mood: 'dreamy · centred · soft',
    modeWeights: { A: 3.5, B: 1, C: 1.2, D: 1.5 },
    copyDelta: -1,
    scaleMul: 1.06,
    tilt: 9,
    opacityMin: 0.93,
  },
  3: {
    id: 3,
    name: 'SKY SERVER · 天空主機',
    src: 'templates/template-3.png',
    mood: 'floating · vertical · open',
    modeWeights: { A: 1.5, B: 1.5, C: 2, D: 3 },
    copyDelta: 0,
    scaleMul: 1,
    tilt: 11,
    opacityMin: 0.9,
  },
  4: {
    id: 4,
    name: 'LUCKY SHAPES · 好運幾何',
    src: 'templates/template-4.png',
    mood: 'commercial · oversized · loud',
    modeWeights: { A: 1.5, B: 3, C: 1.5, D: 2 },
    copyDelta: 1,
    scaleMul: 1.12,
    tilt: 14,
    opacityMin: 0.9,
  },
};

export const TEMPLATE_IDS: TemplateId[] = [1, 2, 3, 4];

export function templateSrcFor(id: TemplateId): string {
  // `import.meta.env.BASE_URL` keeps this working under a sub-path deploy.
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base}${TEMPLATES[id].src}`.replace(/([^:]\/)\/+/g, '$1');
}
