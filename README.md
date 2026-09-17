# Dew

A living plant that *is* your financial future. Log a purchase by voice — *"spent 250 on headphones"* — and the plant reacts: a splurge brings a hailstorm, a subscription brings aphids, an essential brings nothing. The long-term cost is something you feel now, not a number you ignore.

The growth math is a **block-bootstrap Monte Carlo run in Snowflake (Snowpark) on real Nasdaq market data from the Snowflake Marketplace**, with Claude narration via Cortex. Full details: [`WRITEUP.md`](WRITEUP.md).

Devpost: https://devpost.com/software/dew-ufkqt1 

|  |  |  |
|:---:|:---:|:---:|
| <img src="https://github.com/user-attachments/assets/3e126d08-1e17-476b-99b2-6760541d2ce2" height="400" /> | <img src="https://github.com/user-attachments/assets/bd2126f0-7374-4ee8-98b4-7e08ebf06d7c" height="400" /> | <img src="https://github.com/user-attachments/assets/df3cb546-d6ba-4403-8d65-51dcfc127c48" height="400" /> |

## Run

```bash
# backend (Python venv with fastapi + uvicorn)
cd api && uvicorn main:app --port 8000

# client (offline by default; set VITE_OFFLINE=false in client/.env to use the backend)
cd client && npm install && npm run dev
```

## Layout

- `client/` — React + Vite plant UI (voice input, L-system canvas)
- `api/` — FastAPI: plant math, voice parsing, endpoints
- `snowflake/` — `setup.sql` (tables) + `montecarlo.sql` (the Snowpark simulation)
- `shared/` — API contract, constants, the Monte Carlo output, offline fixtures
