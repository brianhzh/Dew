"""state backed by a json file. swaps for snowflake later behind the same methods."""
import json
import time
from pathlib import Path

import engine

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data" / "store.json"
SEED_FILE = ROOT.parent / "shared" / "seed.json"


class Store:
    def __init__(self):
        if DATA_FILE.exists():
            self.db = json.loads(DATA_FILE.read_text())
        else:
            self.reset()

    def reset(self):
        self.db = json.loads(SEED_FILE.read_text())
        self.db["plant_state"]["last_event_ts"] = time.time()
        self.save()

    def save(self):
        DATA_FILE.parent.mkdir(exist_ok=True)
        DATA_FILE.write_text(json.dumps(self.db, indent=2))

    def next_id(self, kind: str, prefix: str) -> str:
        self.db["counters"][kind] += 1
        return f"{prefix}-{self.db['counters'][kind]}"

    # plant state
    def drift(self):
        # vigor eases toward baseline based on time since last event
        ps = self.db["plant_state"]
        now = time.time()
        days = (now - ps["last_event_ts"]) / 86400
        if days <= 0:
            ps["last_event_ts"] = now
            return
        ps["vigor"] = engine.drift_vigor(ps["vigor"], ps["baseline"], days)
        ps["maturity"] = engine.clamp(ps["maturity"] + engine.maturity_growth(days), 0, 100)
        ps["last_event_ts"] = now
        self.save()

    # lookups
    def decision(self, decision_id: str):
        return next((d for d in self.db["decisions"] if d["decision_id"] == decision_id), None)

    def goal(self, goal_id: str):
        return next((g for g in self.db["goals"] if g["goal_id"] == goal_id), None)

    def recommended_goal(self) -> dict:
        # nearest underfunded goal, short then mid then long
        for g in self.db["goals"]:
            if g["progress"] < g["amount"]:
                return g
        return self.db["goals"][0]

    def subscription(self, merchant: str):
        return next((s for s in self.db["subscriptions"]
                     if s["merchant"].lower() == merchant.lower()), None)

    def long_goal_amount(self) -> float:
        # the long term goal normalizes the maturity setback
        g = next((x for x in self.db["goals"] if x["term"] == "long"), None)
        return float(g["amount"]) if g else 5000.0
