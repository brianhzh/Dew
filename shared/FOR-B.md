# B — read this when you sit down

Nathan scaffolded kickoff without you. Nothing here is Snowflake yet.

1. [`contract.md`](./contract.md) — **draft**. Change keys if you must. Commit that file alone and say it out loud.
2. [`constants.json`](./constants.json) — persona **$1500 / $5000**. Essentials include **tuition**.
3. [`fixtures/`](./fixtures/) — eight layer-1 JSONs + `.sse.txt` + `state.json`. Replace the numbers with your model. **Keep the keys.**
4. `/api` and `/snowflake` are empty folders with READMEs.

A is on `nathan-ui` building `/client` against these fixtures (`VITE_OFFLINE=true`).

A also shipped a **local fake bank** (`client/src/model/plantModel.ts`) so amount → vigor / maturity / reserve works before Snowflake is up. Formula is in `contract.md` under “Provisional plant model”. Port that, then flip `VITE_OFFLINE=false`.

Users now **type their own costs** and assign **importance**. Read [`WARRANT.md`](./WARRANT.md) — small-medium can be warranted after 3 clean choices. Keys: `importance`, `warranted`, `clean_streak`.
