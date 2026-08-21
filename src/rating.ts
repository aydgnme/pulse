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

// recordRunCounters and maybePromptForRating both read-modify-write
// RUNS_KEY (and recordRunCounters also BEST_COUNT_KEY), so both are routed
// through this single chain to preserve a single-writer guarantee even
// though the two are now called from different places (die() and
// goToMenu) at different times, un-awaited. Without this, a counter write
// racing the prompt's reset of RUNS_KEY could read a stale value and write
// it back after the reset, clobbering it with a stale high count — the
// same bug this module previously fixed once already by merging both
// halves into one function. Every task queued here is caught internally,
// so the chain itself never rejects and a slow/failed task never wedges
// the ones queued after it.
let writeChain: Promise<void> = Promise.resolve();
function enqueue(task: () => Promise<void>): Promise<void> {
  const run = writeChain.then(task);
  writeChain = run;
  return run;
}

/**
 * Call synchronously (un-awaited) at the moment a run ends, whether or not
 * it was a personal best — from die(), not from a later "calm moment".
 * These are just counter increments, invisible to the player, and must be
 * durable immediately: the ordinary way a session ends (die, maybe retry,
 * close the app) never reaches the menu, so anything deferred past this
 * point would be silently lost for a large share of sessions.
 *
 * Owns `pulse.rating.runsSincePrompt` and, on a personal best,
 * `pulse.rating.bestCount`. Never rejects — a rating counter can never
 * interrupt a run.
 */
export function recordRunCounters(wasPersonalBest: boolean): Promise<void> {
  return enqueue(async () => {
    try {
      const runs = (await readNumber(RUNS_KEY)) + 1;
      await AsyncStorage.setItem(RUNS_KEY, String(runs));

      if (!wasPersonalBest) return;

      const bestCount = (await readNumber(BEST_COUNT_KEY)) + 1;
      await AsyncStorage.setItem(BEST_COUNT_KEY, String(bestCount));
    } catch {
      // counters are best-effort; never let this break the game
    }
  });
}

/**
 * Call synchronously (un-awaited) only from a calm moment — currently just
 * goToMenu — never from the death flash or inside the restart lockout
 * window. Evaluates the gate against whatever counters are on disk right
 * now (including any recordRunCounters calls still queued ahead of this
 * one) and, if every gate is open, shows the native prompt.
 *
 * Silently does nothing when a gate is closed or the platform has no review
 * flow, and never rejects — a rating prompt can never interrupt a run.
 *
 * Note: StoreReview.isAvailableAsync() returns false on TestFlight. The prompt
 * will not appear during TestFlight QA — this is expected, not a defect.
 */
export function maybePromptForRating(): Promise<void> {
  return enqueue(async () => {
    try {
      const bestCount = await readNumber(BEST_COUNT_KEY);
      const runsSinceLastPrompt = await readNumber(RUNS_KEY);
      const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
      const state: RatingState = {
        bestCount,
        runsSinceLastPrompt,
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
      // prompting is best-effort; never let this break the game
    }
  });
}
