import { PixelRatio } from 'react-native';

/** Intended output pixel dimensions of the captured share card (9:16 Story). */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

/**
 * The native capturer renders the view at its own point-size and then
 * multiplies by the device's pixel ratio to produce the final bitmap.
 * Laying the card out at the full 1080x1920 *points* would therefore
 * capture a bitmap device-scale-times too large (3240x5760 on a 3x
 * iPhone) — a very large transient bitmap, and react-native-view-shot's
 * own source carries an inline comment that this branch "reports
 * incorrect success even though the image is blank." Scaling the layout
 * down by the device's pixel ratio keeps the captured output at exactly
 * CARD_WIDTH x CARD_HEIGHT pixels, regardless of device scale.
 */
export const CARD_LAYOUT_SCALE = PixelRatio.get() || 1;
export const CARD_LAYOUT_WIDTH = CARD_WIDTH / CARD_LAYOUT_SCALE;
export const CARD_LAYOUT_HEIGHT = CARD_HEIGHT / CARD_LAYOUT_SCALE;

/** Everything the share card needs about a finished run. */
export type RunSnapshot = {
  score: number;
  best: number;
  /** e.g. "MISSED BY 3°" or "TOO SLOW"; null when neither applies. */
  deathNote: string | null;
  /** Where the needle was when the run ended, in degrees. */
  needleAngle: number;
  targetAngle: number;
  /** 0..1, drives the needle colour. */
  tension: number;
};
