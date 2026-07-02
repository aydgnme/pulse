// Pure game math for Pulse — no React, no side effects.

export const TUNING = {
  startSpeed: 150, // degrees per second
  speedGain: 5,
  maxSpeed: 420,
  startWindow: 30, // half-window in degrees on each side of the target
  windowShrink: 0.6,
  minWindow: 13,
  minSpawnGap: 110, // new target spawns this far ahead of the needle
  maxSpawnGap: 250,
} as const;

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

/** A tap counts if the needle is within the window before or after the target. */
export function isHit(degreesUntil: number, window: number): boolean {
  return degreesUntil <= window || degreesUntil >= 360 - window;
}

/** The needle passed the target and left the grace window without a tap. */
export function isMissed(
  degreesUntil: number,
  window: number,
  passed: boolean,
): boolean {
  return passed && degreesUntil < 360 - window && degreesUntil > window;
}

export function speedAfterHit(speed: number): number {
  return Math.min(speed + TUNING.speedGain, TUNING.maxSpeed);
}

export function windowAfterHit(window: number): number {
  return Math.max(window - TUNING.windowShrink, TUNING.minWindow);
}

export function spawnTarget(
  needleAngle: number,
  dir: 1 | -1,
  random: () => number = Math.random,
): number {
  const gap =
    TUNING.minSpawnGap + random() * (TUNING.maxSpawnGap - TUNING.minSpawnGap);
  return needleAngle + dir * gap;
}
