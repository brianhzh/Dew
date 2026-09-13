"""regenerate the fixture files. the api must be running first.

  /home/brian/.venvs/dew/bin/python make_fixtures.py

each case posts a real purchase or cancel, then reads the streamed
narrative line back over the sse endpoint.
"""
import json
import os
import urllib.request
from pathlib import Path

BASE = os.environ.get("DEW_API", "http://127.0.0.1:8000")
OUT = Path(__file__).resolve().parent.parent / "shared" / "fixtures"
U = "demo-1"


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def narrative_text(decision_id):
    # rebuild the line from the sse data chunks. sse eats one leading space
    # per field, the chunk spacing is the second space so it survives.
    with urllib.request.urlopen(f"{BASE}/narrative/{decision_id}") as r:
        raw = r.read().decode()
    out = []
    for line in raw.splitlines():
        if line.startswith("data:"):
            v = line[5:]
            if v.startswith(" "):
                v = v[1:]
            if v:
                out.append(v)
    return "".join(out)


def save(name, request, response, note):
    OUT.mkdir(exist_ok=True)
    nar = narrative_text(response["decision_id"])
    (OUT / f"{name}.json").write_text(json.dumps(
        {"case": name, "note": note, "request": request,
         "response": response, "narrative": nar}, indent=2) + "\n")
    print(f"  {name:14s} {response['severity_bucket']:9s} "
          f"vigor {response['vigor_delta']:>6}  {nar[:52]}")


def purchase(name, req, note):
    call("POST", "/reset")  # each fixture stands alone from a clean seed
    save(name, req, call("POST", "/purchase", req), note)


# clear the old design fixtures so the folder matches the new cases
OUT.mkdir(exist_ok=True)
for old in OUT.glob("*.json"):
    old.unlink()

purchase("essential",
         {"user_id": U, "amount": 1250, "category": "rent", "merchant": "landlord",
          "is_recurring": False, "is_essential": True},
         "rent, an essential, so no weather at all")

purchase("small_coffee",
         {"user_id": U, "amount": 15, "category": "coffee", "merchant": "campus cafe",
          "is_recurring": False, "is_essential": False},
         "a 15 dollar coffee, a light cold spell")

purchase("small_impulse",
         {"user_id": U, "amount": 60, "category": "impulse", "merchant": "bookstore",
          "is_recurring": False, "is_essential": False},
         "a 60 dollar impulse buy, still a cold spell but it stings more")

purchase("big_headphones",
         {"user_id": U, "amount": 250, "category": "electronics", "merchant": "Best Buy",
          "is_recurring": False, "is_essential": False},
         "the 250 dollar headphones, a hailstorm")

purchase("subscription",
         {"user_id": U, "amount": 23, "category": "food delivery", "merchant": "DashPass",
          "is_recurring": True, "is_essential": False},
         "a 23 dollar a month membership, aphids move in")

# cancel needs a live subscription, so commit the membership then drop it
call("POST", "/reset")
call("POST", "/purchase",
     {"user_id": U, "amount": 23, "category": "food delivery", "merchant": "DashPass",
      "is_recurring": True, "is_essential": False})
creq = {"user_id": U, "merchant": "DashPass"}
save("cancel", creq, call("POST", "/cancel", creq),
     "cancel DashPass, the aphids leave and the baseline is restored")

call("POST", "/reset")
print(f"fixtures written to {OUT}")
