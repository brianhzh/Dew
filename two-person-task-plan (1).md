# Dew — two-person build checklist (12 hours, chronological)

**Person A** — all UI/UX and frontend (React client, plant renderer, effects, screens, demo choreography).
**Person B** — all Snowflake integration and calculations (tables, runway + Monte Carlo models, Cortex, Marketplace, the thin API).

With two people, the old third track is absorbed: **B owns the API** (it fronts the engine), **A owns the L0 offline loop** (it's client JS), and pitch work splits by ownership at the end.

---

## Standing rules (read once, follow all day)

- **Never start a fallback-ladder level before the one below works end to end.** L0 → L1 → L2 → L3 → L4.
- **A never blocks on B.** The client runs behind an `OFFLINE` flag against fixtures at all times; flipping the flag is the only integration step.
- **B never blocks on A.** Every endpoint is testable with `curl` and the fixture JSONs before the client ever calls it.
- **`/shared/contract.md` is sacred.** Any contract change is announced out loud and committed alone.
- **A pizza never gets lightning.** Every effect and narrative line scales with the severity bucket; essentials (rent, groceries, transit, phone) produce no weather anywhere.
- **Severity constants are tuned once against the seeded student persona (Checkpoint 1), then frozen.** No retuning after 4:30.
- **Pre-agreed cut order if time runs short:** what-if drought *simulation* (the reserve *ring* stays — it's nearly free) → escalating vine → Plaid Sandbox → goal *picker* (fall back to auto-recommended goal). The core loop is never cut.

---

## Hour 0:00–0:30 — Joint kickoff (do not skip, do not extend)

- [ ] **[Joint]** Repo: `/client`, `/api`, `/snowflake`, `/shared`. A scaffolds, B confirms access.
- [ ] **[Joint]** Lock the contract into `/shared/contract.md` (master doc §7): decision request incl. `mode: whatif`, layer-1 response incl. `reserve_weeks_before/after` and `goal_ref`, SSE event shape, action requests incl. `goal_id` on skip.
- [ ] **[Joint]** Copy the student-scale severity buckets (~<$20 / $20–70 / $70+ at the seeded persona) and the severity→effects map incl. `drought` into `/shared/constants` (one JSON both sides import).
- [ ] **[A]** Fixture files: one canned layer-1 response per case — minor, moderate, major, essential (neutral), recurring (pests), skip/nourish, cancel, what-if drought — plus a canned SSE line each.
- [ ] **[B]** Snowflake trial account; ORGADMIN-privileged role confirmed; logged into Snowsight.

---

## Hour 0:30–1:00 — Foundations (parallel)

**Person A**
- [ ] Vite + React scaffold, mobile-first, phone-viewport dev setup (Chrome DevTools device mode).
- [ ] Screen shells with routing: Home, Consider (with a what-if tab shell), Preview, Aftermath, Ledger. Empty but navigable.

**Person B**
- [ ] Marketplace → free financial listing (Cybersyn *Financial & Economic Essentials* / *Snowflake Public Data (Free)*) → **Get**. Inspect the mounted schema; write down actual table/column names.
- [ ] Create the tables (master doc §6) including `goals` with exactly three rows (short / mid / long).
- [ ] Seed the **student persona**: ≈ $1,600/mo income, $1,250 essentials, $150 savings target, $1,900 buffer → ~$200/mo discretionary room, reserve ≈ 5–6 weeks. Goals: trip $400 ($120 in) · sublet deposit $900 ($150) · graduate-with-a-buffer $5,000 ($480).

---

## Hour 1:00–4:00 — Core build (parallel)

**Person A — the complete offline product (L0)**
- [ ] Port the canvas plant demo into `<PlantCanvas>`. Props: `{ vigor, baseline, maturity, reserve_weeks, effects, pests }` — nothing else.
- [ ] Port the effects layer: hail (bounce), rain (darkens soil), frost, falling leaves, wind sway (`sin(t + depth)·wind`, idle breeze always on), lightning flash, screen shake, segment-attached aphids that persist. Add the **drought ramp** (sky dries, slow wilt) keyed to `effects.drought`.
- [ ] **Reserve ring**: soil-moisture / water-level indicator at the plant base driven by `reserve_weeks`, with the "weathers ~N weeks of drought" line.
- [ ] Implement the **JS runway model** directly from spec §8.1 — discretionary room, burn, `reserve_weeks`, impact/buffer_hit/severity, student buckets, essential-neutral, recurring→baseline drop, recovery drift, and the what-if drought path (weeks to exhaustion + required discretionary drop). ~25 lines. Do it independently of B — it becomes the cross-check.
- [ ] Hardcode the narrative fallback bank (2–3 lines per bucket incl. `drought`) and a canned maturity value.
- [ ] Consider screen: amount, category, essential/recurring toggles → Preview. What-if tab: "income stops" scenario input.
- [ ] Preview screen: weather preview for the bucket + concrete-unit line + reserve impact when material + **skip it** / **buy anyway**.
- [ ] Skip flow: **goal picker** on capture (default = recommended goal), advancing the chosen goal bar.
- [ ] Aftermath: effect plays; narrative area renders either an SSE stream or a local string (same interface); recovery-commitment offer on buy.
- [ ] ✅ **Exit criterion:** the full preview → choose → act loop, plus the ring, runs end to end with zero network. This is L0 — the demo floor.

**Person B — engine + API (L1 + fallback L2)**
- [ ] Snowpark runway model (stored procedure or UDF) implementing §8.1 exactly: severity + buckets (student constants from `/shared/constants`), `reserve_weeks`, essential-neutral, recurring→baseline, skip→goal capture, what-if drought outputs.
- [ ] Unit-test against the **8 fixture cases** (minor, moderate, major, essential, recurring, skip, cancel, what-if). Save expected outputs — these are the 4:00 cross-check numbers.
- [ ] API skeleton (FastAPI or Node): `POST /decision` (preview | commit | skip | whatif), `GET /state` (hydrate `plant_state` + `persona` + `goals`), `POST /action` (skip + `goal_id`, buy + recovery, cancel_subscription). Each writes its rows.
- [ ] SSE endpoint `GET /narrative/{decision_id}` serving **fallback-bank lines** in the final event shape (`data:` chunks + `event: done`). Cortex swaps in behind this later; the client never knows.
- [ ] Layer-1 response per contract; `concrete_unit` from a canned percentile for now.
- [ ] ✅ **Exit criterion:** `curl` a preview → correct layer-1 JSON in < 1 s (incl. reserve fields); `curl` the SSE endpoint → a line streams; a `whatif` request returns the drought numbers.

---

## ⏱ CHECKPOINT 1 — Hour 4:00 (Joint, 30–45 min)

- [ ] Flip A's `OFFLINE` flag off. Client → B's API → preview round-trip renders on the plant.
- [ ] **Cross-check:** A's JS runway outputs vs. B's Snowpark outputs on all 8 cases. Any mismatch is a spec-reading bug — fix now.
- [ ] **Severity tuning session:** run the five demo beats ($15 coffee, $60 impulse, $250 headphones, $23/mo subscription, skip) against the seeded persona; confirm each lands in its intended bucket (frost / cold snap / storm / pests / rain). Adjust constants in `/shared/constants` if needed — then **freeze**.
- [ ] Layer-1 latency measured in the client: well under 1 s, warehouse warm.
- [ ] Contract amendments agreed and committed alone.

---

## Hour 4:00–7:00 — Depth (parallel)

**Person A**
- [ ] SSE consumption wired into Aftermath (streamed text under the plant, never blocking the effect).
- [ ] Home: hydrate from `GET /state`; stage label; ambient vigor (soft glow / soil moisture — **no RPG health bar**); reserve ring + drought-endurance line; **three goal bars**.
- [ ] Ledger: three goals with progress, commitments, subscriptions with **cancel** → `POST /action` → aphids leave.
- [ ] Recovery-commitment flow on buy: offer → accept → confirmation.
- [ ] What-if drought UI: run scenario → sky dries, reserve drains forward, "holds for N weeks; drop discretionary to $X by <date>" readout. (First candidate on the cut list — keep it isolated.)
- [ ] Proportional-effects pass: minor = frost only; moderate = partial storm; major = full storm + lightning + shake; essentials render nothing.
- [ ] Keep the `OFFLINE` flag functional — it is the L0 fallback for the rest of the day.

**Person B**
- [ ] Cortex `AI_COMPLETE` with the §9.2 prompt (style guide + metaphor dictionary incl. snowstorm and drought + payload). Verify it never outputs dollars or percentages; severity only from the payload.
- [ ] Wire Cortex into SSE with a **4-second timeout → fallback bank** (identical event shape). Kill-test it.
- [ ] Pre-generate and cache narrative lines for every scripted demo beat, including the drought line.
- [ ] `mc_percentiles` precompute at the **48-month degree horizon**: Marketplace daily prices → monthly returns; block-bootstrap UDTF (contiguous real blocks); N paths; `GROUP BY horizon_month` → p10/p50/p90. Sanity: p10 < p50 < p90 everywhere; magnitudes plausible for equities over 4 years.
- [ ] Swap the canned percentile for the real lookup; compute `concrete_unit` ("~X weeks to next bloom") and maturity deltas; confirm the contributions-dominate framing holds in the numbers.
- [ ] ✅ **Exit criterion:** a preview returns a Cortex-voiced line + a Marketplace-grounded concrete unit + correct reserve fields. This is L3.

---

## ⏱ CHECKPOINT 2 — Hour 7:00 (Joint, 45 min)

- [ ] Full dry run of the 90-second runbook — all six beats (reframe · preview headphones · buy anyway · pests + cancel · skip + reserve line · close) — on the demo machine, phone viewport.
- [ ] Latency audit: layer 1 < 1 s; narrative starts < 4 s or fallback fires.
- [ ] Kill-tests: stop Cortex → fallback line streams; stop API → `OFFLINE` mode still demos the loop.
- [ ] Bug triage: integration bugs now; polish deferred to 9:00+.

---

## Hour 7:00–8:00 — Feed + hardening (parallel)

**Person A**
- [ ] Toast/notification UI for feed events (in-app toast; no web-push).
- [ ] Aftermath → Home transitions; recovery visibly progressing (vigor drifting up on next load).

**Person B**
- [ ] Simulated feed: scripted timestamped events **in Plaid's transaction/webhook schema** inserted into `transactions` on a timer; API pushes SSE toasts. Include **one recurring stream** so aphids arrive "automatically."
- [ ] Warehouse keep-alive query on a timer (runs through judging).
- [ ] One-command **demo reset script**: restores persona, resets all three goals' progress, clears decisions/commitments/pests, resets `plant_state` (vigor, baseline, maturity, reserve). Run between every rehearsal and before judging.

---

## ⏱ HOUR 8:00 — HARD GATE (Joint, 15 min, non-negotiable)

Decide out loud, write it in the repo:
- [ ] Does L3 (Cortex + Marketplace) ship, or pin to fallbacks?
- [ ] Does L4 (feed + polish) ship?
- [ ] **What-if drought:** interactive simulation, or ring-only? (Ring always ships.)
- [ ] **Goal picker**, or auto-recommended goal only?
- [ ] Attempt the **Plaid Sandbox swap** (2–3 h: Link flow, `user_transactions_dynamic`, `/transactions/refresh`-triggered webhooks, recurring streams → pests)? Only if everything above is green **and** B wants it. If in doubt: no — the feed already speaks Plaid's schema and the pitch claim holds either way.

---

## Hour 8:00–10:30 — Polish or Plaid (parallel)

**Person A**
- [ ] Visual polish, in order: per-leaf scale-in on regrowth (recovery reads as growth) → drought visuals refinement (if green) → sky ambiance tied to fan width → escalating vine only if time is truly spare.
- [ ] Demo hardware: viewport window sized for the projector, or real-phone mirroring (scrcpy Android / QuickTime iPhone) tested **on the actual demo machine**.
- [ ] Record a backup screen capture of the full golden path. This is the parachute.

**Person B**
- [ ] If gate said yes: Plaid Sandbox swap behind the same feed interface.
- [ ] If gate said no: hardening — reset + full loop three times; cached lines cover every scripted beat; fallback toggles verified from a cold start.
- [ ] Pre-warm procedure documented: keep-alive confirmed; one warm-up query 10 min before judging.

---

## Hour 10:30–11:30 — Pitch assembly (joint, split by ownership)

- [ ] **[A]** Deck visuals: the plant across states, the storm frame, the pests frame, the reserve ring.
- [ ] **[B]** Architecture slide (Mermaid flowchart), "real data, real simulation" slide, and the **five** Q&A answers from master doc §18 as speaker notes (evidence · coffee-vs-projection · guilt-tripping · real bank · contributions-dominate).
- [ ] **[Joint]** Demo script: button-by-button choreography for the six beats; assign driver and narrator.
- [ ] **[Joint]** Opening reframe ("first year, first time on your own…") and closing line ("…at the campus bookstore you pause") memorized verbatim.

---

## Hour 11:30–12:00 — Freeze and rehearse (joint)

- [ ] Code freeze. `main` pulled on the demo machine. No commits after this except demo-blocking fixes agreed by both.
- [ ] Reset script → three full timed rehearsals of the 90-second demo.
- [ ] Q&A drill: all five questions, one-sentence answers each.
- [ ] Backup video accessible offline. Devices charged. Keep-alive running. Reset script run one final time before walking up.

---

## Dependency map (the only four moments you must be in sync)

```
0:00  contract lock  →  4:00 checkpoint 1 (+ tuning freeze)  →  7:00 checkpoint 2  →  8:00 hard gate
```
Everything else is parallel. If a checkpoint slips more than 30 minutes, drop one level on the fallback ladder and keep moving — a working L1 demo beats a broken L3 demo every time.
