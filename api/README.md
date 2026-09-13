# `/api` — Person B

Empty on purpose. Nathan (A) is scaffolding the client against `/shared` fixtures.

When you arrive:

1. Read [`/shared/contract.md`](../shared/contract.md). Treat it as a draft. If you change a field, say it out loud and commit that file alone.
2. Re-seed the freshman as **$1,500/mo income, $5,000 saved**. Old $1,600 / $1,900 is dead.
3. Implement `POST /decision`, `GET /state`, `POST /action`, `GET /narrative/{id}` so `curl` matches the eight fixtures in `/shared/fixtures`.
4. You own every number: `vigor`, `maturity`, `baseline`, `reserve_weeks`, `severity`, `effects`, `healthy`, trophy count.

A never calls this folder until `VITE_OFFLINE=false`.
