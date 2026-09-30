/* =========================================================================
 * types.ts — the shared vocabulary of the manifestation machine.
 * A "plan" is a pure, serialisable description of one wallpaper: the same
 * plan + the same images always produce the same picture.
 *
 * The wallpaper itself is deliberately minimal: one of the four artworks,
 * plus randomly repeated / transformed copies of the two uploaded desires.
 * No clip art, no stickers, no text.
 * ========================================================================= */

export type TemplateId = 1 | 2 | 3 | 4;

/** Composition rule sets. The machine picks one, then only varies inside it. */
export type CompositionMode = 'A' | 'B' | 'C' | 'D';

export interface Size {
  width: number;
  height: number;
}

/**
 * How the uploaded pictures are printed onto the artwork: as a coarse colour
 * halftone — four rotated dot screens of cyan / magenta / yellow / black —
 * plus a layer of grain. Cheap print, not a clean photo. The colours stay.
 */
export interface Treatment {
  /** 0 = fine screen, 1 = big fat dots */
  halftone: number;
  /** strength of the print grain */
  grain: number;
}

export interface Placement {
  /** Pixel centre on the output canvas. */
  x: number;
  y: number;
  /** Pixel size after every transform (stretch baked in). */
  width: number;
  height: number;
  scale: number;
  rotation: number;
  opacity: number;
  stretchX: number;
  stretchY: number;
  /** Draw order inside the pattern — later copies sit on top. */
  z: number;
  /** Position inside the repeat chain (0 = first stamp). */
  index: number;
}

/** Everything the user is allowed to see about how the picture was decided. */
export interface ManifestationMeta {
  templateId: TemplateId;
  templateName: string;
  mode: CompositionMode;
  modeLabel: string;
  copies: [number, number];
  seed: number;
  serial: string;
  createdAt: string;
  templateMissing: boolean;
  /** Exported PNG size — always the artwork's own aspect ratio. */
  output: Size;
}

export interface ManifestationPlan {
  seed: number;
  templateId: TemplateId;
  templateMissing: boolean;
  mode: CompositionMode;
  size: Size;
  treatment: Treatment;
  /** [ placements for desire #1, placements for desire #2 ] */
  slots: [Placement[], Placement[]];
  meta: ManifestationMeta;
}

/** A user upload that has been decoded and (if needed) downscaled. */
export interface DesireImage {
  id: string;
  name: string;
  /** Object URL, used for the HTML preview only. */
  url: string;
  /** Ready to be drawn on a canvas. */
  source: CanvasImageSource;
  width: number;
  height: number;
  hasAlpha: boolean;
}
