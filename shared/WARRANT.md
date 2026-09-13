# Warranted small-medium spends

People are not monks. A coffee or a $40 want is not the same as headphones. This file is the rule B should port to Snowflake.

## Importance (user-assigned)

The user types their own costs first and drops each into one bucket. A does not guess from the dollar amount when they have assigned importance.

| Bucket | Meaning | Tree |
| --- | --- | --- |
| **Essential** | Rent, groceries, transit, phone, tuition — they have to | No weather. Reserve dips a little. |
| **Small–medium** | Everyday wants. Coffee, a cheap impulse | Soft vigor hit. Can become **warranted**. |
| **Subscription** | Recurring drain | Pests + maturity. |
| **Large** | The regret buy | Storm. This is a **bad choice**. |

## What is a bad choice

Only these reset the clean streak to `0`:

- Buying a **large** want
- Starting a **subscription**

Paying rent is not bad. Skipping headphones is not bad. Buying an unwarranted small-medium is not bad — it just is not earned yet.

## What is a clean choice

These add `+1` to `clean_streak`:

- Paying an **essential**
- **Skipping** a small-medium, subscription, or large

## Warranted treat

`warranted_after_clean` = **3** (same constant as trophies).

When `clean_streak >= 3` and the user buys a **small-medium**:

- `warranted: true`
- Vigor hit is `35%` of the normal want hit
- Weather is rain (nourish), not frost/hail
- The streak **resets to 0** — they spent the credit

If they buy small-medium with streak `< 3`, they pay the normal small vigor hit. Streak unchanged.

## Why

The tree should punish **pattern**, not existence. Going long enough without a large or a new sub means a small want is part of staying alive. Judges should hear: “you earned this one.”

## Snowflake

Keep the keys: `importance`, `warranted`, `clean_streak`. Compute streak on `TRANSACTIONS` ordered by time. Do not let Cortex decide what is essential.