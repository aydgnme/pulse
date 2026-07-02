# Pulse

One-tap timing game built with Expo. A needle orbits a ring — tap when it
overlaps the target dot. Every hit reverses the needle, speeds it up, and
shrinks the hit window. Miss once and the run is over.

## Run it

```bash
npm install
npx expo start
```

Then press `i` for the iOS simulator, or scan the QR code with Expo Go on an
iPhone. (`npx expo start --web` also works for a quick look in the browser.)

## Structure

- [`src/logic.ts`](src/logic.ts) — pure game math (angles, hit/miss, difficulty curve)
- [`src/Game.tsx`](src/Game.tsx) — game component: rAF loop, phases, effects
- [`src/theme.ts`](src/theme.ts) — palette
- [`docs/superpowers/specs/2026-07-02-pulse-design.md`](docs/superpowers/specs/2026-07-02-pulse-design.md) — design doc
