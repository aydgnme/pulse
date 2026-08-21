import { shouldPrompt } from '../rating';

const ok = {
  bestCount: 3,
  runsSinceLastPrompt: 5,
  promptedVersion: null,
  currentVersion: '1.2.0',
};

describe('shouldPrompt', () => {
  it('prompts once every gate is open', () => {
    expect(shouldPrompt(ok)).toBe(true);
  });

  it('waits until the third personal best', () => {
    expect(shouldPrompt({ ...ok, bestCount: 2 })).toBe(false);
  });

  it('waits five runs after the last prompt', () => {
    expect(shouldPrompt({ ...ok, runsSinceLastPrompt: 4 })).toBe(false);
  });

  it('prompts at most once per version', () => {
    expect(shouldPrompt({ ...ok, promptedVersion: '1.2.0' })).toBe(false);
  });

  it('prompts again after an update', () => {
    expect(shouldPrompt({ ...ok, promptedVersion: '1.1.0' })).toBe(true);
  });
});

// Mock both dependencies rating.ts's counter bookkeeping touches, so the
// tests below never hit real device storage or the real StoreReview flow.
// jest.setup.js already registers trivial global mocks for these modules
// (getItem always null, setItem a no-op) for the whole suite; here we
// replace them with a stateful in-memory AsyncStorage so we can assert on
// the actual stored values, not merely that a mock function was called.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      __store: store,
      getItem: jest.fn((key: string) =>
        Promise.resolve(key in store ? store[key] : null),
      ),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
    },
  };
});

jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(async () => true),
  hasAction: jest.fn(async () => true),
  requestReview: jest.fn(async () => {}),
}));

// __esModule matters here: without it Babel's interop treats the whole mock
// object as the default export, so `Constants.expoConfig` reads undefined and
// rating.ts silently falls back to its '0.0.0' version.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '1.2.0',
    },
  },
}));

const RUNS_KEY = 'pulse.rating.runsSincePrompt';
const BEST_COUNT_KEY = 'pulse.rating.bestCount';
const VERSION_KEY = 'pulse.rating.promptedVersion';

type MockedAsyncStorage = {
  __store: Record<string, string>;
  getItem: jest.Mock;
  setItem: jest.Mock;
};

// recordRunCounters models die(): fired synchronously (well, un-awaited) at
// the moment every run ends, whether or not the player ever comes back to
// the menu. maybePromptForRating models goToMenu: only reachable from that
// one calm moment, and only decides whether to show the native prompt based
// on whatever recordRunCounters has already durably written.
describe('recordRunCounters / maybePromptForRating', () => {
  // jest.mock() factories are hoisted above other module-scope declarations,
  // so a plain closed-over variable declared here would not be the same
  // binding the factory (and thus rating.ts) actually reads and writes —
  // and jest.setup.js has already `require`d (and cached) the module once
  // under its own trivial factory before this file's jest.mock() call can
  // take effect. jest.resetModules() plus a fresh `require` per test sidesteps
  // both problems: it forces re-evaluation of this file's factory (the
  // latest registered one) against a brand-new in-memory store each time.
  let AsyncStorage: MockedAsyncStorage;
  let StoreReview: {
    isAvailableAsync: jest.Mock;
    hasAction: jest.Mock;
    requestReview: jest.Mock;
  };
  let recordRunCounters: (wasPersonalBest: boolean) => Promise<void>;
  let maybePromptForRating: () => Promise<void>;
  let mockStore: Record<string, string>;

  beforeEach(() => {
    jest.resetModules();
    AsyncStorage = require('@react-native-async-storage/async-storage')
      .default as MockedAsyncStorage;
    StoreReview = require('expo-store-review');
    const rating = require('../rating');
    recordRunCounters = rating.recordRunCounters;
    maybePromptForRating = rating.maybePromptForRating;
    mockStore = AsyncStorage.__store;
  });

  it('increments the run counter on an ordinary run', async () => {
    mockStore[RUNS_KEY] = '4';

    await recordRunCounters(false);

    expect(mockStore[RUNS_KEY]).toBe('5');
    expect(mockStore[BEST_COUNT_KEY]).toBeUndefined();
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  // The regression this fix is about: recordRunCounters is called from
  // die(), and die() is the *only* place that fires reliably for every run
  // — retrying a few times or closing the app from the game-over screen
  // never reaches the menu, so maybePromptForRating (and the prompt it
  // guards) might never run in a given session. The counters it wrote must
  // still be sitting there, durable, whenever the app is opened again.
  it("persists a run's counters even when the player never reaches the menu", async () => {
    mockStore[RUNS_KEY] = '1';
    mockStore[BEST_COUNT_KEY] = '1';

    // Three personal-best runs in a row, as if the player died, retried,
    // and died again each time — never once calling maybePromptForRating.
    await recordRunCounters(true);
    await recordRunCounters(true);
    await recordRunCounters(true);

    expect(mockStore[RUNS_KEY]).toBe('4');
    expect(mockStore[BEST_COUNT_KEY]).toBe('4');
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it('a personal best that fails a gate does not prompt but keeps counters coherent', async () => {
    // Only the first personal best: the bestCount gate (>= 3) is not open yet.
    mockStore[RUNS_KEY] = '5';

    await recordRunCounters(true);
    await maybePromptForRating();

    expect(mockStore[RUNS_KEY]).toBe('6');
    expect(mockStore[BEST_COUNT_KEY]).toBe('1');
    expect(mockStore[VERSION_KEY]).toBeUndefined();
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it('a personal best that passes every gate prompts exactly once and resets the run counter', async () => {
    mockStore[BEST_COUNT_KEY] = '2'; // this run makes it 3
    mockStore[RUNS_KEY] = '5'; // this run makes it 6, already >= 5
    // no VERSION_KEY set, so promptedVersion !== currentVersion

    await recordRunCounters(true);
    await maybePromptForRating();

    expect(mockStore[BEST_COUNT_KEY]).toBe('3');
    expect(mockStore[VERSION_KEY]).toBe('1.2.0');
    expect(mockStore[RUNS_KEY]).toBe('0');
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  it('does not clobber the reset on a subsequent run', async () => {
    // Same setup as above: this personal best opens every gate and prompts,
    // resetting the run counter to '0'.
    mockStore[BEST_COUNT_KEY] = '2';
    mockStore[RUNS_KEY] = '5';

    await recordRunCounters(true);
    await maybePromptForRating();
    expect(mockStore[RUNS_KEY]).toBe('0');
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);

    // Both functions share a single write chain specifically so a following
    // run's counter increment can never race the prompt's reset of
    // RUNS_KEY: it must continue cleanly from the reset value instead of
    // reading a stale pre-reset count.
    await recordRunCounters(false);
    expect(mockStore[RUNS_KEY]).toBe('1');
    // No second prompt: promptedVersion already matches currentVersion.
    await maybePromptForRating();
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  it('recordRunCounters queues ahead of a concurrently-fired prompt, so the prompt sees the fresh count', async () => {
    mockStore[BEST_COUNT_KEY] = '2'; // one more makes 3, opening the gate
    mockStore[RUNS_KEY] = '5';

    // Mirrors die() firing recordRunCounters un-awaited, immediately
    // followed (same tick, no menu visit in between) by maybePromptForRating
    // — both queued without awaiting the first before starting the second.
    const counters = recordRunCounters(true);
    const prompt = maybePromptForRating();
    await Promise.all([counters, prompt]);

    expect(mockStore[BEST_COUNT_KEY]).toBe('3');
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  it('recordRunCounters never throws, even when storage rejects', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('boom'));

    await expect(recordRunCounters(true)).resolves.toBeUndefined();
  });

  it('maybePromptForRating never throws, even when storage rejects', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('boom'));

    await expect(maybePromptForRating()).resolves.toBeUndefined();
  });
});
