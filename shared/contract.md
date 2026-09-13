# Dew API contract (A draft — B amends)

**Status:** written by Person A because B was not in the room. B: read this, change what you must, commit this file alone, tell A out loud.

**Product shipped this 12h:** after-purchase only. User picks or logs a spend. You return `plant_after` + `effects`. Client draws the tree. Goal = healthiest tree.

**Parked:** `phase: before_purchase` and `opportunity_items`. Keep the fields optional so we can light them later. Do not require them for L1.

---

## Persona (both sides seed this)

| Field | Value |
| --- | --- |
| `income_mo` | 1500 |
| `savings` | 5000 |
| `display_locked` | true |
| Starting tree | fully healthy: `vigor` 100, `maturity` 100, `baseline` 100 |

B also decides starting `reserve_weeks`. Fixtures use `8` until you replace it.

---

## Endpoints

| Method | Path | A uses for |
| --- | --- | --- |
| `GET` | `/state` | Home, Ledger |
| `POST` | `/decision` | Preview / commit / skip / whatif |
| `POST` | `/action` | cancel sub, accept recovery, assign `goal_id` |
| `GET` | `/narrative/{decision_id}` | Aftermath SSE |

---

## Enums

```
mode:        preview | commit | skip | whatif | cancel
phase:       after_purchase          (before_purchase parked)
severity:    minor | moderate | major | essential | recurring | skip | cancel | drought
horizon:     short | mid | long
category:    coffee | impulse | electronics | subscription | tuition | groceries | rent | transit | phone | other
```

---

## `POST /decision` request

```json
{
  "mode": "preview",
  "phase": "after_purchase",
  "amount": 250,
  "category": "electronics",
  "flags": { "essential": false, "recurring": false },
  "goal_id": null,
  "whatif": { "income_stops": false }
}
```

---

## `POST /decision` response (layer-1)

You compute every number. A only animates `plant_before` → `plant_after` and plays `effects`.

```json
{
  "decision_id": "fix-major",
  "mode": "preview",
  "phase": "after_purchase",
  "severity": "major",
  "effects": {
    "frost": false,
    "hail": true,
    "lightning": true,
    "shake": true,
    "drought": 0,
    "rain": false,
    "wind": 0.7,
    "falling_leaves": true,
    "pests": false
  },
  "plant_before": { "vigor": 100, "maturity": 100, "baseline": 100, "reserve_weeks": 8 },
  "plant_after":  { "vigor": 74, "maturity": 100, "baseline": 100, "reserve_weeks": 6.1 },
  "plant_delta":  { "vigor_delta": -26, "maturity_delta": 0, "baseline_delta": 0 },
  "pests": { "active": false },
  "reserve_weeks_before": 8,
  "reserve_weeks_after": 6.1,
  "reserve_material": true,
  "healthy": false,
  "healthy_score": 0,
  "trophy_awarded": false,
  "healthy_saves_count": 0,
  "goal_ref": { "recommended_goal_id": "goal-short", "reason_code": "closest" },
  "narrative_seed": { "severity": "major", "metaphor_key": "storm", "reserve_weeks_after": 6.1 },
  "opportunity_items": null
}
```

### Rules

- One-time non-essential → hit **vigor**. Sub (`recurring`) → **pests** for the duration + hit **maturity**.
- Essentials (`tuition`, rent, groceries, transit, phone) → `severity: essential`, **no weather**, `healthy: false` if they skip.
- Skip a **non-essential** → you set `healthy` / `healthy_score`. A shows trophies when you say `trophy_awarded`.
- `opportunity_items`: omit or `null` this 12h.

---

## `GET /state`

```json
{
  "persona": {
    "name": "Jordan",
    "role": "Freshman, first year on your own",
    "income_mo": 1500,
    "savings": 5000,
    "age": 18,
    "interests": ["music", "travel", "campus"],
    "cost_of_living": "college town",
    "display_locked": true
  },
  "plant_state": {
    "vigor": 100,
    "maturity": 100,
    "baseline": 100,
    "reserve_weeks": 8,
    "effects": { "drought": 0 },
    "pests": { "active": false }
  },
  "goals": [
    { "id": "goal-short", "horizon": "short", "label": "Weekend trip", "target_amount": 400, "current_amount": 120, "pct_complete": 0.3, "stage": 1, "harvested": false },
    { "id": "goal-mid", "horizon": "mid", "label": "Sublet deposit", "target_amount": 900, "current_amount": 150, "pct_complete": 0.17, "stage": 0, "harvested": false },
    { "id": "goal-long", "horizon": "long", "label": "Graduate buffer", "target_amount": 5000, "current_amount": 480, "pct_complete": 0.1, "stage": 0, "harvested": false }
  ],
  "subscriptions": [],
  "trophies": [],
  "healthy_saves_count": 0,
  "stage_label": "First semester"
}
```

---

## `POST /action`

```json
{ "type": "cancel_subscription", "subscription_id": "sub-1" }
{ "type": "skip", "decision_id": "…", "goal_id": "goal-short" }
{ "type": "accept_recovery", "decision_id": "…" }
```

Response: same as a compact `/state` plus the layer-1 fields you changed.

---

## SSE `GET /narrative/{decision_id}`

```
data: {"text":"The storm hits the canopy. The soil will remember this longer than the receipt."}

event: done
```

No new dollars or percents in the stream. Fallback bank lives on B; A also has local copies in `/shared/fixtures/*.sse.txt`.

---

## Eight fixture cases

Files in `/shared/fixtures/`. A’s `OFFLINE` client uses these until `VITE_OFFLINE=false`.

| File | Demo beat |
| --- | --- |
| `minor.json` | ~$15 coffee — frost, vigor down |
| `moderate.json` | ~$60 impulse — partial storm |
| `major.json` | ~$250 headphones — hail + lightning |
| `essential.json` | tuition — no weather |
| `recurring.json` | $23/mo sub — pests, maturity down |
| `skip.json` | skip non-essential — rain, `healthy: true` |
| `cancel.json` | cancel sub — aphids leave |
| `whatif-drought.json` | income stops |

Numbers in those files are **placeholders**. Replace them with your model; keep the keys.

---

## Provisional plant model (A ships this; B replaces it)

A now runs a local fake bank in `/client` so the demo works without Snowflake. Same response keys as layer-1. When your fake bank is up, set `VITE_OFFLINE=false` and compute these in SQL / Snowpark.

Jordan’s books:

| Field | Value |
| --- | --- |
| `income_mo` | 1500 |
| `cash` (savings) | 5000 |
| `fixed_bills_mo` | 930 |
| `discretionary_mo` | 570 |
| `weekly_disc` | `discretionary_mo / 4.345` ≈ 131 |
| starting reserve | 8 weeks (game stat, not cash / weekly) |

**One-time non-essential** (coffee / impulse / electronics):

- `severity`: amount ≤ 20 minor, ≤ 70 moderate, else major
- `vigor_hit = 4 + 28 * amount / (amount + 80)` → 15≈8, 60≈16, 250≈26
- `weeks_lost = amount / weekly_disc`
- weather from `constants.severity_effects`

**Essential** (tuition, rent, groceries, transit, phone): no weather, no vigor; `weeks_lost *= 0.2`

**Recurring**: pests on; `maturity_hit = clamp(round(amount * 12 / income_mo * 75), 6, 28)`; `weeks_lost = amount * 3 / weekly_disc`

**Skip** a want: rain; vigor +8 (cap 100); restore half the weeks the buy would have cost; cash unchanged

**User-assigned importance** (not guessed from dollars when they tagged it): `essential` | `small_medium` | `subscription` | `large`. Setup is first. See [`WARRANT.md`](./WARRANT.md).

**Warranted small-medium:** after `clean_streak >= 3` (skip or pay essential). Soft vigor (35%), rain, `warranted: true`, streak resets. Large or a new sub is a bad choice and zeros the streak.

B: keep the keys, swap the formula. Don't make A invent a second model.
