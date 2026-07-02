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

## App Store Connect

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps →
   **＋ New App** → iOS, name **Pulse: One Tap Timing**, bundle id
   `com.aydgnme.pulse`, SKU `pulse-ios-1`.
2. Paste name / subtitle / description / keywords / promotional text from
   [`app-store-listing.md`](app-store-listing.md) (EN + TR locales).
3. Upload the four screenshots from [`screenshots/`](screenshots/) (6.9-inch slot).
4. **App Privacy** → "Data Not Collected". Paste your hosted privacy-policy
   URL (push this repo to GitHub and link `store/privacy-policy.md`, or use
   GitHub Pages).
5. Pricing: Free. Availability: all territories (or your pick).
6. Age rating questionnaire → all "No" → 4+.
7. Select the build uploaded by `eas submit`, then **Submit for Review**.

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
