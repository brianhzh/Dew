# Future artifact method on Snowflake

The product is not a forecast chart. It is an **object from later** — a receipt dated next March, a statement, a denial letter, a timesheet of hours still owed.

Snowflake’s job is to make that object **true**. Cortex’s job is to make it **felt**. Do not swap those jobs.

---

## What the method is

A future artifact is a design-fiction object with a date stamp in front of today.

| Artifact | Horizon | What it proves |
| --- | --- | --- |
| Next-year receipt | 12 months | This $47 tap became a $1,400 year |
| Minimum-payment statement | 18–48 months | The laptop is still a roommate |
| Apartment denial | 12–18 months | Utilization closed a door |
| Payday calendar | 3–6 weeks | Friday-you and the 23rd are different people |
| Hours timesheet | any | You still owe 41 hours of work |

Judges hold something they already know how to read. They do not have to learn your UI.

On Snowflake that is three layers:

1. **State** — who this person is, and the yes they are about to give  
2. **Projection** — SQL that walks month by month and writes a later ledger  
3. **Artifact** — a view that shapes those rows into line items, then Cortex writes the copy *from those line items only*

```
PERSONAS + DECISIONS
        ↓
 PROJECT_LEDGER()      ← SQL / Snowpark. Honest numbers only.
        ↓
 ARTIFACT_FACTS        ← structured JSON / typed columns
        ↓
 AI_COMPLETE           ← voice, not math
        ↓
 Streamlit artifact    ← receipt, letter, statement
```

Invert Snowflake Time Travel. Time Travel is “what was this table last Tuesday.” This method is “what does this person’s money look like in 14 Tuesdays if they say yes.”

---

## Data you actually need

Keep it tiny. No Plaid. Seed three personas and three decisions.

```text
LATER_YOU.APP
  PERSONAS          one row per demo human
  DECISIONS         lease / BNPL / skip-match
  RATE_RULES        APR, late fee, match %, utilization flags
  PROJECTED_LEDGER  one row per persona × decision × month
  ARTIFACT_FACTS    one row per persona × decision × artifact_type
  ARTIFACT_RENDER   Cortex output, cached
```

**PERSONAS** — `id`, `take_home_mo`, `fixed_bills_mo`, `buffer`, `hourly_wage`, `tightness` (`tight` / `ok` / `comfortable`)

**DECISIONS** — `id`, `kind` (`sign` / `tap` / `skip`), `name`, `amount`, `cadence` (`once` / `monthly` / `4_pay`), `term_months`, `apr`, `opportunity_label` (`august_trip` / `move_deposit` / `match_left`)

**RATE_RULES** — the few flags that create closed doors: `util_block_apartment` at 0.70, `buffer_gone` when ledger cash < 1 month of bills, `match_forgone` = `salary * match_pct * months`.

That is enough for a 12-hour demo. More tables is how you miss the pitch.

---

## Layer 1 — project the ledger in SQL

Do not ask the model “what will this cost in 5 years.” Walk time yourself.

A date spine plus running cash is the whole trick:

```sql
-- 36 months of later, one row each
WITH months AS (
  SELECT SEQ4() AS month_n
  FROM TABLE(GENERATOR(ROWCOUNT => 36))
),
base AS (
  SELECT p.*, d.*
  FROM PERSONAS p
  CROSS JOIN DECISIONS d
  WHERE p.id = :persona_id AND d.id = :decision_id
)
SELECT
  b.id AS persona_id,
  b.id AS decision_id,          -- use real keys
  m.month_n,
  DATEADD('month', m.month_n, CURRENT_DATE()) AS as_of,
  b.take_home_mo
    - b.fixed_bills_mo
    - IFF(m.month_n < b.term_months, b.amount, 0)
    - IFF(b.kind = 'tap' AND m.month_n BETWEEN 1 AND 4, b.amount / 4, 0)
    AS cash_after,
  /* closed-door flags — rules, not vibes */
  IFF(cash_after < b.fixed_bills_mo, TRUE, FALSE) AS buffer_gone,
  IFF(b.kind = 'skip', b.take_home_mo * 12 * 0.04 * (m.month_n / 12), 0)
    AS match_left_on_table
FROM base b
CROSS JOIN months m;
```

Write that into `PROJECTED_LEDGER` with a task or just a view. For the hackathon a view is enough.

**Snowpark if you want Python:** same thing, `session.range(36)` and a running balance. Still no LLM in this step.

What this layer must emit at month 3 / 12 / 60:

- cash leftover  
- total paid so far (principal + interest + fees)  
- hours of work = `total_paid / hourly_wage`  
- boolean flags: `buffer_gone`, `apartment_blocked`, `match_left`

Those five fields *are* the artifact facts. Everything else is costume.

---

## Monte Carlo — many futures, not one line

A single ledger is one story. Real later-you is a **distribution**. Monte Carlo is: draw random shocks, walk the same month loop, do it N times, read p10 / p50 / p90.

That is how Snowflake, Snowpark, and the artifact stay linked. Snowflake holds inputs and results. Snowpark (or SQL `GENERATOR`) runs the trials. The artifact prints a later object from **percentiles**, not from a vibe.

```
PERSONAS + DECISIONS + SHOCK_DISTS
        ↓
 Snowpark / SQL: for sim in 1..N
   sample income miss, late, extra spend, rate
   walk 36 months
        ↓
 SIM_PATHS          sim_id × month
 SIM_SUMMARY        p10 / p50 / p90, P(door closed)
        ↓
 ARTIFACT_FACTS     typical receipt + unlucky receipt
```

**What you randomize (keep to 3–4 shocks):**

| Shock | Draw | Effect on the walk |
| --- | --- | --- |
| Income miss | Bernoulli monthly | take-home = 0 that month |
| Extra spend | Lognormal | hits cash_after |
| Late / BNPL miss | Bernoulli | fee + utilization flag |
| Rate / APR jitter | Normal around posted APR | interest line |

Do not randomize everything. If every input is noise, the receipt means nothing.

**SQL path** — fine for independent monthly shocks. `GENERATOR(ROWCOUNT => n_sims)` × month spine, `UNIFORM(0, 1, RANDOM())` for draws, aggregate with `PERCENTILE_CONT`.

**Snowpark path** — use this when the walk is path-dependent (buffer last month changes default risk this month). Python loop or vectorized numpy inside a Snowpark UDF / stored proc; write `SIM_PATHS` back with `df.write.save_as_table`. The warehouse runs the trials next to the tables. Your laptop is a remote control.

```python
# sketch — runs in Snowflake via Snowpark, not locally on 50k rows
def run_trials(session, persona, decision, n=2000, months=36):
    # read dists from SHOCK_DISTS
    # for each sim: walk months, apply shocks, emit terminal stats
    session.create_dataframe(rows).write.save_as_table("SIM_SUMMARY", mode="overwrite")
```

**What you store in Snowflake**

- `SIM_RUNS` — `run_id`, persona, decision, n, seed, warehouse clock  
- `SIM_SUMMARY` — `p10_cash`, `p50_cash`, `p90_cash`, `p_buffer_gone`, `p_apartment_blocked`, `p50_hours`  
- Optional `SIM_PATHS` — only if you need a fan chart; skip for the 12-hour cut  

**How the artifact uses it**

| Percentile | Object |
| --- | --- |
| p50 | The receipt you show first (“typical later”) |
| p10 | The unlucky flip (“1 in 10 later-yous”) |
| `P(door closed)` | The denial letter, only if that probability is high enough to print |

Cortex still does not draw shocks or invent percentiles. It writes the clerk line from `SIM_SUMMARY`.

**Monte Carlo as a test, not just a forecast.** Same engine, different job: hold the decision fixed, vary shocks, assert invariants (`p50_cash <= start_cash` after a new monthly obligation; `p_apartment_blocked` rises when utilization shock is on). That is how you know the ledger is not theater. Put those checks in a Snowflake worksheet or a Snowpark test that reads `SIM_SUMMARY`.

**12-hour cut:** 500–2,000 trials, three shocks, write `SIM_SUMMARY` only. Two receipts (p50 / p10). If time dies, fall back to the deterministic ledger and say the Monte Carlo is the next slice.

---

## Marketplace as purchase parameters

Do not invent `$47` and `$800`. Do not join Marketplace on every Monte Carlo trial. **Collapse a listing into a small param table once**, then simulate from that.

```
MARKETPLACE (shared, read-only)
        ↓  one SQL collapse
 PURCHASE_PARAMS     category, amount, cadence, cpi_yoy, vol, apr
        ↓
 DECISIONS.amount / SHOCK_DISTS
        ↓
 Snowpark trials → SIM_SUMMARY → artifact
```

**Free listing to get first:** [Snowflake Data: Finance and Economics](https://app.snowflake.com/marketplace/listing/GZTSZAS2KF7/snowflake-data-finance-economics) (often lands as `FINANCE__ECONOMICS`) or **Snowflake Public Data (Free)**. Same family of series: CPI, PCE, retail sales, rates, wages, unemployment. Cybersyn’s old “Financial Essentials” listing is this now.

| Marketplace series | Becomes this param | Used for |
| --- | --- | --- |
| CPI by category (electronics, rent, food away, vehicles) | `cpi_yoy`, inflate `amount` each month | Later prices on the receipt |
| Census monthly retail sales by industry | typical ticket / scale for that yes | Decision `amount` |
| Fed funds / consumer credit / auto loan rates | `apr` | Interest line |
| Average hourly earnings | `hourly_wage` | Hours-later |
| Unemployment / claims | `p_income_miss` | Monte Carlo income shock |
| Paid card panels (Affinity, Consumer Edge) if you have them | AOV + frequency by merchant | Better `amount` and cadence |

Paid spend panels are nicer. They are not required. Free macro series are enough to stop looking made-up.

**`PURCHASE_PARAMS` — the only table the engine reads**

```text
category          -- electronics | rent | subscriptions | used_car | food_away
typical_amount    -- latest or 12-mo median from the listing
cadence           -- once | monthly | 4_pay
cpi_yoy           -- last 12-mo CPI change for that category
vol               -- stdev of yoy or month-to-month; shock width
apr               -- from the rate series, or posted offer if you have one
p_income_miss     -- from unemployment, same for all categories
source            -- listing + variable name, for the pitch
as_of             -- date of the last marketplace row
```

Map categories onto the three demo yeses:

| Demo yes | `category` | Param that matters |
| --- | --- | --- |
| Sign lease / car | `rent` or `used_car` | amount, apr, cpi_yoy |
| BNPL / $47 stack | `electronics` + a subscription stand-in | typical_amount, vol |
| Skip 401k match | wages series, not a purchase | `hourly_wage` / take-home |

Subscriptions are the weak spot on free listings. Use CPI “other goods” or a posted $47 and still take `cpi_yoy` + `vol` from Marketplace so the *path* is real even if the sticker is a preset.

**Collapse, don’t stream.** Snapshot into your DB so the demo does not depend on the share being fast or the series name being stable.

```sql
CREATE OR REPLACE TABLE PURCHASE_PARAMS AS
SELECT
  'electronics' AS category,
  ts.value AS typical_amount,          -- swap for the retail / AOV series you actually find
  'once' AS cadence,
  -- pair with a CPI yoy for durables in a second join
  att.variable_name AS source,
  ts.date AS as_of
FROM FINANCE__ECONOMICS.<schema>.FINANCIAL_ECONOMIC_INDICATORS_TIMESERIES ts
JOIN FINANCE__ECONOMICS.<schema>.FINANCIAL_ECONOMIC_INDICATORS_ATTRIBUTES att
  USING (variable)
WHERE att.industry ILIKE '%electronic%'   -- inspect attributes first; names vary by listing
QUALIFY ROW_NUMBER() OVER (ORDER BY ts.date DESC) = 1;
```

Inspect `*_ATTRIBUTES` before you write this. Variable names differ by listing. The pattern is: filter attributes → latest timeseries row → one param row.

**Snowpark then samples those params, not the Marketplace tables.**

```python
params = session.table("PURCHASE_PARAMS").to_pandas()
# each trial: amount_t = typical_amount * (1 + cpi_yoy/12) * exp(N(0, vol))
```

**Pitch line:** “The yes is yours. The size, the rate, and the inflation path come from Marketplace. We do not invent the American ticket.”

---

## The other fork — logged goals

Invert the same amount. `GOALS` is user-written. `PURCHASE_PARAMS` only suggests what this cash can reach.

```text
GOALS
  persona_id, decision_id
  horizon          -- short | mid | long
  label            -- they typed or picked
  target_amount    -- from params or their number
  funded_by        -- the yes they did not take
```

Short / mid / long = month 3 / 12 / 60 on the **keep** ledger (cash not spent, plus match if that was the yes). Suggest: `running_kept >= typical_amount` for a Marketplace category they might want. They confirm or overwrite.

Second artifact: a dated slip “paid toward {label} by not taking {decision}.” Same five fields. p50/p10 from Monte Carlo = hit vs miss. Cortex still does not invent the target.

**Do not:** train a model on Affinity, join 8B card rows, or require a paid listing to demo. If Get Data fails, keep hardcoded amounts and still show the `PURCHASE_PARAMS` shape so the swap is one view.

---

## Layer 2 — shape an artifact, not a dashboard

Pick one object type per decision. A view turns ledger rows into **line items a real document would have**.

```sql
CREATE OR REPLACE VIEW ARTIFACT_FACTS AS
SELECT
  persona_id,
  decision_id,
  'next_year_receipt' AS artifact_type,
  OBJECT_CONSTRUCT(
    'issued_on', DATEADD('year', 1, CURRENT_DATE()),
    'merchant', decision_name,
    'felt_like_today', amount,
    'line_items', ARRAY_CONSTRUCT(
      OBJECT_CONSTRUCT('label', 'Four payments', 'amount', amount),
      OBJECT_CONSTRUCT('label', 'Interest and late-risk', 'amount', interest_12mo),
      OBJECT_CONSTRUCT('label', 'August trip you did not take', 'amount', 1400)
    ),
    'total', paid_12mo,
    'hours_still_owed', ROUND(paid_12mo / hourly_wage, 1),
    'door_closed', IFF(apartment_blocked, 'Next lease application', NULL),
    'as_of_month_12', OBJECT_CONSTRUCT(
      'cash_after', cash_after,
      'buffer_gone', buffer_gone
    )
  ) AS facts
FROM PROJECTED_LEDGER
WHERE month_n = 12;
```

Same ledger, different costume:

| Decision | `artifact_type` | Object Streamlit draws |
| --- | --- | --- |
| BNPL / subscriptions | `next_year_receipt` | Itemized receipt, date +1 year |
| Car / lease | `obligation_letter` | “Your remaining obligation as of …” |
| Skip match | `forgone_paystub` | A phantom line: match you handed back |
| Credit / late | `denial_letter` | Apartment or auto denial, 14 months out |
| Payday | `calendar` | 6 weekly cells, one marked red |

The pivot is this mapping table. Not a new warehouse.

---

## Layer 3 — Cortex writes the voice only

Ground the model in `facts`. If a number is not in the JSON, it does not appear.

```sql
SELECT SNOWFLAKE.CORTEX.COMPLETE(
  'llama3.1-70b',
  CONCAT(
    'Write a cold, specific next-year receipt. ',
    'Use ONLY these facts. Do not invent amounts. ',
    'Tone: calm clerk, not a coach. 90 words. ',
    TO_VARCHAR(facts)
  )
) AS copy
FROM ARTIFACT_FACTS
WHERE persona_id = :p AND decision_id = :d;
```

Newer accounts can use `AI_COMPLETE` the same way. Cache the result in `ARTIFACT_RENDER` so the live demo does not wait on the model, and so you have a fallback if Cortex is slow.

**Allowed Cortex jobs**

- Receipt / letter prose from `facts`  
- One-sentence “now vs later”  
- Optional: `AI_EXTRACT` / Document AI if they paste a real lease (hour 9+)

**Forbidden Cortex jobs**

- Projecting balances  
- Guessing APR, utilization, or “you will be denied”  
- Chatbot that answers “should I?”  

If Cortex is down, Streamlit still renders the receipt from `ARTIFACT_FACTS`. The object works without the paragraph.

---

## Layer 4 — Streamlit in Snowflake

One screen. Not a BI app.

1. Pick a persona (or “this is tight”)  
2. Pick a yes (three buttons)  
3. Show **today’s** version of the object (short, cheap, fine)  
4. Crossfade / flip to **later’s** object  

The beat of the demo is the flip. Charts are optional and should sit under the fold or not exist.

Store nothing about the judge. Presets only. `CURRENT_DATE()` on the artifact is enough to make it feel addressed to the room.

---

## Optional Snowflake pieces — only if they buy you a pivot

| Feature | Use | Skip unless |
| --- | --- | --- |
| Streamlit in Snowflake | The whole UI | — |
| `GENERATOR` + views | Projection | — |
| `AI_COMPLETE` | Artifact copy | — |
| Document AI / `AI_EXTRACT` | “Sign This?” input | Mentors demand a PDF |
| Cortex Search | Search seeded offers / clauses | You have a doc pile |
| Cortex Analyst | NL over the ledger | You are overbuilding |
| Time Travel | Joke in the pitch, not a feature | — |
| Dynamic Tables | Refresh ledger if you add uploads | After hour 10 |
| Marketplace data | National avg rent, CPI | You have 20 spare minutes |

Do not stand up an agent, a semantic view, and a search service. That is a different hackathon.

---

## One yes, walked through

Persona: Maya, $4,200 take-home, $3,100 fixed, $900 buffer, $22/hr.  
Decision: $800 laptop, four payments of $215.

1. **State** — two rows, no bank.  
2. **Ledger** — months 1–4 cash_after drops ~$215. Month 8: a missed-buffer flag if any other $47 stack is on. Month 12: `$800 + interest + the $47s` paid, `hours_still_owed ≈ 41`.  
3. **Facts** — receipt dated `DATEADD('year', 1, CURRENT_DATE())`, line items from the view.  
4. **Cortex** — “You checked out for $215. This receipt is for $1,412. March still owes you a weekend.”  
5. **UI** — today’s tiny receipt flips to next year’s.

Same walk for the lease (obligation letter) and the skipped match (forgone paystub). Three costumes. One ledger.

---

## 12-hour cut on this stack

| Hours | Snowflake work |
| --- | --- |
| 0–1 | Seed `PERSONAS`, `DECISIONS`, pick three artifact types |
| 1–3 | `PROJECTED_LEDGER` view. Verify month 3 / 12 / 36 by hand |
| 3–5 | `ARTIFACT_FACTS` for the receipt. Hardcode Cortex copy if needed |
| 5–8 | Streamlit: pick yes → flip today/later |
| 8–9 | Wire `AI_COMPLETE` + cache table |
| 9–10 | Second and third costumes (letter, paystub) on the same facts |
| 10–12 | Kill extra pages. Print the receipt in the pitch |

Pairing: one person SQL ledger, one person Streamlit object, one person copy + fallback renders.

---

## Pitch line that names Snowflake without sounding like a logo slide

> Snowflake walks the decision forward a month at a time and writes a later ledger. We do not chart that ledger. We print the thing later-you would actually get — a receipt, a statement, a no. Cortex only writes the clerk’s voice. The numbers were already true.

---

## Failure modes

- **Cortex invents $2,847.12** — you let the model project. Put numbers only in SQL.  
- **It looks like a dashboard** — you rendered `PROJECTED_LEDGER` instead of an object.  
- **It looks like a chatbot** — you skipped the artifact and asked “what should I do?”  
- **Auth ate the day** — you tried to connect a bank. Delete it.  
- **One persona only** — you cannot pivot. Keep three humans in the table even if the UI shows one.
