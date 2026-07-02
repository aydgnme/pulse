// Pure game math for Pulse — no React, no side effects.

export const TUNING = {
  startSpeed: 150, // degrees per second
  speedGain: 6,
  maxSpeed: 420,
  startWindow: 30, // half-window in degrees on each side of the target
  windowShrink: 0.6,
  minWindow: 13,
  minSpawnGap: 110, // new target spawns this far ahead of the needle
  maxSpawnGap: 250,
  perfectFraction: 0.35, // inner slice of the window that counts as PERFECT
  pressureScore: 5, // from this score on, close spawns may appear
  pressureChance: 0.25,
  pressureMinGap: 65, // close spawns: barely enough time to react
  pressureMaxGap: 95,
  nearMissMax: 25, // show "missed by X°" only when it stings
} as const;

export type HitQuality = 'perfect' | 'good' | 'none';

/**
 * Degrees the needle still has to travel (in its current direction)
 * before reaching the target. Always in [0, 360).
 * Right after passing the target this wraps to just under 360.
 */
export function degreesUntilTarget(
  needleAngle: number,
  targetAngle: number,
  dir: 1 | -1,
): number {
  return ((((targetAngle - needleAngle) * dir) % 360) + 360) % 360;
}

/** Grade a tap: dead-center slice is perfect, rest of the window is good. */
export function hitQuality(degreesUntil: number, window: number): HitQuality {
  const perfect = window * TUNING.perfectFraction;
  if (degreesUntil <= perfect || degreesUntil >= 360 - perfect) {
    return 'perfect';
  }
  if (degreesUntil <= window || degreesUntil >= 360 - window) return 'good';
  return 'none';
}

export function pointsFor(quality: HitQuality): number {
  return quality === 'perfect' ? 2 : 1;
}

/** A tap counts if the needle is within the window before or after the target. */
export function isHit(degreesUntil: number, window: number): boolean {
  return hitQuality(degreesUntil, window) !== 'none';
}

/** The needle passed the target and left the grace window without a tap. */
export function isMissed(
  degreesUntil: number,
  window: number,
  passed: boolean,
): boolean {
  return passed && degreesUntil < 360 - window && degreesUntil > window;
}

/**
 * How badly a wrong tap missed the window, for the "so close" death message.
 * Returns null when the miss was too wide to be worth rubbing in.
 */
export function nearMissDegrees(
  degreesUntil: number,
  window: number,
): number | null {
  const margin =
    degreesUntil <= 180 ? degreesUntil - window : 360 - degreesUntil - window;
  const deg = Math.max(1, Math.round(margin));
  return deg <= TUNING.nearMissMax ? deg : null;
}

export function speedAfterHit(speed: number): number {
  return Math.min(speed + TUNING.speedGain, TUNING.maxSpeed);
}

export function windowAfterHit(window: number): number {
  return Math.max(window - TUNING.windowShrink, TUNING.minWindow);
}

/** 0 → calm start, 1 → max speed. Drives the needle's danger colour. */
export function tension(speed: number): number {
  return (speed - TUNING.startSpeed) / (TUNING.maxSpeed - TUNING.startSpeed);
}

export function spawnTarget(
  needleAngle: number,
  dir: 1 | -1,
  score: number,
  random: () => number = Math.random,
): number {
  const pressure =
    score >= TUNING.pressureScore && random() < TUNING.pressureChance;
  const lo = pressure ? TUNING.pressureMinGap : TUNING.minSpawnGap;
  const hi = pressure ? TUNING.pressureMaxGap : TUNING.maxSpawnGap;
  const gap = lo + random() * (hi - lo);
  return needleAngle + dir * gap;
}
