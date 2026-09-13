# Dew API - Person B track

Thin API per `/shared/contract.md`. Post purchase only: a purchase is made, the
server computes the plant effect and picks one weather event. Runs fully offline
today (JSON store); Snowflake swaps in behind `store.py` without touching
`main.py` (set `DEW_STORE=snowflake` and fill the env vars, see
`snowflake_store.py`).

## Run

```bash
# venv already exists at ~/.venvs/dew (fastapi + uvicorn), do not recreate it
~/.venvs/dew/bin/uvicorn main:app --reload --port 8000
```

## Verify

```bash
~/.venvs/dew/bin/python test_engine.py   # engine cross-check, prints a pass line

curl -s localhost:8000/state | python3 -m json.tool

# small one-off (cold spell) - the $15 coffee
curl -s localhost:8000/purchase -H 'content-type: application/json' \
  -d '{"user_id":"demo-1","amount":15,"category":"coffee","merchant":"Cafe","is_recurring":false,"is_essential":false}'

# big one-off (hailstorm) - the $250 headphones
curl -s localhost:8000/purchase -H 'content-type: application/json' \
  -d '{"user_id":"demo-1","amount":250,"category":"electronics","merchant":"Best Buy","is_recurring":false,"is_essential":false}'

# subscription (aphids) - $23 recurring
curl -s localhost:8000/purchase -H 'content-type: application/json' \
  -d '{"user_id":"demo-1","amount":23,"category":"subscription","merchant":"DashPass","is_recurring":true,"is_essential":false}'

# cancel the subscription (aphids leave)
curl -s localhost:8000/cancel -H 'content-type: application/json' \
  -d '{"user_id":"demo-1","merchant":"DashPass"}'

# SSE narrative for a decision_id from any response above
curl -sN localhost:8000/narrative/d-101

# reset between rehearsals (the one-command demo reset)
curl -s -X POST localhost:8000/reset
```

## Fixtures

`~/.venvs/dew/bin/python make_fixtures.py` (server must be running) regenerates
`/shared/fixtures/*.json` from the live API, one `{case, note, request, response,
narrative}` per demo case. Rerun after any constants change.
