import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';

const BEST_COUNT_KEY = 'pulse.rating.bestCount';
const RUNS_KEY = 'pulse.rating.runsSincePrompt';
const VERSION_KEY = 'pulse.rating.promptedVersion';

const MIN_BEST_COUNT = 3;
const MIN_RUNS_BETWEEN = 5;

export type RatingState = {
  bestCount: number;
  runsSinceLastPrompt: number;
  promptedVersion: string | null;
  currentVersion: string;
};

/** Pure gate. Prompt only at a happy moment, and rarely. */
export function shouldPrompt(state: RatingState): boolean {
  if (state.bestCount < MIN_BEST_COUNT) return false;
  if (state.runsSinceLastPrompt < MIN_RUNS_BETWEEN) return false;
  if (state.promptedVersion === state.currentVersion) return false;
  return true;
}

async function readNumber(key: string): Promise<number> {
  const raw = await AsyncStorage.getItem(key);
  const n = raw === null ? 0 : parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Call after every finished run, whether or not it was a personal best.
 * Owns `pulse.rating.runsSincePrompt` (and, on a personal best,
 * `pulse.rating.bestCount`) end to end: every step is awaited in order, so
 * there is exactly one writer touching these keys at a time and no
 * read-modify-write race is possible.
 *
 * Silently does nothing when a gate is closed or the platform has no review
 * flow, and never rejects — a rating prompt can never interrupt a run.
 *
 * Note: StoreReview.isAvailableAsync() returns false on TestFlight. The prompt
 * will not appear during TestFlight QA — this is expected, not a defect.
 */
export async function recordRun(wasPersonalBest: boolean): Promise<void> {
  try {
    const runs = (await readNumber(RUNS_KEY)) + 1;
    await AsyncStorage.setItem(RUNS_KEY, String(runs));

    if (!wasPersonalBest) return;

    const bestCount = (await readNumber(BEST_COUNT_KEY)) + 1;
    await AsyncStorage.setItem(BEST_COUNT_KEY, String(bestCount));

    const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
    const state: RatingState = {
      bestCount,
      runsSinceLastPrompt: runs,
      promptedVersion: await AsyncStorage.getItem(VERSION_KEY),
      currentVersion,
    };
    if (!shouldPrompt(state)) return;

    if (!(await StoreReview.isAvailableAsync())) return;
    if (!(await StoreReview.hasAction())) return;

    await StoreReview.requestReview();
    await AsyncStorage.setItem(VERSION_KEY, currentVersion);
    await AsyncStorage.setItem(RUNS_KEY, '0');
  } catch {
    // counters and prompting are best-effort; never let this break the game
  }
}
