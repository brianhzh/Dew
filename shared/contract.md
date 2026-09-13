# Dew API contract

Post purchase only, voice driven. The user logs a purchase they already made
(by voice via WisprFlow, or typed). The backend reads the amount, decides the
effect on vigor and maturity, and picks one plant effect. No preview, no
what-if, no skip, no reserve, no fake bank feed.

Base URL (dev): `http://localhost:8000`. CORS open. JSON bodies.
Ground truth: `/shared/fixtures/*.json`, one per case, each `{case, note, request, response, narrative}`.
Constants: `/shared/constants.json`. Seed persona: `/shared/seed.json`.
Market projection (real Snowflake Monte Carlo on QQQ): `/shared/mc_percentiles.json`.

Two layers: the response object carries the instant numbers the plant reacts
off (including a `render` block ready for the plant renderer), then
`GET /narrative/{decision_id}` streams the prose line separately.

---

## 1. POST /parse — voice transcript to fields

The WisprFlow transcript in, structured purchase fields out. Parse only, nothing
is applied. The frontend confirms or corrects, then posts /purchase.

```json
// request
{ "user_id": "demo-1", "text": "I spent 250 on headphones at Best Buy" }
// response
{ "amount": 250, "category": "electronics", "merchant": "Best Buy",
  "is_recurring": false, "is_essential": false, "review": false,
  "transcript": "I spent 250 on headphones at Best Buy" }
```

- Essentials the user names (rent, groceries, transit, phone bill, tuition...) come
  back `is_essential: true`. Subscriptions (monthly, membership, netflix...) come
  back `is_recurring: true`. An explicit word ("splurge", "needed it") overrides
  the category guess.
- `review: true` when the amount is missing or the category is unknown, so the
  frontend should ask before logging.

## 2. POST /purchase — a purchase was made

```json
{ "user_id": "demo-1", "amount": 250, "category": "electronics",
  "merchant": "Best Buy", "is_recurring": false, "is_essential": false }
```

Applies the deltas to the plant, subtracts the amount from the buffer, logs a
transaction and a decision. Recurring purchases add a subscription and its aphids.
Effect mapping:

| purchase | bucket | effect | plant |
|---|---|---|---|
| essential (`is_essential`) | `neutral` | `none` | no weather ever |
| small one-off | `small` | `cold_spell` | frost |
| big one-off | `big` | `hailstorm` | hail, lightning, shake |
| subscription (`is_recurring`) | `recurring` | `aphids` | pests, lower baseline |

Small vs big is a severity threshold (`buckets.big_min`). Vigor damage scales
continuously, so a $15 and a $60 are both a cold spell but the $60 hurts more.

## 3. POST /cancel — drop a subscription

```json
{ "user_id": "demo-1", "merchant": "DashPass" }
```

Removes the subscription and its aphids, restores the baseline, nudges maturity
up. Returns the response object with bucket `cancel`, effect `aphids_leave`,
`effects.pests_delta` = negative of the aphids that left. `404` if no such sub.

## 4. The response object — /purchase and /cancel both return this

```json
{
  "decision_id": "d-101",
  "severity_bucket": "big",
  "effect": "hailstorm",
  "direction": "damaging",
  "vigor_before": 72.0, "vigor_after": 42.0, "vigor_delta": -30.0,
  "baseline": 72.0,
  "maturity_before": 41.0, "maturity_after": 30.9, "maturity_delta": -10.1,
  "concrete_unit": "sets your next bloom back about 7 weeks",
  "effects": { "storm": 1.0, "wind": 1.1, "rain": 0, "cold": 0, "pests_delta": 0 },
  "leaves_fall": 34,
  "flash_shake": true,
  "projection": { "p10": 0.2, "p50": 1.02, "p90": 2.19, "horizon_months": 48 },
  "render": {
    "vigor": 42.0, "maturity": 30.9, "baseline": 72.0, "pestsActive": false,
    "effects": { "frost": false, "hail": true, "lightning": true, "shake": true,
      "rain": false, "falling_leaves": true, "pests": false, "drought": 0, "wind": 1.1 }
  }
}
```

- `severity_bucket`: `neutral | small | big | recurring | cancel`.
- `effect`: `none | cold_spell | hailstorm | aphids | aphids_leave`.
- `maturity_delta` is the market opportunity cost of the money (amount plus the
  growth it would have earned over the degree horizon at the projection p50).
  A big buy is a real setback, a subscription drags for months, essentials are 0.
- `projection` is the live p10 p50 p90 cumulative return from the Snowflake Monte
  Carlo. The p10 to p90 spread is the uncertainty band.
- **`render` is the block the plant renderer consumes directly** (see integration).

## 5. GET /state — hydration

```json
{
  "persona": { "user_id": "demo-1", "monthly_income": 1600, "essentials_monthly": 1250,
    "savings_target_monthly": 150, "liquid_buffer": 1900, "horizon_months": 48 },
  "goals": [ { "goal_id": "g-short", "term": "short", "name": "Reading-week trip",
    "amount": 400, "progress": 120 } ],
  "plant": { "vigor": 72.0, "baseline": 72.0, "maturity": 41.0, "pests": [], "pest_count": 0 },
  "subscriptions": [],
  "projection": { "p10": 0.2, "p50": 1.02, "p90": 2.19, "horizon_months": 48 },
  "render": { "vigor": 72.0, "maturity": 41.0, "baseline": 72.0, "pestsActive": false,
    "effects": { "frost": false, "hail": false, "...": "idle", "wind": 0.08 } }
}
```

Two lazy drifts run each request: vigor eases toward baseline at 0.12/day, and
maturity creeps up a little each day (steady saving grows the plant).

## 6. GET /narrative/{decision_id} — SSE

`data:` chunks then `event: done`. Neutral decisions emit `done` immediately.
Fallback bank today; Cortex can slot in behind it later. `404` on unknown id.

## 7. Utility

`POST /reset` reloads the seed. `GET /health` returns `{"ok": true}`.

---

## Frontend integration (linking A's client to this backend)

The reusable core, `client/src/plant/plantEngine.ts`, takes exactly the shape in
`render`. So one line links a purchase to the plant:

```ts
const res = await postPurchase(fields)   // POST /purchase
plantEngine.apply(res.render)            // render is already EngineInput shaped
```

`render.effects` uses the renderer's boolean flags (frost / hail / lightning /
shake / rain / falling_leaves / pests + drought, wind), so no client side mapping
is needed. `render.pestsActive` keeps the aphids while a subscription is live.

What the client still needs to change from the scaffold, because this backend is
the post-purchase / voice design, not the old bank-feed design:

- **Voice:** WisprFlow transcript to `POST /parse`, show the fields for confirm or
  correction (the user assigns essential vs not), then `POST /purchase`.
- **Point `api.ts` at** `/parse`, `/purchase`, `/cancel`, `/state` and feed
  `response.render` to the renderer. Drop the `mode: 'preview'` / `/decision` call.
- **Remove old-design pieces** with no backend behind them: the Consider / Preview
  / WhatIf screens, and the `reserve_weeks`, `warranted`, `clean_streak`,
  `drought`, `skip` fields in `types.ts`. Keep Home, Aftermath, Ledger, PlantCanvas.
- **Fixtures** are regenerated to this design's cases (essential, small_coffee,
  small_impulse, big_headphones, subscription, cancel), each with a `render` block.
  Update the imports in `api.ts` to these names.
