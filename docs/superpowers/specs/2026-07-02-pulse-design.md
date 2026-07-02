# Pulse — one-tap timing game (design)

**Date:** 2026-07-02 · **Platform:** iOS (Expo, works everywhere Expo runs) · **Status:** implemented

## Concept

A needle orbits a ring. A target dot sits somewhere on the ring. Tap when the
needle overlaps the target: score +1, the needle reverses direction, a new
target spawns ahead, and the game gets slightly faster with a slightly smaller
hit window. Tap at the wrong moment — or let the needle sail past the target —
and the run ends. The only input in the entire game is a single tap.

## Why this concept

Considered three one-tap archetypes:

1. **Timing/lock** (chosen) — pure geometry, no physics or collision detection,
   renders at 60 fps with plain React Native views, difficulty curve is two
   numbers (speed, window).
2. Flappy-style gravity hopper — needs obstacle scrolling + collision boxes,
   more assets, harder to make feel fair.
3. Stacking tower — needs more layout work and reads worse on small screens.

Option 1 gives the highest "feel" per line of code and fits the
Expo-only constraint (no game engine, no custom native modules).

## Rules & tuning (src/logic.ts)

- Needle speed: starts 150°/s, +5°/s per hit, capped at 420°/s.
- Hit window: ±30° around the target, shrinks 0.6°/hit, floor ±13°.
- New target spawns 110–250° ahead of the needle in its travel direction.
- A grace window applies just *past* the target (same ±window), so a
  fractionally-late tap still counts.
- Miss = needle exits the grace window with no tap → game over.
- Wrong tap (needle nowhere near target) → game over.
- Restart lockout: taps within 500 ms of death are ignored so a frantic
  last tap doesn't instantly restart the run.

## Architecture

- `src/logic.ts` — pure math (angles, hit/miss detection, difficulty
  progression). No React; unit-testable in Node.
- `src/Game.tsx` — one component owning the whole game. Per-frame state lives
  in refs and drives an `Animated.Value` via `requestAnimationFrame`, so the
  React tree re-renders only on discrete events (hit, death, phase change).
- `src/theme.ts` — palette.
- Phases: `menu → playing → over`, all driven by the single fullscreen
  Pressable. Native uses `onPressIn` (lower latency); web uses `onPress`
  because react-native-web only wires click events reliably.

## Feel & feedback

- Dark navy background, mint needle, coral target, both glowing.
- Every hit: expanding ring pulse + light haptic (expo-haptics).
- Death: red full-screen flash + error haptic.
- Score is huge and centered; best score persists via AsyncStorage and shows
  "NEW BEST" on a record run.

## Stress & retention mechanics (added 2026-07-03)

Four additions, all in service of "simple but stressful, keeps you retrying":

- **PERFECT hits** — the inner 35% of the window scores +2 (vs +1), pops a
  gold "PERFECT +2" toast, bumps the score with a scale pop, and uses a
  heavier haptic. Consecutive perfects show a chain ("PERFECT ×3"). Risk/reward:
  aiming for the center invites late taps.
- **Pressure spawns** — from score 5, each new target has a 25% chance to
  spawn only 65–95° ahead instead of 110–250°: sudden short reaction windows
  that spike the heart rate.
- **Tension colour** — the needle (and hit pulse) drifts from calm mint to hot
  amber as speed approaches the cap, so danger is visible peripherally.
- **Near-miss autopsy** — dying shows *why*: "MISSED BY 3°" for close wrong
  taps (only when ≤25°, otherwise it just says GAME OVER), "TOO SLOW" for
  pass-bys. Near-miss feedback is the classic "one more try" trigger.

Difficulty also ramps slightly faster (speed +6°/s per hit, was +5).

## Pause, menu & sharing (added 2026-07-03)

- Phases extended to `menu → playing ⇄ paused → over`.
- A two-bar pause button (top-right) shows only while playing; it stops event
  propagation so the pause tap never counts as a game tap. Tapping anywhere on
  the pause screen resumes; RESTART and MENU pills offer the other exits.
- The app auto-pauses when it loses foreground (AppState listener) — a timing
  game must not keep running while backgrounded.
- Score sharing uses React Native's built-in `Share` API (native share sheet,
  no extra dependency): SHARE SCORE on the game-over screen, SHARE BEST on the
  menu once a best exists. Failures (dismissed sheet, unsupported web) are
  swallowed silently.

## Out of scope (YAGNI)

Sound, multiple modes, Game Center, tutorials beyond the one-line hint.
