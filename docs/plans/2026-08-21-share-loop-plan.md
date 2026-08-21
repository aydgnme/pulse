# Pulse Share Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain-text score share with a viral loop — an image of the death moment, delivery through the system share sheet, a Universal Link that carries a challenge back into the app, and a gated store-review prompt.

**Architecture:** A new `src/share/` module handles snapshot → card → capture → deliver. The ring renderer is extracted from `src/Game.tsx` into `src/Ring.tsx` so the card and the live game draw from one source. No backend: the shared link carries only an integer.

**Tech Stack:** Expo SDK 57, React Native 0.86.2, React 19.2.3, TypeScript 6, `react-native-view-shot`, `expo-sharing`, `expo-store-review`, `expo-linking`, `expo-file-system`, Jest + `jest-expo`, `@testing-library/react-native`.

**Spec:** `docs/plans/2026-08-21-share-loop-design.md`

## Global Constraints

- **Expo docs:** Read `https://docs.expo.dev/versions/v57.0.0/` before writing code against any Expo module. Per `AGENTS.md`, this is mandatory — the SDK has changed.
- **Commit messages must never mention Claude, Anthropic, or AI assistance.** No `Co-Authored-By` trailer, no "Generated with" footer. Plain conventional commits only.
- **No backend, no analytics, no data collection.** The App Privacy declaration stays "Data Not Collected". Nothing may leave the device except what the user explicitly shares.
- **Every share/review failure degrades silently.** No error dialog may ever interrupt play.
- **Card dimensions:** exactly 1080×1920.
- **Link format:** `https://pulse.aydgn.me/c/<score>` where `<score>` is a non-negative integer.
- **App identity:** bundle id `com.aydgnme.pulse`, Apple team `3T6P4XJ28F`, App Store id `6786884586`.
- **Install dependencies with `npx expo install`, never bare `npm install`** — it picks the SDK-compatible version.
- **Target version:** 1.2.0. Do not bump until Task 10.
- **React 19 note:** `react-test-renderer` does not support React 19. Use `@testing-library/react-native` for any component test.
- Existing palette lives in `src/theme.ts`. Do not introduce new colours except where this plan specifies one.

---

### Task 1: Test harness and `logic.ts` coverage

The repo has no tests. This task creates the harness and proves it by covering the pure game math, which every later task depends on.

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Test: `src/__tests__/logic-test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test`. All later tasks assume `jest` runs with the `jest-expo` preset and that test files live in `src/__tests__/*-test.ts(x)`.

- [ ] **Step 1: Install the harness**

```bash
npx expo install jest-expo jest @types/jest @testing-library/react-native --dev
```

- [ ] **Step 2: Configure Jest in `package.json`**

Add to `scripts`:

```json
"test": "jest"
```

Add a top-level `jest` key:

```json
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
  ]
}
```

- [ ] **Step 3: Add `jest` to TypeScript types**

`tsconfig.json` becomes:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "types": ["jest"]
  }
}
```

- [ ] **Step 4: Write the failing test**

Create `src/__tests__/logic-test.ts`:

```ts
import {
  degreesUntilTarget,
  hitQuality,
  isHit,
  isMissed,
  nearMissDegrees,
  pointsFor,
  speedAfterHit,
  tension,
  TUNING,
  windowAfterHit,
} from '../logic';

describe('degreesUntilTarget', () => {
  it('measures forward travel in the current direction', () => {
    expect(degreesUntilTarget(0, 90, 1)).toBe(90);
    expect(degreesUntilTarget(0, 90, -1)).toBe(270);
  });

  it('wraps to just under 360 right after passing the target', () => {
    expect(degreesUntilTarget(91, 90, 1)).toBe(359);
  });

  it('always returns a value in [0, 360)', () => {
    for (const [n, t, d] of [
      [0, 0, 1],
      [359, 1, 1],
      [1, 359, -1],
      [720, -720, 1],
    ] as const) {
      const v = degreesUntilTarget(n, t, d);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(360);
    }
  });
});

describe('hitQuality', () => {
  it('grades the dead-centre slice as perfect on both sides', () => {
    expect(hitQuality(0, 30)).toBe('perfect');
    expect(hitQuality(359, 30)).toBe('perfect');
  });

  it('grades the rest of the window as good', () => {
    expect(hitQuality(20, 30)).toBe('good');
    expect(hitQuality(340, 30)).toBe('good');
  });

  it('grades outside the window as none', () => {
    expect(hitQuality(45, 30)).toBe('none');
  });
});

describe('pointsFor', () => {
  it('doubles a perfect', () => {
    expect(pointsFor('perfect')).toBe(2);
    expect(pointsFor('good')).toBe(1);
    expect(pointsFor('none')).toBe(1);
  });
});

describe('isHit', () => {
  it('accepts anything inside the window', () => {
    expect(isHit(10, 30)).toBe(true);
    expect(isHit(350, 30)).toBe(true);
    expect(isHit(90, 30)).toBe(false);
  });
});

describe('isMissed', () => {
  it('only fires once the needle has passed and left the window', () => {
    expect(isMissed(180, 30, true)).toBe(true);
    expect(isMissed(180, 30, false)).toBe(false);
    expect(isMissed(350, 30, true)).toBe(false);
  });
});

describe('nearMissDegrees', () => {
  it('returns the margin when the miss was close', () => {
    expect(nearMissDegrees(33, 30)).toBe(3);
  });

  it('returns null when the miss was too wide to sting', () => {
    expect(nearMissDegrees(180, 30)).toBeNull();
  });

  it('never returns zero', () => {
    expect(nearMissDegrees(30, 30)).toBe(1);
  });
});

describe('difficulty curve', () => {
  it('raises speed to a ceiling', () => {
    expect(speedAfterHit(TUNING.startSpeed)).toBe(
      TUNING.startSpeed + TUNING.speedGain,
    );
    expect(speedAfterHit(TUNING.maxSpeed)).toBe(TUNING.maxSpeed);
  });

  it('shrinks the window to a floor', () => {
    expect(windowAfterHit(TUNING.minWindow)).toBe(TUNING.minWindow);
    expect(windowAfterHit(30)).toBeCloseTo(30 - TUNING.windowShrink);
  });

  it('maps speed onto 0..1 tension', () => {
    expect(tension(TUNING.startSpeed)).toBe(0);
    expect(tension(TUNING.maxSpeed)).toBe(1);
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: all tests PASS. If any fail, the failure is a real bug in `src/logic.ts` — report it rather than editing the test to match.

- [ ] **Step 6: Verify types still compile**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json src/__tests__/logic-test.ts
git commit -m "test: add jest harness and cover the pure game math"
```

---

### Task 2: `challengeLink.ts`

**Files:**
- Create: `src/share/challengeLink.ts`
- Test: `src/__tests__/challengeLink-test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `CHALLENGE_HOST: 'pulse.aydgn.me'`
  - `buildChallengeUrl(score: number): string`
  - `parseChallengeUrl(url: string): number | null`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/challengeLink-test.ts`:

```ts
import {
  buildChallengeUrl,
  CHALLENGE_HOST,
  parseChallengeUrl,
} from '../share/challengeLink';

describe('buildChallengeUrl', () => {
  it('builds a challenge url for a score', () => {
    expect(buildChallengeUrl(47)).toBe(`https://${CHALLENGE_HOST}/c/47`);
  });

  it('floors a non-integer score', () => {
    expect(buildChallengeUrl(47.9)).toBe(`https://${CHALLENGE_HOST}/c/47`);
  });

  it('clamps a negative score to zero', () => {
    expect(buildChallengeUrl(-5)).toBe(`https://${CHALLENGE_HOST}/c/0`);
  });
});

describe('parseChallengeUrl', () => {
  it('reads the score back out', () => {
    expect(parseChallengeUrl(`https://${CHALLENGE_HOST}/c/47`)).toBe(47);
  });

  it('round-trips any non-negative integer', () => {
    for (const n of [0, 1, 9, 42, 1000]) {
      expect(parseChallengeUrl(buildChallengeUrl(n))).toBe(n);
    }
  });

  it('rejects a different host', () => {
    expect(parseChallengeUrl('https://example.com/c/47')).toBeNull();
  });

  it('rejects a different path', () => {
    expect(parseChallengeUrl(`https://${CHALLENGE_HOST}/x/47`)).toBeNull();
  });

  it('rejects a non-numeric score', () => {
    expect(parseChallengeUrl(`https://${CHALLENGE_HOST}/c/abc`)).toBeNull();
  });

  it('rejects a negative score', () => {
    expect(parseChallengeUrl(`https://${CHALLENGE_HOST}/c/-1`)).toBeNull();
  });

  it('rejects malformed input without throwing', () => {
    expect(parseChallengeUrl('not a url')).toBeNull();
    expect(parseChallengeUrl('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- challengeLink`
Expected: FAIL — `Cannot find module '../share/challengeLink'`.

- [ ] **Step 3: Write the implementation**

Create `src/share/challengeLink.ts`:

```ts
// Builds and reads the challenge links carried in shared score cards.
// The link carries a score and nothing else — no identity, no session.

export const CHALLENGE_HOST = 'pulse.aydgn.me';

const CHALLENGE_PATH = /^\/c\/(\d+)$/;

export function buildChallengeUrl(score: number): string {
  const n = Math.max(0, Math.floor(score));
  return `https://${CHALLENGE_HOST}/c/${n}`;
}

/** Returns the challenged score, or null if this is not a challenge link. */
export function parseChallengeUrl(url: string): number | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== CHALLENGE_HOST) return null;
  const match = CHALLENGE_PATH.exec(parsed.pathname);
  if (!match) return null;
  const score = Number(match[1]);
  return Number.isSafeInteger(score) ? score : null;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- challengeLink`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/share/challengeLink.ts src/__tests__/challengeLink-test.ts
git commit -m "feat(share): add challenge link builder and parser"
```

---

### Task 3: Extract the ring renderer

A pure refactor plus one new pure function. Behaviour must not change.

**Files:**
- Create: `src/Ring.tsx`
- Modify: `src/logic.ts` (append `dotPosition`)
- Modify: `src/Game.tsx` (replace the ring markup, remove the now-duplicated dot maths)
- Test: `src/__tests__/dotPosition-test.ts`

**Interfaces:**
- Consumes: `COLORS` from `src/theme.ts`.
- Produces:
  - `dotPosition(angleDeg: number, radius: number, dotSize: number): { left: number; top: number }` from `src/logic.ts`
  - `RING_DOT_SIZE: number` and default export `Ring` from `src/Ring.tsx`, props:
    `{ radius: number; needleRotation: Animated.AnimatedInterpolation<string> | string; needleColor: string; targetAngle: number | null }`

- [ ] **Step 1: Write the failing test for the dot maths**

Create `src/__tests__/dotPosition-test.ts`:

```ts
import { dotPosition } from '../logic';

// 0° is the top of the ring, angles increase clockwise.
describe('dotPosition', () => {
  const radius = 100;
  const dot = 20;

  it('puts 0° at the top centre', () => {
    expect(dotPosition(0, radius, dot)).toEqual({ left: 90, top: -10 });
  });

  it('puts 90° at the right edge', () => {
    const p = dotPosition(90, radius, dot);
    expect(p.left).toBeCloseTo(190);
    expect(p.top).toBeCloseTo(90);
  });

  it('puts 180° at the bottom centre', () => {
    const p = dotPosition(180, radius, dot);
    expect(p.left).toBeCloseTo(90);
    expect(p.top).toBeCloseTo(190);
  });

  it('puts 270° at the left edge', () => {
    const p = dotPosition(270, radius, dot);
    expect(p.left).toBeCloseTo(-10);
    expect(p.top).toBeCloseTo(90);
  });

  it('wraps angles beyond a full turn', () => {
    const a = dotPosition(370, radius, dot);
    const b = dotPosition(10, radius, dot);
    expect(a.left).toBeCloseTo(b.left);
    expect(a.top).toBeCloseTo(b.top);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- dotPosition`
Expected: FAIL — `dotPosition is not a function`.

- [ ] **Step 3: Append `dotPosition` to `src/logic.ts`**

```ts
/**
 * Where to place a dot of `dotSize` on a ring of `radius`, in the ring
 * container's coordinates. 0° is the top, angles increase clockwise.
 */
export function dotPosition(
  angleDeg: number,
  radius: number,
  dotSize: number,
): { left: number; top: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    left: radius + radius * Math.sin(rad) - dotSize / 2,
    top: radius - radius * Math.cos(rad) - dotSize / 2,
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- dotPosition`
Expected: PASS, 5 tests.

- [ ] **Step 5: Create `src/Ring.tsx`**

This is lifted verbatim from the markup currently at `src/Game.tsx:411` onward and the styles at `src/Game.tsx:633-659`. The hit-pulse ring stays in `Game.tsx` — it is gameplay feedback, not part of the ring itself.

```tsx
import { Animated, StyleSheet, View } from 'react-native';

import { dotPosition } from './logic';
import { COLORS } from './theme';

export const RING_DOT_SIZE = 20;

type Props = {
  radius: number;
  /** An Animated interpolation for the live game, or a plain '123deg' string. */
  needleRotation: Animated.AnimatedInterpolation<string> | string;
  needleColor: string;
  /** null hides the target dot (the menu shows a bare ring). */
  targetAngle: number | null;
};

/** The ring, the target dot and the needle. Pure presentation. */
export default function Ring({
  radius,
  needleRotation,
  needleColor,
  targetAngle,
}: Props) {
  const target =
    targetAngle === null
      ? null
      : dotPosition(targetAngle, radius, RING_DOT_SIZE);

  return (
    <>
      <View style={[styles.ring, { borderRadius: radius }]} />

      {target && (
        <View
          style={[
            styles.dot,
            styles.targetDot,
            { left: target.left, top: target.top },
          ]}
        />
      )}

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ rotate: needleRotation }] },
        ]}
        pointerEvents="none"
      >
        <View
          style={[
            styles.dot,
            styles.needleDot,
            {
              left: radius - RING_DOT_SIZE / 2,
              top: -RING_DOT_SIZE / 2,
              backgroundColor: needleColor,
              shadowColor: needleColor,
            },
          ]}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: COLORS.ring,
  },
  dot: {
    position: 'absolute',
    width: RING_DOT_SIZE,
    height: RING_DOT_SIZE,
    borderRadius: RING_DOT_SIZE / 2,
  },
  targetDot: {
    backgroundColor: COLORS.target,
    shadowColor: COLORS.target,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  needleDot: {
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
```

- [ ] **Step 6: Rewrite the ring block in `src/Game.tsx`**

Replace the `<View style={[styles.ring, ...]} />`, the target-dot block and the needle `Animated.View` (everything after the `pulseRing` element, up to and including the needle's closing `</Animated.View>`) with:

```tsx
<Ring
  radius={radius}
  needleRotation={rotate}
  needleColor={needleColor}
  targetAngle={phase === 'menu' ? null : targetAngle}
/>
```

Add the import:

```tsx
import Ring from './Ring';
```

Then delete from `src/Game.tsx`:
- the `targetRad` / `targetLeft` / `targetTop` constants (now `dotPosition` inside `Ring`)
- the `DOT` constant, if no other usage remains — check with `grep -n 'DOT' src/Game.tsx` first and keep it if the hit-pulse or another element still uses it
- the `ring`, `dot`, `targetDot` and `needleDot` entries from the local `StyleSheet`

Keep `pulseRing` and every other style.

- [ ] **Step 7: Verify nothing broke**

Run: `npx tsc --noEmit`
Expected: exit 0.

Run: `npm test`
Expected: all PASS.

- [ ] **Step 8: Verify visually**

Run: `npx expo start --web`, play one run, and confirm the ring, the target dot and the needle look and behave exactly as before — same size, same colours, needle still reverses on each hit and drifts mint → amber.

- [ ] **Step 9: Commit**

```bash
git add src/Ring.tsx src/logic.ts src/Game.tsx src/__tests__/dotPosition-test.ts
git commit -m "refactor: extract the ring renderer so the share card can reuse it"
```

---

### Task 4: `RunSnapshot` and the share card

**Files:**
- Create: `src/share/types.ts`
- Create: `src/share/ShareCard.tsx`
- Test: `src/__tests__/ShareCard-test.tsx`

**Interfaces:**
- Consumes: `Ring`, `RING_DOT_SIZE` from `src/Ring.tsx`; `COLORS` from `src/theme.ts`; `CHALLENGE_HOST` from Task 2.
- Produces:
  - `RunSnapshot` from `src/share/types.ts`:
    ```ts
    type RunSnapshot = {
      score: number;
      best: number;
      deathNote: string | null;
      needleAngle: number;
      targetAngle: number;
      tension: number;
    };
    ```
  - `CARD_WIDTH: 1080`, `CARD_HEIGHT: 1920`, default export `ShareCard` from `src/share/ShareCard.tsx`, props `{ snapshot: RunSnapshot }`.

- [ ] **Step 1: Create `src/share/types.ts`**

```ts
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
```

- [ ] **Step 2: Write the failing test**

Create `src/__tests__/ShareCard-test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';

import ShareCard, { CARD_HEIGHT, CARD_WIDTH } from '../share/ShareCard';
import type { RunSnapshot } from '../share/types';

const snapshot: RunSnapshot = {
  score: 47,
  best: 62,
  deathNote: 'MISSED BY 3°',
  needleAngle: 137,
  targetAngle: 140,
  tension: 0.4,
};

describe('ShareCard', () => {
  it('is a 9:16 Story canvas', () => {
    expect(CARD_WIDTH).toBe(1080);
    expect(CARD_HEIGHT).toBe(1920);
  });

  it('shows the score and the challenge', () => {
    render(<ShareCard snapshot={snapshot} />);
    expect(screen.getByText('47')).toBeTruthy();
    expect(screen.getByText('BEAT 47')).toBeTruthy();
  });

  it('shows the death note when there is one', () => {
    render(<ShareCard snapshot={snapshot} />);
    expect(screen.getByText('MISSED BY 3°')).toBeTruthy();
  });

  it('omits the death note when there is none', () => {
    render(<ShareCard snapshot={{ ...snapshot, deathNote: null }} />);
    expect(screen.queryByText('MISSED BY 3°')).toBeNull();
  });

  it('shows the link so a screenshot alone still points home', () => {
    render(<ShareCard snapshot={snapshot} />);
    expect(screen.getByText('pulse.aydgn.me')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- ShareCard`
Expected: FAIL — `Cannot find module '../share/ShareCard'`.

- [ ] **Step 4: Create `src/share/ShareCard.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';

import Ring from '../Ring';
import { COLORS } from '../theme';
import { CHALLENGE_HOST } from './challengeLink';
import type { RunSnapshot } from './types';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

const RING_RADIUS = 340;

/** Needle colour drifts from calm mint to hot amber as the speed climbs. */
function tensionColor(t: number): string {
  const mint = [94, 234, 212];
  const amber = [255, 180, 84];
  const c = mint.map((m, i) => Math.round(m + (amber[i] - m) * Math.min(t, 1)));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/**
 * The 1080x1920 card captured for sharing. Rendered off-screen; never visible
 * in the running game.
 */
export default function ShareCard({ snapshot }: { snapshot: RunSnapshot }) {
  return (
    <View style={styles.card}>
      <Text style={styles.wordmark}>PULSE</Text>

      <View style={styles.ringBox}>
        <Ring
          radius={RING_RADIUS}
          needleRotation={`${snapshot.needleAngle}deg`}
          needleColor={tensionColor(snapshot.tension)}
          targetAngle={snapshot.targetAngle}
        />
      </View>

      {snapshot.deathNote && (
        <Text style={styles.deathNote}>{snapshot.deathNote}</Text>
      )}

      <Text style={styles.score}>{snapshot.score}</Text>
      <Text style={styles.challenge}>BEAT {snapshot.score}</Text>

      <Text style={styles.link}>{CHALLENGE_HOST}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    paddingTop: 150,
    paddingBottom: 110,
  },
  wordmark: {
    color: COLORS.dim,
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: 18,
  },
  ringBox: {
    width: RING_RADIUS * 2,
    height: RING_RADIUS * 2,
    marginTop: 120,
  },
  deathNote: {
    color: COLORS.danger,
    fontSize: 62,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 130,
  },
  score: {
    color: COLORS.text,
    fontSize: 260,
    fontWeight: '800',
    marginTop: 30,
  },
  challenge: {
    color: COLORS.needle,
    fontSize: 76,
    fontWeight: '800',
    letterSpacing: 8,
  },
  link: {
    color: COLORS.dim,
    fontSize: 40,
    letterSpacing: 4,
    marginTop: 'auto',
  },
});
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm test -- ShareCard`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/share/types.ts src/share/ShareCard.tsx src/__tests__/ShareCard-test.tsx
git commit -m "feat(share): add the 1080x1920 score card"
```

---

### Task 5: Capture the card to a PNG

**Files:**
- Create: `src/share/capture.ts`
- Modify: `package.json` (dependency)

**Interfaces:**
- Consumes: `CARD_WIDTH`, `CARD_HEIGHT` from Task 4.
- Produces: `captureCard(ref: React.RefObject<View | null>): Promise<string | null>` — resolves to a `file://` URI, or `null` on any failure.

- [ ] **Step 1: Install the dependency**

```bash
npx expo install react-native-view-shot
```

- [ ] **Step 2: Create `src/share/capture.ts`**

There is no unit test for this step: `captureRef` needs a real native view tree, so it is verified on device in Task 6. Read `https://docs.expo.dev/versions/v57.0.0/sdk/captureRef.md` before writing it.

```ts
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { CARD_HEIGHT, CARD_WIDTH } from './ShareCard';

/**
 * Screenshots the off-screen share card. Returns a temp-file URI, or null if
 * capture failed for any reason — callers fall back to a text-only share
 * rather than surfacing an error.
 */
export async function captureCard(
  ref: React.RefObject<View | null>,
): Promise<string | null> {
  if (!ref.current) return null;
  try {
    return await captureRef(ref, {
      result: 'tmpfile',
      format: 'png',
      quality: 1,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/share/capture.ts
git commit -m "feat(share): capture the score card to a png"
```

---

### Task 6: Deliver the card, and wire it into the game

This is the task that makes the feature real end-to-end: after it, a player can die, tap share, and send an image that carries an install link.

**Files:**
- Create: `src/share/deliver.ts`
- Modify: `src/Game.tsx` (replace `shareScore` at `src/Game.tsx:313`, mount the off-screen card)
- Modify: `package.json` (dependency)
- Test: `src/__tests__/deliver-test.ts`

**Interfaces:**
- Consumes: `buildChallengeUrl` (Task 2), `RunSnapshot` (Task 4), `captureCard` (Task 5).
- Produces: `shareRun(snapshot: RunSnapshot, uri: string | null): Promise<void>` and `shareMessage(score: number, isBest: boolean): string`.

- [ ] **Step 1: Install the dependency**

```bash
npx expo install expo-sharing
```

- [ ] **Step 2: Write the failing test for the message text**

Create `src/__tests__/deliver-test.ts`:

```ts
import { CHALLENGE_HOST } from '../share/challengeLink';
import { shareMessage } from '../share/deliver';

describe('shareMessage', () => {
  it('always carries an install link', () => {
    expect(shareMessage(47, false)).toContain(`https://${CHALLENGE_HOST}/c/47`);
    expect(shareMessage(47, true)).toContain(`https://${CHALLENGE_HOST}/c/47`);
  });

  it('names the score', () => {
    expect(shareMessage(47, false)).toContain('47');
  });

  it('reads differently for a personal best', () => {
    expect(shareMessage(47, true)).not.toBe(shareMessage(47, false));
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- deliver`
Expected: FAIL — `Cannot find module '../share/deliver'`.

- [ ] **Step 4: Create `src/share/deliver.ts`**

```ts
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import { buildChallengeUrl } from './challengeLink';
import type { RunSnapshot } from './types';

export function shareMessage(score: number, isBest: boolean): string {
  const url = buildChallengeUrl(score);
  return isBest
    ? `My best streak in Pulse is ${score}. One tap, perfect timing — beat it: ${url}`
    : `I just scored ${score} in Pulse. One tap, perfect timing — beat it: ${url}`;
}

/**
 * Sends the run out. Prefers the captured image; falls back to text when the
 * capture failed or image sharing is unavailable. Never throws.
 */
export async function shareRun(
  snapshot: RunSnapshot,
  uri: string | null,
): Promise<void> {
  const message = shareMessage(snapshot.score, snapshot.score >= snapshot.best);

  if (uri) {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: message,
          UTI: 'public.png',
        });
        return;
      }
    } catch {
      // fall through to the text share
    }
  }

  try {
    await Share.share({ message });
  } catch {
    // user dismissed the sheet, or sharing is unavailable (e.g. web)
  }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm test -- deliver`
Expected: PASS, 3 tests.

- [ ] **Step 6: Mount the off-screen card in `src/Game.tsx`**

Add imports:

```tsx
import { captureCard } from './share/capture';
import { shareRun } from './share/deliver';
import ShareCard from './share/ShareCard';
import type { RunSnapshot } from './share/types';
```

Add state and a ref beside the existing `useState` block:

```tsx
const [snapshot, setSnapshot] = useState<RunSnapshot | null>(null);
const cardRef = useRef<View | null>(null);
```

In `die`, capture the run state before resetting anything. `die` currently receives the death note; extend it to build the snapshot:

```tsx
setSnapshot({
  score: scoreRef.current,
  best: Math.max(best, scoreRef.current),
  deathNote: note,
  needleAngle: angle.current,
  targetAngle,
  tension: tensionT,
});
```

Replace the whole `shareScore` callback at `src/Game.tsx:313` with:

```tsx
const shareScore = useCallback(async () => {
  if (!snapshot) return;
  const uri = await captureCard(cardRef);
  await shareRun(snapshot, uri);
}, [snapshot]);
```

Update the share button's `onPress`/`onPressIn` to call `shareScore()` with no arguments.

Render the card off-screen as the last child of the root `Pressable`:

```tsx
{snapshot && (
  <View style={styles.cardHost} pointerEvents="none" collapsable={false}>
    <View ref={cardRef} collapsable={false}>
      <ShareCard snapshot={snapshot} />
    </View>
  </View>
)}
```

Add the style:

```tsx
cardHost: {
  position: 'absolute',
  left: -10000,
  top: 0,
  opacity: 0,
},
```

`collapsable={false}` is required on both hosts — without it Android may drop the view before `captureRef` can read it.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0.

Run: `npm test`
Expected: all PASS.

- [ ] **Step 8: Verify on a device**

Run `npx expo start`, open on a real iPhone via Expo Go, play until you die, tap share. Confirm: the share sheet shows an image preview, the image is the card with the needle frozen near the target, and the accompanying text contains `https://pulse.aydgn.me/c/<score>`.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/share/deliver.ts src/Game.tsx src/__tests__/deliver-test.ts
git commit -m "feat(share): share the score card with an install link"
```

---

### Task 7: Universal Link and challenge mode

**Files:**
- Create: `web/.well-known/apple-app-site-association`
- Create: `web/index.html`
- Create: `web/CNAME`
- Modify: `app.json`
- Modify: `src/Game.tsx`
- Test: `src/__tests__/challengeGoal-test.ts`

**Interfaces:**
- Consumes: `parseChallengeUrl` (Task 2).
- Produces: `reachedGoal(score: number, goal: number | null): boolean` in `src/logic.ts`; a `'challenge'` value added to `type Phase`.

- [ ] **Step 1: Create the hosted files**

`web/.well-known/apple-app-site-association` — note: no file extension, and it must be served over HTTPS with no redirect.

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "3T6P4XJ28F.com.aydgnme.pulse",
        "paths": ["/c/*"]
      }
    ]
  }
}
```

`web/CNAME`:

```
pulse.aydgn.me
```

`web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pulse — One Tap Timing</title>
    <meta http-equiv="refresh" content="0; url=https://apps.apple.com/app/id6786884586" />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #070b14;
        color: #eaf2ff;
        font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        text-align: center;
      }
      a { color: #5eead4; }
    </style>
  </head>
  <body>
    <main>
      <h1>Pulse</h1>
      <p>Hit the mark. Beat your best.</p>
      <p><a href="https://apps.apple.com/app/id6786884586">Get it on the App Store</a></p>
    </main>
  </body>
</html>
```

- [ ] **Step 2: Add the associated domain to `app.json`**

Inside `expo.ios`, alongside `bundleIdentifier`:

```json
"associatedDomains": ["applinks:pulse.aydgn.me"]
```

- [ ] **Step 3: Write the failing test**

Create `src/__tests__/challengeGoal-test.ts`:

```ts
import { reachedGoal } from '../logic';

describe('reachedGoal', () => {
  it('is false while below the goal', () => {
    expect(reachedGoal(46, 47)).toBe(false);
  });

  it('is true on reaching the goal', () => {
    expect(reachedGoal(47, 47)).toBe(true);
  });

  it('is true above the goal', () => {
    expect(reachedGoal(48, 47)).toBe(true);
  });

  it('is false when there is no goal', () => {
    expect(reachedGoal(48, null)).toBe(false);
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npm test -- challengeGoal`
Expected: FAIL — `reachedGoal is not a function`.

- [ ] **Step 5: Append `reachedGoal` to `src/logic.ts`**

```ts
/** True once the player has matched or beaten a challenged score. */
export function reachedGoal(score: number, goal: number | null): boolean {
  return goal !== null && score >= goal;
}
```

- [ ] **Step 6: Run it to verify it passes**

Run: `npm test -- challengeGoal`
Expected: PASS, 4 tests.

- [ ] **Step 7: Wire the deep link into `src/Game.tsx`**

Add imports:

```tsx
import * as Linking from 'expo-linking';
import { reachedGoal } from './logic';
import { parseChallengeUrl } from './share/challengeLink';
```

Extend the phase union at `src/Game.tsx:33`:

```tsx
type Phase = 'menu' | 'playing' | 'paused' | 'over' | 'challenge';
```

Add goal state:

```tsx
const [goal, setGoal] = useState<number | null>(null);
```

Handle both the cold start and a link arriving while running:

```tsx
useEffect(() => {
  const accept = (url: string | null) => {
    const challenged = url ? parseChallengeUrl(url) : null;
    if (challenged === null) return;
    setGoal(challenged);
    setPhase('challenge');
  };

  Linking.getInitialURL().then(accept).catch(() => {});
  const sub = Linking.addEventListener('url', ({ url }) => accept(url));
  return () => sub.remove();
}, []);
```

Render the challenge start screen. Add this beside the existing `phase === 'menu'` block, and include `'challenge'` wherever `onTap` currently treats `'menu'` as "start a run" — so tapping starts the run while leaving `goal` set:

```tsx
{phase === 'challenge' && goal !== null && (
  <View style={styles.challengeIntro} pointerEvents="none">
    <Text style={styles.challengeLabel}>YOU WERE CHALLENGED</Text>
    <Text style={styles.challengeGoal}>BEAT {goal}</Text>
    <Text style={styles.challengeHint}>TAP TO START</Text>
  </View>
)}
```

Styles:

```tsx
challengeIntro: {
  position: 'absolute',
  alignItems: 'center',
},
challengeLabel: {
  color: COLORS.dim,
  fontSize: 14,
  fontWeight: '700',
  letterSpacing: 4,
},
challengeGoal: {
  color: COLORS.needle,
  fontSize: 52,
  fontWeight: '800',
  letterSpacing: 4,
  marginTop: 8,
},
challengeHint: {
  color: COLORS.dim,
  fontSize: 13,
  letterSpacing: 3,
  marginTop: 20,
},
```

In `onTap`, the existing `if (phase === 'menu')` branch becomes:

```tsx
if (phase === 'menu' || phase === 'challenge') {
  start();
  return;
}
```

In `registerHit`, after the score updates, check the goal:

```tsx
if (reachedGoal(scoreRef.current, goal)) {
  setPopupText(`BEAT ${goal}!`);
  setGoal(null);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
}
```

`setPopupText` and the popup animation already exist for the PERFECT message; this reuses them rather than adding a second overlay. Check the existing PERFECT branch for the exact animation call to fire alongside `setPopupText`, and mirror it.

```tsx
```

On death while a goal is set, the retry button keeps the goal rather than clearing it.

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm test` → all PASS.

- [ ] **Step 9: Publish the site and verify the association**

Enable GitHub Pages for this repo serving `/web`, and point the `pulse.aydgn.me` CNAME at it. Then:

```bash
curl -sI https://pulse.aydgn.me/.well-known/apple-app-site-association
```

Expected: `HTTP/2 200`, and no redirect. Universal Links do not resolve reliably in the simulator — verify on a physical device by messaging yourself a `https://pulse.aydgn.me/c/12` link and tapping it.

- [ ] **Step 10: Host the privacy policy alongside it**

The App Store listing currently has no hosted privacy policy URL — `store/privacy-policy.md` lists only an email contact. Now that a domain exists, publish it at `https://pulse.aydgn.me/privacy`:

```bash
mkdir -p web/privacy
```

Convert `store/privacy-policy.md` to `web/privacy/index.html` using the same minimal styling as `web/index.html`, then set that URL as the privacy policy in App Store Connect.

- [ ] **Step 11: Commit**

```bash
git add web app.json src/Game.tsx src/logic.ts src/__tests__/challengeGoal-test.ts
git commit -m "feat(share): carry a challenge back into the app over a universal link"
```

---

### Task 8: Store review prompt

**Files:**
- Create: `src/rating.ts`
- Modify: `src/Game.tsx`
- Modify: `package.json` (dependency)
- Test: `src/__tests__/rating-test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `shouldPrompt(state: RatingState): boolean` and `maybeRequestReview(): Promise<void>`, plus `RatingState`:
  ```ts
  type RatingState = {
    bestCount: number;
    runsSinceLastPrompt: number;
    promptedVersion: string | null;
    currentVersion: string;
  };
  ```

- [ ] **Step 1: Install the dependency**

```bash
npx expo install expo-store-review expo-constants
```

`expo-constants` is currently only a transitive dependency; `rating.ts` imports it directly, so it must be declared.

- [ ] **Step 2: Write the failing test**

Create `src/__tests__/rating-test.ts`:

```ts
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
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- rating`
Expected: FAIL — `Cannot find module '../rating'`.

- [ ] **Step 4: Create `src/rating.ts`**

Read `https://docs.expo.dev/versions/v57.0.0/sdk/storereview.md` first.

```ts
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

/** Call after every finished run. */
export async function recordRun(): Promise<void> {
  try {
    const runs = await readNumber(RUNS_KEY);
    await AsyncStorage.setItem(RUNS_KEY, String(runs + 1));
  } catch {
    // counters are best-effort
  }
}

/**
 * Call when the player has just beaten their personal best. Silently does
 * nothing when a gate is closed or the platform has no review flow.
 *
 * Note: StoreReview.isAvailableAsync() returns false on TestFlight. The prompt
 * will not appear during TestFlight QA — this is expected, not a defect.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
    const bestCount = (await readNumber(BEST_COUNT_KEY)) + 1;
    await AsyncStorage.setItem(BEST_COUNT_KEY, String(bestCount));

    const state: RatingState = {
      bestCount,
      runsSinceLastPrompt: await readNumber(RUNS_KEY),
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
    // never let a rating prompt break the game
  }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm test -- rating`
Expected: PASS, 5 tests.

- [ ] **Step 6: Wire it into `src/Game.tsx`**

Import:

```tsx
import { maybeRequestReview, recordRun } from './rating';
```

Inside `die`, after the snapshot is set, call `recordRun()`. In the existing new-best branch — the one at `src/Game.tsx:207` that writes `BEST_KEY` — also call `maybeRequestReview()`. Neither call is awaited; both swallow their own errors.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm test` → all PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/rating.ts src/Game.tsx src/__tests__/rating-test.ts
git commit -m "feat: ask for a store rating after a personal best"
```

---

### Task 9 (optional): Instagram Stories direct path

**Only start this task once a Facebook App ID exists.** The feature is complete and shippable without it — the share sheet already reaches Instagram Stories in two taps.

Posting straight into the Story composer requires writing Instagram's specific pasteboard keys (`com.instagram.sharedSticker.backgroundImage`) to `UIPasteboard`. No Expo JS API exposes those keys, so this needs a small config plugin adding a native module. That is genuine native work, which is why it sits behind the shipping path rather than in front of it.

**Files:**
- Create: `plugins/withInstagramStories.js`
- Create: `modules/instagram-stories/` (native module)
- Modify: `app.json`
- Modify: `src/share/deliver.ts`

- [ ] **Step 1: Add the query scheme to `app.json`**

Inside `expo.ios.infoPlist`:

```json
"LSApplicationQueriesSchemes": ["instagram-stories"]
```

- [ ] **Step 2: Write the native pasteboard module**

Follow `https://docs.expo.dev/modules/overview/` for the current module API. The module exposes one method that takes a PNG file URI and writes it to `UIPasteboard.general` under `com.instagram.sharedSticker.backgroundImage`.

- [ ] **Step 3: Extend `src/share/deliver.ts`**

Add `canUseStories()` using `Linking.canOpenURL('instagram-stories://share')`, and a `shareToStories(uri)` that writes the pasteboard then opens `instagram-stories://share?source_application=<FB_APP_ID>`. On any failure, fall through to the existing `shareRun` path.

- [ ] **Step 4: Verify on a physical device with Instagram installed**

There is no simulator path for this — Instagram must be installed.

- [ ] **Step 5: Commit**

```bash
git add app.json plugins modules src/share/deliver.ts
git commit -m "feat(share): post the score card straight to instagram stories"
```

---

### Task 10: Release 1.2.0

**Files:**
- Modify: `app.json`, `package.json`, `CHANGELOG.md`, `store/RELEASE.md`

- [ ] **Step 1: Bump the version**

Set `"version": "1.2.0"` in both `package.json` and `app.json` (`expo.version`).

- [ ] **Step 2: Add the changelog entry**

Insert above the `## 1.1.0` heading in `CHANGELOG.md`:

```markdown
## 1.2.0 — YYYY-MM-DD

- Share your run as an image: the ring frozen at the moment you missed, the
  near-miss angle, your score, and a challenge to beat it
- Every share now carries an App Store link, so a friend can install from it
- Tapping a shared link opens straight into the challenge with that score as
  the goal
- Asks for an App Store rating after a personal best, never after a death

```

Use the actual date you commit this, matching the format of the entries below it (`2026-08-21`). Run `date +%F` if unsure.

- [ ] **Step 3: Document the new submission requirements**

In `store/RELEASE.md`, add to the App Store Connect section: 1.2.0 introduces a Universal Link, so `pulse.aydgn.me` must be live and serving `/.well-known/apple-app-site-association` before the build is submitted. App Privacy remains "Data Not Collected" — the shared link carries only a score.

- [ ] **Step 4: Verify the whole project**

```bash
npm test && npx tsc --noEmit && npx expo-doctor
```

Expected: tests PASS, `tsc` exit 0, expo-doctor reports all checks passed.

- [ ] **Step 5: Commit**

```bash
git add app.json package.json CHANGELOG.md store/RELEASE.md
git commit -m "chore(release): 1.2.0 with the share loop"
```

- [ ] **Step 6: Build**

```bash
eas build --platform ios --profile production
```

Submission itself needs the Apple account and stays with the maintainer.
