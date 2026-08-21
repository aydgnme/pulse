# Pulse — Share Loop Design (v1.2)

**Date:** 2026-08-21
**Status:** Approved; not yet implemented.
**Scope:** Replace the plain-text score share with a viral loop: a rendered
image of the death moment, delivery to Instagram Stories and the system share
sheet, a Universal Link that carries a challenge back into the app, and a
store-review prompt. No backend.

## Context

Pulse is an Expo SDK 57 one-tap timing game (`src/Game.tsx`, `src/logic.ts`),
fully offline, on the App Store as id `6786884586`. Version 1.1.0 (Apple Watch
companion) is built and awaiting submission.

The current share is a single `Share.share({ message })` call at
`src/Game.tsx:313`. It sends a sentence of text and **no App Store link**, so a
friend who sees a shared score has no path to install. That is the gap this
design closes.

The goal is App Store **installs**. A share loop drives installs directly
(friend sees → taps → installs). A leaderboard would mainly drive retention, so
it is deliberately deferred to a later sub-project.

### Relevant properties of the existing code

- The ring, needle and target dot are drawn with plain React Native `View`s and
  `Animated` `transform: rotate` — not SVG (`src/Game.tsx:411` onward). This means
  `captureRef` can screenshot them directly, and one renderer can serve both the
  live game and the static card.
- At death the component already holds everything the card needs: `score`,
  `best`, `deathNote`, `angle.current`, `targetAngle`, `window.current`,
  `tensionT`.
- `nearMissDegrees` (`src/logic.ts:74`) already produces the "MISSED BY 3°"
  figure.
- `src/Game.tsx` is 746 lines. Adding share rendering, delivery, deep linking
  and review gating inline would push it past 1000.

### SDK availability (verified against docs.expo.dev/versions/v57.0.0)

`react-native-view-shot` (`captureRef`), `expo-sharing`, `expo-store-review`,
`expo-linking` and `expo-file-system` are all present in SDK 57.

## Goals

1. A shared image that makes the mechanic legible to someone who has never seen
   the game.
2. Every share carries an install path.
3. An installed recipient lands in the challenge, not the menu.
4. Ask for a store rating at a moment the player is happy.

## Non-goals

- Leaderboards, accounts, friend graphs, cloud sync — separate sub-project.
- Analytics of any kind.
- Video capture of the final seconds. Considered and rejected: frame capture
  plus encoding is heavy in Expo, and recording risks frame drops in the game
  loop on low-end devices.
- Sharing from the watchOS companion. watchOS has no share surface worth the
  complexity.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Shared artifact | Static PNG of the death moment | Legible mechanic, cheap and reliable to produce, no encoding risk |
| Card size | 1080×1920 (9:16) | Native Story aspect; also fine in feed and messaging |
| Renderer | Extract `src/Ring.tsx`, shared by game and card | One geometry source; a divergent card looks fake |
| Capture | `react-native-view-shot` `captureRef`, `result: 'tmpfile'`, `format: 'png'` | Officially listed for SDK 57; tmpfile avoids base64 memory cost |
| Story delivery | `instagram-stories://share`, image via pasteboard | Drops the user straight into the Story composer |
| Universal delivery | `expo-sharing` `shareAsync` with the PNG | Reaches WhatsApp, iMessage, TikTok — likely higher install yield than Stories alone |
| Story path gating | Optional; hidden when unavailable | The Facebook App ID is an external dependency and must not block release |
| Deep link | Universal Link on `pulse.aydgn.me` | Carries challenge context; no app-not-installed dead end |
| Link payload | Score only, no identity | Keeps "Data Not Collected" true |
| Review prompt | `expo-store-review`, gated on a positive moment | A prompt after death earns one star |
| Backend | None | Preserves the privacy posture and keeps review surface small |

## Architecture

New modules under `src/share/`, plus two extractions. Each unit has one purpose
and a narrow interface.

| File | Responsibility | Depends on |
|---|---|---|
| `src/Ring.tsx` | Ring, needle, target dot. Accepts a rotation value (number for static, `Animated` for live) plus target angle, window, tension colour. Pure presentation. | none |
| `src/share/ShareCard.tsx` | The 1080×1920 card. Takes a `RunSnapshot`, renders off-screen. | `Ring` |
| `src/share/capture.ts` | `captureCard(ref): Promise<string>` — returns a tmpfile URI. | `react-native-view-shot` |
| `src/share/deliver.ts` | `deliver(uri, text)` — routes to Stories or the share sheet. Exposes `canUseStories()`. | `expo-sharing`, `expo-linking` |
| `src/share/challengeLink.ts` | `buildChallengeUrl(score)` / `parseChallengeUrl(url)`. Pure. | none |
| `src/rating.ts` | `maybeRequestReview(stats)` — the gate. | `expo-store-review`, `AsyncStorage` |
| `src/Game.tsx` | Wires the above; loses the ring markup. | all of the above |

### Data flow

```
death → RunSnapshot { score, best, deathNote, needleAngle, targetAngle,
                      window, tension }
      → <ShareCard> rendered off-screen (absolute, offscreen position)
      → captureRef → file:///…/pulse-<score>.png
      → deliver(uri, "Beat my 47 — https://pulse.aydgn.me/c/47")
          ├─ Stories available → pasteboard + instagram-stories://share
          └─ otherwise        → expo-sharing share sheet
```

Inbound:

```
https://pulse.aydgn.me/c/47
      ├─ app installed     → Linking event → parseChallengeUrl → phase 'challenge', goal 47
      └─ not installed     → index.html redirects to the App Store
```

### `RunSnapshot`

A single plain object defined in `src/share/types.ts`, produced at death by
`Game.tsx` and consumed by `ShareCard`. This is the whole interface between the
game and the share subsystem; nothing else crosses.

## Card content

- Ring centred, needle frozen at the exact angle it missed, target dot in place.
  The angular gap between them is the visual point of the card.
- `MISSED BY 3°` beneath, when `nearMissDegrees` returns a value; `TOO SLOW`
  when the needle sailed past; nothing when neither applies.
- Score, large.
- `BEAT 47` as the call to action.
- Pulse wordmark and `pulse.aydgn.me` at the foot.
- Existing palette from `src/theme.ts`; needle colour uses the run's final
  tension value so a fast death reads amber.

## Challenge mode

A fifth phase alongside the existing `menu` / `playing` / `paused` / `over` (`type Phase`, `src/Game.tsx:33`). When entered
from a link, the goal score is shown persistently ("BEAT 47"). Crossing it
triggers a celebration and an immediate re-share prompt seeded with the new
score — this is what closes the loop. Losing before reaching it offers a retry
that keeps the same goal.

## Universal Link hosting

`pulse.aydgn.me` serves two static files:

- `/.well-known/apple-app-site-association` — JSON, no extension, served over
  HTTPS with no redirect, listing `3T6P4XJ28F.com.aydgnme.pulse` and the `/c/*`
  path.
- `/index.html` — redirects to `https://apps.apple.com/app/id6786884586`.

`app.json` gains `ios.associatedDomains: ["applinks:pulse.aydgn.me"]`. Hosting
is GitHub Pages from this repo with a `CNAME`; no server, no request logging.

## Privacy

Unchanged. The link carries an integer. No identity, no account, no analytics,
no backend, and `pulse.aydgn.me` serves static files without collecting
requests. The App Privacy declaration stays "Data Not Collected" and
`store/privacy-policy.md` needs no revision.

Note that the privacy policy currently lists only an email contact and no hosted
URL; once `pulse.aydgn.me` exists it should also host the policy.

## Review prompt

`maybeRequestReview` fires only when all hold:

- the player just beat their personal best, and
- this is at least the 3rd personal best overall, and
- at least 5 runs have passed since the last prompt, and
- no prompt has been shown for the current app version.

Counters live in `AsyncStorage` beside `pulse.best`. Never fires on the death
screen or mid-run.

`StoreReview.isAvailableAsync()` returns **false on TestFlight** on iOS. The
prompt will therefore not appear during TestFlight QA; this is expected and not
a defect.

## Error handling

Every failure degrades silently and never interrupts play:

- `captureRef` throws → fall back to the current text-only `Share.share`.
- Pasteboard write or `instagram-stories://` open fails → fall back to the
  share sheet.
- `expo-sharing` unavailable → fall back to text-only share.
- `expo-store-review` unavailable or throws → do nothing.
- Malformed inbound URL → `parseChallengeUrl` returns `null`, app opens to the
  normal menu.

## Testing

The repo currently has no test infrastructure. This design introduces Jest with
`jest-expo`, covering the pure modules:

- `challengeLink.ts` — build/parse round trip, malformed URLs, out-of-range and
  non-numeric scores.
- `rating.ts` — each gate condition in isolation and in combination.
- `logic.ts` — existing pure math gains coverage while the harness is being set
  up, since it is the game's core and currently untested.

The card image is verified by eye in the simulator, not asserted in tests.
Universal Links are verified on a physical device, since they do not resolve
from the simulator reliably.

## Release

Ships as **1.2.0**, after 1.1.0. Version 1.1.0 is already built and should be
submitted first rather than held behind this work; the watch companion's
on-device QA is already waiting on that submission.

This release requires a new binary and App Store review. Review risk is low: no
new data collection, no account, no background modes — the categories that
caused the earlier 2.5.4 rejection are untouched.

## External prerequisites

1. **DNS** — `pulse.aydgn.me` CNAME pointing at GitHub Pages.
2. **Facebook App ID** — required by `instagram-stories://share` as
   `source_application`, and an `LSApplicationQueriesSchemes` entry for
   `instagram-stories` in `app.json`. Optional: without it the Story button is
   hidden and the share sheet path carries the full feature.
3. **1.1.0 submission** — `eas submit --platform ios` for the existing build.

## Deferred sub-projects

Named here so the sequencing is explicit; each gets its own spec.

1. **Leaderboard** — global and weekly ranking on Firebase or Supabase. Requires
   server-side score validation (the client cannot be trusted with its own
   score), a rewritten privacy policy, and a new App Privacy declaration.
2. **Retention loop** — daily challenge, streaks, achievements. Mostly offline.
3. **Store conversion** — title, subtitle, keywords, screenshots, App Preview
   video. No code. Note that the ASO Scout report received by email on
   2026-08-19 was assessed and found to contain fabricated data; it is not a
   usable input for this work.
