# Shipping NYC Lines to the App Store (Capacitor)

The iOS app is the existing web app wrapped with [Capacitor](https://capacitorjs.com).
All the JS/config is in the repo; the steps below run on a **Mac with Xcode**
once your Apple Developer license is active.

## What's already wired

- `capacitor.config.json` — app id `com.nyclines.app`, name "NYC Lines".
- Native plugins: Geolocation, Push Notifications, App, Splash Screen, Status Bar.
- `src/lib/geo.js` — native geolocation with web fallback (used by the map).
- `src/lib/push.js` — registers for push + stores the device token (after login).
- In-app **account deletion** (Profile → Delete account) → `delete-account` Edge Function.
- Branded icon + splash sources in `lineup/assets/`.
- Edge Functions in `supabase/functions/`: `delete-account` (required) and
  `send-push` (APNs sender; needs your key).

---

## 1. One-time machine setup (Mac)

```bash
xcode-select --install            # Xcode + command line tools (or install Xcode from the App Store)
sudo gem install cocoapods        # or: brew install cocoapods
```

## 2. Configure the build

```bash
cd lineup
npm install
```

Create `lineup/.env` (do **not** commit it) so the native build talks to your
real backend — leave `VITE_DEMO` unset:

```
VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
VITE_MAPBOX_TOKEN=pk.xxx
```

## 3. Create the iOS project

```bash
npm run build:native            # builds dist/ at root base
npx cap add ios                 # creates ios/ (first time only)
npm run assets:generate         # icons + splash from lineup/assets/
npx cap sync ios                # copies web build + plugins into ios/
npx cap open ios                # opens Xcode
```

After any web change: `npm run build:native && npx cap sync ios` (or just
`npm run ios`, which does build + sync + open).

## 4. Xcode: capabilities & Info.plist

In Xcode, select the **App** target → **Signing & Capabilities**:

- **Signing:** pick your Team; Bundle Identifier `com.nyclines.app`.
- **+ Capability → Push Notifications**.
- **+ Capability → Background Modes** → check **Remote notifications**.

In `ios/App/App/Info.plist`, add the usage strings (required or the app is rejected /
crashes when asking for location):

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>NYC Lines uses your location to center the map and show the nearest bars.</string>
```

Run on a simulator or a real device (push needs a real device).

---

## 5. Deploy the Edge Functions

The in-app account deletion needs its function live:

```bash
supabase functions deploy delete-account
```

(Uses the auto-injected service role; the client sends the user's JWT.)

### Push sender (after you create your APNs key)

1. Apple Developer portal → **Certificates, IDs & Profiles → Keys → +** →
   enable **Apple Push Notifications service (APNs)** → download the `.p8`.
   Note the **Key ID** and your **Team ID**.
2. Set the function secrets:
   ```bash
   supabase secrets set \
     APNS_KEY="$(cat AuthKey_XXXXXX.p8)" \
     APNS_KEY_ID=XXXXXXXXXX \
     APNS_TEAM_ID=YYYYYYYYYY \
     APNS_BUNDLE_ID=com.nyclines.app \
     APNS_HOST=api.push.apple.com \
     PUSH_SECRET="$(openssl rand -hex 16)"
   ```
   (Use `api.sandbox.push.apple.com` while testing debug builds.)
3. Deploy without JWT verification (it's called server-side with `PUSH_SECRET`):
   ```bash
   supabase functions deploy send-push --no-verify-jwt
   ```
4. Test:
   ```bash
   curl -X POST "$SUPABASE_URL/functions/v1/send-push" \
     -H "x-push-secret: $PUSH_SECRET" -H "Content-Type: application/json" \
     -d '{"userIds":["<a-user-uuid>"],"title":"NYC Lines","body":"It works 🎉"}'
   ```

> Auto-pushing on a friend check-in is an optional follow-up: a Postgres trigger
> on `friend_notifications` that looks up the checker's accepted friends and calls
> `send-push` via `pg_net`. Wire it once basic push is verified.

---

## Reusing one signing certificate (avoid Apple's 2-cert limit)

The Codemagic recipe now reuses a single distribution certificate on every
build instead of minting a new one each time (which used to exhaust Apple's
limit of 2 and force you to revoke certs). One-time setup:

1. **Revoke the old certificates first.** Apple Developer portal →
   **Certificates, IDs & Profiles → Certificates** → delete every existing
   **Apple Distribution** certificate (they were the throwaway ones). You'll
   create exactly one fresh, permanent one below.
2. **Run the Codemagic build once** with no `CERT_PRIVATE_KEY` set. It
   generates a key, creates the certificate, and near the end of the
   **Set up code signing** step prints a block like:
   ```
   ----------------------- CERT_PRIVATE_KEY BEGIN -------------------
   <one long line>
   ----------------------- CERT_PRIVATE_KEY END ---------------------
   ```
3. **Copy that one long line** (between the markers) and add it in Codemagic →
   your app → **Environment variables** as:
   - **Name:** `CERT_PRIVATE_KEY`
   - **Group:** `nyc_lines_env`
   - **Secure:** ✅ checked
4. **Re-run the build.** From now on every build reuses the same certificate —
   no new certs, no revoke dance. If you ever see it print the block again, it
   means the var wasn't picked up (check the name/group and that it's in the
   group this workflow loads).

> The printed value is a private signing key. It only appears in your own
> Codemagic build log; treat it like a password — don't paste it anywhere
> public, and once it's stored as the secure env var you can clear that log.

## 6. App Store Connect

- Create the app with bundle id `com.nyclines.app`.
- **Age rating: 17+** (frequent/intense alcohol references).
- **App Privacy** (nutrition labels): declare **Contact Info → Email**
  (linked to identity, app functionality), **User Content** (check-ins/reports),
  and **Location → Coarse/Precise Location** (app functionality, *not* used for
  tracking; we don't store it server-side).
- **Privacy Policy URL:** `https://YOURDOMAIN/#/privacy`.
- Confirm **account deletion** is available in-app (it is — Profile → Delete account).
- Upload screenshots + description → **TestFlight** for beta → submit for review.

## Common rejection causes (already handled)

- ✅ In-app account deletion exists.
- ✅ Privacy policy + terms in-app and by URL.
- ⚠️ Set the 17+ age rating and fill privacy labels (manual, in App Store Connect).
- ⚠️ Make the app feel native — push + location help; avoid dead external links.
