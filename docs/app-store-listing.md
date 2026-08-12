# NYC Lines — App Store listing (copy-paste ready)

Everything you need to fill in App Store Connect → your app → **Distribution**
and **App Information**. Character limits are noted; drafts are already under
them. Anything marked **⚠️ ACTION** needs a real value from you before you
submit.

---

## 1. App Name  (max 30 characters)

> **NYC Lines: Bar Wait Times**  · 25 chars

This is the single most important ASO field — Apple weighs name keywords
highest. It packs "bar," "wait," "times," and "NYC" into the name itself.

Alternates if that one's taken:
- `NYC Lines — Bar Waits` (21)
- `Lines: NYC Bar Wait Times` (25)

## 2. Subtitle  (max 30 characters)

> **See how busy bars are, live**  · 27 chars

Adds the keywords "busy," "bars," "live" without repeating the name.

Alternates:
- `Real-time nightlife crowds` (26)
- `Skip the line before you go` (27)

## 3. Keywords field  (max 100 characters, comma-separated, NO spaces after commas)

> `nightlife,club,lounge,pub,cocktail,drink,happy,hour,cover,queue,crowd,packed,rooftop,speakeasy,dive`
>
> 99 chars

ASO rules baked in here:
- **No spaces after commas** (a space wastes a character).
- **Singular only** — Apple auto-matches plurals.
- **No words already in the Name/Subtitle** (bar, wait, time, nyc, line, busy,
  live) — they're already indexed, so repeating them is wasted space.
- Apple recombines these with your name/subtitle into phrases automatically
  (e.g. "rooftop bar," "happy hour nyc," "cocktail lounge," "dive bar wait").

## 4. Promotional Text  (max 170 characters — updatable anytime WITHOUT a new build)

> Know the wait before you leave. NYC Lines shows live, crowd-sourced bar lines
> across the city — plus a forecast of the best time to go. See where friends are out.
>
> ~168 chars

Great for announcements ("New: froyo spots added!") since it doesn't need review.

## 5. Description  (max 4000 characters)

```
Stop guessing how long the line is. NYC Lines is the crowd-sourced map of bar
wait times across New York City — see what's packed and what's a walk-in before
you leave the apartment.

HOW IT WORKS
• Open the map and see live wait times at bars around you, reported by the crowd.
• Green means walk right in. Amber is a short wait. Red means bring your patience.
• Check in when you arrive and drop the current wait to help everyone else.

PLAN THE PERFECT NIGHT
• Busyness forecast — we learn each spot's rhythm from past reports and show you
  the best time to go.
• "Open now" and "under 20 min" filters to find somewhere fast.
• Closed spots never show a fake wait — you only see what's actually open.

BARS AND FROYO
• Flip between Bars and Froyo modes to find late-night drinks or a sweet treat.
• Real hours and photos for every spot.

GO WITH FRIENDS
• Add friends and see where they're out tonight.
• Get a heads-up when a friend checks in somewhere.

Built for New Yorkers who'd rather be inside with a drink than outside in a line.

NYC Lines is free. Wait times are crowd-sourced estimates — please drink
responsibly and never drink and drive.

Questions or feedback? Email us — we read everything.
```

## 6. What's New (version release notes)

For **1.0** (first release):
```
Welcome to NYC Lines! Live, crowd-sourced bar wait times across New York City,
a busyness forecast for the best time to go, a Froyo mode, and friends so you
can see where everyone's out. This is our first release — tell us what you want next.
```

---

## 7. App Information

| Field | Value |
|---|---|
| **Primary category** | Food & Drink |
| **Secondary category** | Social Networking |
| **Content rights** | Does not contain third-party content |
| **Age rating** | **17+** (see §8) |

---

## 8. Age Rating questionnaire

Answer the questionnaire so it resolves to **17+**:
- **Alcohol, Tobacco, or Drug Use or References** → **Frequent/Intense**
  (the whole app is about bars). This alone sets 17+.
- Everything else (violence, sexual content, gambling, etc.) → **None**.
- Unrestricted web access → **No**.

## 9. App Privacy (privacy "nutrition" labels)

Declare these under **App Privacy → Get Started**. Data types we collect:

**Contact Info**
- **Name** — linked to identity · Purpose: App Functionality
- **Email Address** — linked to identity · Purpose: App Functionality
- **Phone Number** — linked to identity · Purpose: App Functionality
  *(collected only if the user chooses to add it; still must be declared)*

**User Content**
- **Other User Content** (check-ins, wait reports, place suggestions) —
  linked to identity · Purpose: App Functionality

**Contacts**
- **Contacts** — **not** linked to identity · Purpose: App Functionality ·
  **Not** used for tracking. Only if the user taps "Find from contacts." We read
  contacts on-device to check which are already registered users; we never
  upload or store the address book, and we only send phone numbers to look for
  matches (nothing is retained).

**Location**
- **Coarse Location** — **not** linked to identity · Purpose: App Functionality ·
  **Not** used for tracking. We use it in the browser to center the map/sort by
  distance and do not store it on our servers.

For **every** item above, answer **"No, we do not use this data for tracking"**
(no third-party ad/analytics tracking), so you avoid the App Tracking
Transparency prompt.

> ⚠️ ACTION: If you enabled the built-in privacy-friendly analytics, also declare
> **Usage Data → Product Interaction**, *not linked to identity*, Purpose:
> Analytics. If analytics is off/anonymous with no identifiers, you can skip it.
> If unsure, tell me which analytics you turned on and I'll confirm.

## 10. URLs

| Field | Value |
|---|---|
| **Privacy Policy URL** | `https://8x9pknfpwq-prog.github.io/Nutrition-App/#/privacy` |
| **Support URL** | `https://8x9pknfpwq-prog.github.io/Nutrition-App/#/` |
| **Marketing URL** (optional) | `https://8x9pknfpwq-prog.github.io/Nutrition-App/` |

> ⚠️ ACTION: Confirm these load in a browser before submitting. They only work
> if GitHub Pages is deployed for the repo (the `deploy-demo` workflow publishes
> it on the default branch). Open the Privacy URL — if it shows the policy, Apple
> is happy. If it 404s, enable Pages (Settings → Pages) / run the deploy workflow.
> You can swap in a custom domain later without re-submitting.

> ⚠️ ACTION: The in-app Privacy/Terms pages and this listing use a placeholder
> support email **support@nyclines.app**. Set up a real inbox (or swap in one you
> own) and update `CONTACT` in `lineup/src/pages/Legal.jsx` before submitting —
> Apple checks that the support URL/contact works.

## 11. Sign-in for App Review  (REQUIRED — the app needs an account)

Because the app requires login, App Review **will reject** it if they can't get
in. In **App Review Information**:
- **Sign-in required:** Yes
- Provide a **demo account** username + password you've pre-created on the live
  backend. ⚠️ ACTION: make a throwaway account and put its credentials here.
- **Notes for reviewer** (paste this):
```
NYC Lines is a crowd-sourced bar wait-time app for NYC.
Use the demo account above to sign in. To test core features:
- The map shows bars with live/forecasted wait times; tap a pin for details.
- Tap a venue and "Check in" to submit a wait time.
- Bars/Froyo toggle at the top switches venue modes.
Account deletion: Profile tab → Delete account (in-app, permanent).
Location permission is optional and only used to center the map.
```

## 12. Export Compliance

- The app uses only standard HTTPS/TLS encryption → **exempt**.
- In App Store Connect this shows as: **"Uses non-exempt encryption? → No."**
- This is already declared in the build via `ITSAppUsesNonExemptEncryption =
  NO` (so you shouldn't be prompted each build). If asked, answer **No**.

## 13. Screenshots  (REQUIRED)

You must upload at least the **6.9" iPhone** set (1290 × 2796). One set can be
reused for smaller sizes. Aim for 3–5 shots. Good ones from what you already have:

1. **Map with pins + "27 spots nearby"** — hero shot. Caption: *"See live bar
   waits across NYC."*
2. **Bars / Froyo toggle** — Caption: *"Bars tonight, froyo after."*
3. **A venue's check-in sheet** — Caption: *"Check in. Help the crowd."*
4. **The busyness forecast** — Caption: *"Know the best time to go."*
5. **Friends tab** — Caption: *"See where friends are out."*

Tip: add a plain text caption band above each screenshot (most apps do) — it
lifts conversion more than raw screenshots. I can generate captioned framed
images if you want.

---

## Submission checklist

- [ ] App Name, Subtitle, Keywords entered (§1–3)
- [ ] Promotional Text + Description + What's New (§4–6)
- [ ] Category + Age Rating = 17+ (§7–8)
- [ ] App Privacy labels completed (§9)
- [ ] Privacy Policy + Support URLs live and working (§10)
- [ ] Real support email set in Legal.jsx + inbox exists (§10)
- [ ] Demo account created + credentials in Review notes (§11)
- [ ] Export compliance answered (§12)
- [ ] Screenshots uploaded (§13)
- [ ] Migration 0011 run in Supabase (so signup saves name/phone)
- [ ] The build with all latest fixes selected for this version
- [ ] Submit for Review
```
