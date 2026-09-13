# Later You — 12-hour idea board

**Prompt:** People make financial decisions without clearly understanding how those decisions may affect them later.

**Working name:** Later You  
**Constraint:** 12 hours, broad audience first, pivots expected.  
**Do not lock a niche yet.** Lock a *mechanism*. Swap the first screen when judges or mentors push you.

---

## The one-line product

A person brings a real decision. In under 30 seconds they see **later-them** at 3 months, 1 year, and 5 years — in money, time, and one thing they give up.

Not a budget app. Not a lecture. A **consequence preview** at the moment of yes.

That mechanism works for a lease, a car, BNPL, a 401k opt-out, a phone plan, a move, or a couple splitting rent. The wedge can change. The engine should not.

---

## Recommended starting bet

**Build Later You as two futures on one amount:** the cost of the yes, and a short / mid / long goal they log if they keep the money.

A loss-only receipt is a good demo and a bad app. People will not live in “what could’ve been.” They will live in **what this amount can still become.** Same ledger, inverted.

Ship **three demo decisions** that look different but use the same math + copy engine:

1. **Sign something** — 12-month apartment, or a used-car loan  
2. **Tap something** — $800 laptop on 4 payments, or a $47/mo stack of subscriptions  
3. **Skip something** — declining a 4% 401k match, or paying only the credit-card minimum

Why this bet:

- Judges will recognize at least one of those decisions as their own
- Mentors can say “make it for X” and you change the default scenario, not the product
- Demo has a visceral beat: *today feels fine → later is not*
- 12 hours is enough for one polished flow + two scenario swaps, not a bank aggregator

**Backup wedges if this one dies:** contract decoder (“Sign This?”), or payday cash-flow (“Payday Illusion”). Same story, different first screen.

---

## What “later” actually means

Most money products show **now**: balance, score, budget left. The prompt is about **path dependence**.

A good “later” view always has three layers:

| Layer | What it answers | Example |
| --- | --- | --- |
| Cash | What does this do to money I will need? | $214/mo leftover becomes $41 by month 4 |
| Optionality | What doors close? | Credit utilization blocks the next apartment |
| Life | What do I give up that I can feel? | 11 weekends of overtime, or the trip in August |

If you only show a bigger number, you built a calculator. If you show a closed door *and* a felt loss, you built the scare. If you also show a later they can claim, you built the product.

---

## Two artifacts, one amount

The yes frees or traps the same cash. Print both.

| Fork | Object | Meaning |
| --- | --- | --- |
| Say yes | Next-year receipt / statement | What later costs |
| Keep it | Goal slip they own | What later can be |

**They log the goal.** You suggest three horizons from the amount + Marketplace params. They pick or type. The second artifact is *their* later, not a lecture.

| Horizon | When | How you fill it |
| --- | --- | --- |
| Short | ~3 months | First slice of buffer, or the fee they avoid |
| Mid | ~1 year | Marketplace-typical ticket this cash actually reaches (trip, deposit, used-phone) |
| Long | ~5 years | Same cash parked / matched / not-interested — one named thing, not a net-worth chart |

Rules:

- Suggestions are numbered from the ledger (`amount * months`, CPI, wage). Not “live your best life.”
- One logged goal per horizon is enough. No streaks, no budget, no coach.
- The goal slip is still an artifact: dated, itemized, “funded by not taking X.” If they would not get this paper in real life, it is a progress bar. Kill it.
- Monte Carlo still applies: p50 “you hit this,” p10 “you hit it late / not at all.” Usable, not guaranteed.

**Do not build:** a goals app, a savings account, Plaid round-ups, or a chatbot that asks “what are your dreams?” The log box is one sentence + a pick.

---

## Audience map (keep this wide for now)

Do not pick a persona as the company. Pick a persona as **the first demo**.

| Audience | Decision they misunderstand | Why it is pivot-friendly |
| --- | --- | --- |
| Anyone about to sign | Lease, car, phone, student loan, insurance | Photo / paste a real document |
| Anyone with autopay | Subscriptions, BNPL, “4 easy payments” | Universal; judges all have this |
| First-job / new benefits | 401k match, HSA, ESPP, insurance tier | Strong for this room; easy to over-narrow |
| Paycheck / gig / hourly | Taking the extra shift vs the Uber / the float | Emotional; timing matters more than APR |
| Shared household | Couples, roommates, “I’ll cover it this month” | Social demo; risk of scope creep |
| Students / first credit | First card, first overdraft, first “build credit” | Classic; can feel homework-y |
| Movers / job changers | New city, new salary, new commute | Life-event framing, one-time wow |
| Side hustle / small yes | Equipment, software, “write it off” | Easy to become tax software. Don’t. |

**Tonight’s default:** “anyone about to say yes to a payment.” That is most adults.

---

## The reusable engine (protect this in every pivot)

```
decision in  →  rules + simple math + short explanation  →  3 futures out
```

**Inputs (keep tiny):**

- What are you saying yes to? (preset or one sentence)
- How much, how often, how long?
- Rough take-home (or “this is tight / okay / comfortable”)
- Optional: paste or photo of the offer

**Outputs (always the same):**

1. **Now** — why this feels fine  
2. **Soon** — first crack (fee, squeeze, missed payment risk)  
3. **Later** — the path you accidentally chose  
4. **One tradeoff in human units** — hours of work, a trip, a month of groceries  
5. **One door that closes** — credit, savings buffer, ability to move, ability to quit

**Do not build in hour 1:** bank login, full transaction history, accounts, investments, tax filing, credit-bureau pulls.

A language model can write the explanation. **Do the numbers yourself** with a few honest formulas. Hallucinated APRs will sink trust in a finance demo.

**If Snowflake is the stack:** the future-artifact method is how you render those five outputs. SQL projects a later ledger. Cortex only writes the voice of the object. See [SNOWFLAKE-FUTURE-ARTIFACT.md](./SNOWFLAKE-FUTURE-ARTIFACT.md).

---

## Idea list

Star these as you talk. The first three share one engine. The rest are legitimate pivots, not random apps.

### A. Later You — 3-horizon preview  
**Start here.** User picks or types a decision. App shows now / 1 year / 5 years plus one felt loss.  
**12h:** high. **Wow:** high. **Audience:** everyone.  
**Pivot:** change the three presets (lease → BNPL → 401k).

### B. The Receipt From Next Year  
Same engine, sharper object. You “check out” and get a receipt: interest, fees, opportunity cost, what you didn’t buy.  
**12h:** high. **Wow:** very high in a demo. **Audience:** shoppers, BNPL, subscriptions.  
**Use this as the visual metaphor even if the product is A.**

### C. Sign This?  
Photo or paste a lease, car offer, card mailer, or BNPL terms. Extract the 5 clauses that hurt later.  
**12h:** medium-high if you fake OCR with paste + LLM. **Wow:** high with a real PDF.  
**Pivot:** any document type. Risk: becomes a summarizer with no “later.”

### D. The Quiet Bill  
Death by a thousand autopays. Stack 4–6 “small” yeses and show the pile in month 8.  
**12h:** high. **Wow:** medium-high (everyone nods).  
**Risk:** looks like a subscription tracker. Must end on a *future*, not a list.

### E. Payday Illusion  
A choice that is fine on Friday and wrecks Wednesday. Calendar of cash, not APR.  
**12h:** high. **Wow:** high for anyone who has been broke between paychecks.  
**Pivot:** students, gig, new grads, parents. Best “narrow later” if mentors want a community.

### F. Credit Time Machine  
One late payment, one maxed card, one BNPL stack → apartment / car / insurance 18 months later.  
**12h:** medium (need a few honest rules, not a real FICO). **Wow:** high if the closed door is vivid.  
**Risk:** fake credit scores look like a toy.

### G. Hours Later  
Every yes converts to hours of future work at *your* wage.  
**12h:** very high. **Wow:** medium unless the copy is brutal and specific.  
**Use as a module inside A, not the whole product.**

### H. First Big Yes  
A kit for first apartment / first car / first card / first job.  
**12h:** medium (content-heavy). **Wow:** medium.  
**Pivot magnet.** Good if the room is full of students. Easy to become a blog.

### I. Match Left Behind  
“I can’t afford to save” vs leaving the employer match on the table.  
**12h:** high. **Wow:** high for employed judges. **Audience:** narrower.  
**Park this as scenario 3 of Later You, not the company.**

### J. Split the Future  
Two people, one decision, two later-lives. Roommate or couple.  
**12h:** medium (two states, conflict UI). **Wow:** high live.  
**Pivot if you want a social / viral demo. Scope risk.**

### K. The Fork  
Life event: move, new job, breakup, kid, visa. “You are about to change money paths.”  
**12h:** medium. **Wow:** high story, heavy content.  
**Save for a later pivot if they want “life” not “purchase.”**

### L. Ghost Budget  
Your current life vs the life your minimum payments already signed you up for.  
**12h:** medium. **Wow:** high if the visual is a haunting overlay, not a spreadsheet.  
**Good art direction for A. Dangerous as a full budgeting product.**

### Parked (only if the room forces you)

- Workplace-only benefits concierge  
- Immigrant / first-US-bank onboarding  
- Parent + teen first-credit coach  
- Small-business “write it off” (becomes tax; skip tonight)

---

## What not to build tonight

These lose 12-hour hackathons on this prompt:

1. **Another Mint / YNAB / Rocket Money** — “see your spending” is now, not later  
2. **Generic AI money chatbot** — no object, no beat, no demo  
3. **Full bank aggregation** — Plaid + auth will eat the day  
4. **Investment / crypto / “beat the market”** — wrong prompt  
5. **Credit-score dashboard** — unless it is *one* closed door in the time machine  
6. **A 40-page financial literacy course** — judges will not do homework  
7. **Anything that needs perfect personal data to be useful** — use presets + one optional number

---

## How to pick in the next hour

Score each idea 1–5 on four things. Ship the highest *product* of these, not the sum:

1. **Felt later** — does someone flinch?  
2. **Broad face** — can three different judges see themselves?  
3. **12-hour shape** — one flow, three examples, fake data is fine  
4. **Pivot hinge** — can you change the audience without rewriting the engine?

Later You (A) + next-year receipt (B) as the UI + Sign This (C) as an optional input is the combination that scores highest.

If a mentor says “too broad,” do **not** rebuild. Change the first card to *one* audience and keep the same futures view.

---

## 12-hour clock

| Hours | Do this | Done when |
| --- | --- | --- |
| 0–1 | Pick A as the engine. Lock 3 demo decisions. Write the 30-second pitch. | You can say the product in one breath |
| 1–3 | Math + rules for those 3. Hardcode honest numbers. Draft the 5 output slots. | A CLI or ugly page returns 3 futures |
| 3–7 | One beautiful path. Receipt or split-screen now vs later. Mobile-first is fine. | A stranger can tap through without you |
| 7–8 | Scenario switcher (lease / BNPL / match). Add “hours of work” + one closed door | Three demos, one UI |
| 8–10 | Demo script, empty/error states, one paste-an-offer path if time | You can recover if Wi-Fi or LLM dies |
| 10–11 | Kill features. Tighten copy. Record a 60s backup video | Product looks smaller and sharper |
| 11–12 | Pitch: problem → one tap → flinch → “same engine, any yes” | Three of you can give the pitch |

**Pairing suggestion:** one person on numbers + scenarios, one on UI + motion, one on copy + pitch + fake but real-looking offers.

---

## Pitch in 30 seconds

> Most money tools show you what you have. They do not show you what a yes turns into.  
> Later You takes a real decision — a lease, four payments, a skipped 401k — and shows you at 3 months, 1 year, and 5 years: the cash, the door that closes, and the thing you give up.  
> We started broad on purpose. The product is not “for students” or “for renters.” It is for the moment before you sign.

---

## Copy you can steal for the demo

- “This feels like $47. It behaves like a $1,400 year.”  
- “Payday you can afford this. The 23rd cannot.”  
- “You are not choosing a laptop. You are choosing a busier March.”  
- “Minimum payment is how a $2,400 balance becomes a 4-year roommate.”  
- “Declining the match is a raise you hand back.”

Tone: calm, specific, a little cold. Not a scold, not a mascot, not “slay your finances.”

---

## Open questions (answer only when you must)

- Do we need a photo of a real offer, or are three presets enough for the room?  
- Is the first screen a **blank decision** or a **menu of common yeses**? (Menu is faster.)  
- Do we store anything? (No. Presets only tonight.)  
- Brand: Later You / After This / Next Year Receipt — pick at hour 10, not hour 1.

---

## If they force a pivot

Keep the output contract. Change only the input.

| They say | You do |
| --- | --- |
| “Too broad” | Default to one audience; keep the 3-horizon view |
| “Too much like a calculator” | Lead with the receipt + the felt loss, hide the formulas |
| “We care about Gen Z / students” | First Big Yes presets; same engine |
| “We care about workers” | Match + payday scenarios |
| “Show us AI” | Paste-an-offer decoder as the input, not the product |
| “This is just budgeting” | Kill any charts of past spend. Only show futures |
| “Can it connect to my bank?” | “Not tonight — presets keep the later-view honest.” |

The loss condition is rebuilding the product every time someone names a new user. The win condition is **one later-view, many yeses.**
