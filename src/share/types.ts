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
