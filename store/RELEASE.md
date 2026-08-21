# Pulse — App Store release checklist

Everything in the repo is ready; the steps below are the ones only you can do
(they need your Apple account).

## One-time setup

1. **Apple Developer Program** membership ($99/yr) — [developer.apple.com](https://developer.apple.com/programs/enroll/)
2. **EAS CLI:**
   ```bash
   npm install -g eas-cli
   eas login          # Expo account (free)
   ```
3. Link the project (writes `extra.eas.projectId` into app.json — commit it):
   ```bash
   cd pulse
   eas init
   ```

## Build & submit

```bash
eas build --platform ios --profile production
```
- First run asks for your Apple ID and handles certificates/profiles
  automatically. The bundle id is already set: `com.aydgnme.pulse`.

```bash
eas submit --platform ios
```
- Uploads the finished build to App Store Connect (can also be done with the
  Transporter app).

## App Store Connect — 1.1.0 update

The app record already exists (id `6786884586`); this is an update, not a new
app, so the ＋ New App step is done. Build 3 was rejected under guideline 2.5.4
(background audio with no background use); that fix shipped in
`fix: disable background audio mode to resolve App Store 2.5.4 rejection`.

1. My Apps → **Pulse: One Tap Timing** → **＋** next to iOS App → version
   **1.1.0**.
2. Paste "What's New in This Version" from the 1.1.0 entry in
   [`../CHANGELOG.md`](../CHANGELOG.md) (EN + TR locales).
3. **Apple Watch screenshots are required** now that the build embeds a watchOS
   app — App Store Connect will not let you submit without them. Capture them
   from the `PulseWatch` scheme on a watchOS simulator; the generated iPhone
   screenshots in [`screenshots/`](screenshots/) do not cover this slot.
4. Re-check **App Privacy** still reads "Data Not Collected" — the watch app
   stores best score and mute in `UserDefaults` on-device only, which is not
   collection.
5. Select the build uploaded by `eas submit`, then **Submit for Review**.

Listing metadata (name / subtitle / description / keywords / promotional text)
carries over from 1.0.0; change it only if you are also acting on the ASO notes.
Source of truth stays [`app-store-listing.md`](app-store-listing.md).

### Before you submit 1.1.0

The watch app has been compile-verified against a watchOS 26 simulator but has
**not** had on-device QA — see
[`../docs/plans/2026-07-11-watch-app-design.md`](../docs/plans/2026-07-11-watch-app-design.md).
Install the TestFlight build on a real Apple Watch and play a run before
submitting.

Export compliance is pre-answered in code
(`ITSAppUsesNonExemptEncryption: false` in app.json), so no questions at
submission time.

## Sanity checks before submitting

```bash
npx expo-doctor          # config/dependency health
npx expo start           # play a run on a real device via Expo Go
```

Review typically takes 24–48 h. Common first-app rejections to avoid are
already handled: the app works offline, has no login, no placeholder content,
and no broken links.
