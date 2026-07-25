# v2 — Trust, Accuracy Scoring & Leaderboard

Goal: keep wait times honest as NYC Lines scales by rewarding accurate reporters
and de-weighting (then banning) liars — and surface that reputation two ways: a
competitive **leaderboard** and an Uber-style **profile rating** friends can see.

## The core idea

Every wait report is scored against what *other* people reported at the same
venue around the same time (the "consensus"). Accurate reports earn points and
raise your trust; wildly-off reports cost points. Trust then feeds back into:
1. how much your future reports move the number everyone sees (weighting),
2. how many points you earn,
3. your leaderboard rank and your profile rating.

## Data model

**profiles** (add)
- `trust_score int not null default 0` — lifetime points.
- `accuracy_rating numeric` — Uber-style 1.00–5.00, derived (see below); null until enough scored reports.
- `scored_reports int default 0`, `accurate_reports int default 0`.
- `submit_banned_until timestamptz` — set on abuse; blocks submitting.

**reports** (add)
- `consensus_wait numeric` — median of others at scoring time (null if unscorable).
- `accuracy text` — 'accurate' | 'off' | 'unscored' (default 'unscored').
- `points_awarded int default 0`, `scored_at timestamptz`.

**No new dependency on real-time** — scoring runs slightly after submission, when
peers exist.

## Scoring algorithm

Run by a scheduled job (`score_reports()` via pg_cron or an Edge Function every
~5 min) over reports where `accuracy = 'unscored'` and `created_at` older than a
short settle window (e.g. 15 min so peers can arrive):

1. **Find peers:** other reports at the same venue within ±30 min of this one,
   excluding the same user.
2. **Need density:** require ≥ 3 peers. Fewer → leave `unscored` (retry later;
   after 24h with no peers, mark `unscored` permanently, 0 points — no penalty
   for being early/alone).
3. **Consensus:** `consensus_wait = median(peer waits)`, weighted by each peer's
   trust (higher-trust peers count more).
4. **Judge:** let `err = |wait − consensus|`.
   - `err ≤ max(8 min, 25% of consensus)` → **accurate**.
   - `err ≥ max(20 min, 60% of consensus)` → **off**.
   - between → neutral (small/no points).
5. **Award:**
   - accurate → `+10` (scaled ×0.5 for low-trust users so they earn back slowly).
   - off → `−15`.
   - update `trust_score`, `scored_reports`, `accurate_reports`.

## Trust weighting of the displayed wait

`busyness.js displayWait` currently averages live reports equally. Change to a
**trust-weighted** average: `weight_i = clamp(1 + trust_score_i / K, 0.25, 3)`.
New accounts still count (0.25–1×); proven reporters dominate. A brand-new
account can't swing a venue's number alone.

## Ban logic

- If `trust_score` drops below a floor (e.g. −50) OR ≥ 5 'off' reports in 7 days
  → `submit_banned_until = now + 30 days`, and reset trust to a small positive
  so they start rebuilding after the ban.
- `report()` rejects while banned (with a clear message + unban date).
- Banned/low-trust users can still *view* the app — we only restrict submitting.

## Profile rating (Uber-style) — friends can see

- `accuracy_rating = 1 + 4 * (accurate_reports / scored_reports)` → a 1.00–5.00
  star grade, shown as e.g. **⭐ 4.8 · 214 reports**.
- Hidden until `scored_reports ≥ 5` (shows "New reporter" until then).
- Displayed on your own Profile and on a friend's row/detail. Not public beyond
  friends by default (privacy).

## Leaderboard

- New **Leaderboard** surface (tab or Profile section).
- Scopes: **Friends** (you vs your friends) and **NYC** (all users). Start with
  Friends (more meaningful early), add global once there's volume.
- Timeframes: **This week** (resets Mon) + **All-time**.
- Rank by trust points; show rank, username, rating, weekly points.
- Ties broken by accuracy rating.

## Anti-abuse

- Consensus excludes the reporter; median resists a single liar.
- Trust-weighted consensus means a ring of new accounts can't manufacture a fake
  consensus.
- Rate-limit: one scored report per user per venue per ~45 min.
- 30-day ban + reduced earning for repeat offenders (above).

## Rollout / density note

This engine needs several concurrent reporters per venue to score anything, so
its value grows with the user base. Ship the mechanics in v2, but expect the
leaderboard/ratings to populate meaningfully only as traffic builds. Everything
degrades gracefully to "unscored / New reporter" until then.

## Open decisions (need your call)

1. Leaderboard scope at launch: Friends-only, NYC-only, or both?
2. Profile reputation format: Uber-style ⭐ rating, a numeric trust score, or
   tiers (Bronze/Silver/Gold)?
3. Rating visibility: friends-only or public?
4. What was the "Belly does…" reference? (so I can match that pattern)
