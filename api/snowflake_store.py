"""snowflake backed store, same public shape as the json Store.

to use snowflake instead of the local json file set DEW_STORE=snowflake and
fill these env vars before starting the api:
  SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_PASSWORD
  SNOWFLAKE_WAREHOUSE (default DEW_WH)
  SNOWFLAKE_DATABASE  (default DEW)
  SNOWFLAKE_SCHEMA    (default CORE)
main keeps using the json Store by default. this adapter is untested until a
real account is wired up. it talks to the tables in snowflake/setup.sql plus a
small subscriptions helper table it creates on connect, since the base schema
has no subscriptions table yet.
"""
import json
import os
import time
from pathlib import Path

import engine

try:
    import snowflake.connector as sf
except Exception:  # connector not installed yet, keep the module importable
    sf = None

ROOT = Path(__file__).resolve().parent
SEED_FILE = ROOT.parent / "shared" / "seed.json"

# order goals short then mid then long so recommended_goal walks nearest first
_TERM_ORDER = "CASE term WHEN 'short' THEN 0 WHEN 'mid' THEN 1 ELSE 2 END"


def _f(x):
    # snowflake NUMBER comes back as Decimal, keep the engine on plain floats
    return None if x is None else float(x)


def _i(x):
    return None if x is None else int(x)


def _json(x):
    # VARIANT can arrive as a json string or an already parsed value
    if x is None:
        return []
    if isinstance(x, (list, dict)):
        return x
    return json.loads(x)


class SnowflakeStore:
    def __init__(self):
        if sf is None:
            raise RuntimeError("snowflake-connector-python is not installed")
        self._seed = json.loads(SEED_FILE.read_text())
        self.user_id = os.environ.get("DEW_USER_ID", self._seed["persona"]["user_id"])
        self.conn = sf.connect(
            account=os.environ["SNOWFLAKE_ACCOUNT"],
            user=os.environ["SNOWFLAKE_USER"],
            password=os.environ["SNOWFLAKE_PASSWORD"],
            warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE", "DEW_WH"),
            database=os.environ.get("SNOWFLAKE_DATABASE", "DEW"),
            schema=os.environ.get("SNOWFLAKE_SCHEMA", "CORE"),
        )
        self._ensure_aux()
        # seed the tables the first time we see an empty account
        if not self.load():
            self.reset()

    # connection helpers

    def _exec(self, sql, params=None):
        cur = self.conn.cursor()
        try:
            cur.execute(sql, params or {})
        finally:
            cur.close()

    def _rows(self, sql, params=None):
        cur = self.conn.cursor()
        try:
            cur.execute(sql, params or {})
            cols = [c[0].lower() for c in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]
        finally:
            cur.close()

    def _many(self, sql, rows):
        if not rows:
            return
        cur = self.conn.cursor()
        try:
            cur.executemany(sql, rows)
        finally:
            cur.close()

    def _ensure_aux(self):
        # subscriptions live here, the base setup.sql has no table for them
        self._exec(
            "CREATE TABLE IF NOT EXISTS subscriptions ("
            " user_id STRING, merchant STRING, amount_monthly NUMBER(10,2),"
            " baseline_drop FLOAT, started_ts TIMESTAMP_NTZ)"
        )

    # load and save the whole in memory mirror, like the json store does

    def load(self) -> bool:
        uid = {"u": self.user_id}
        persona = self._rows(
            "SELECT user_id, monthly_income, essentials_monthly,"
            " savings_target_monthly, liquid_buffer, horizon_months"
            " FROM persona WHERE user_id=%(u)s", uid)
        if not persona:
            return False
        p = persona[0]
        p["monthly_income"] = _f(p["monthly_income"])
        p["essentials_monthly"] = _f(p["essentials_monthly"])
        p["savings_target_monthly"] = _f(p["savings_target_monthly"])
        p["liquid_buffer"] = _f(p["liquid_buffer"])
        p["horizon_months"] = _i(p["horizon_months"])

        goals = self._rows(
            "SELECT goal_id, term, name, amount, progress FROM goals"
            " WHERE user_id=%(u)s ORDER BY " + _TERM_ORDER, uid)
        for g in goals:
            g["amount"] = _f(g["amount"])
            g["progress"] = _f(g["progress"])

        prows = self._rows(
            "SELECT vigor, baseline, maturity, pests_json,"
            " DATE_PART(EPOCH_SECOND, last_event_ts) AS last_event_ts"
            " FROM plant_state WHERE user_id=%(u)s", uid)
        ps = prows[0] if prows else dict(self._seed["plant_state"])
        plant_state = {
            "vigor": _f(ps["vigor"]), "baseline": _f(ps["baseline"]),
            "maturity": _f(ps["maturity"]),
            "pests": _json(ps.get("pests_json")),
            "last_event_ts": _f(ps.get("last_event_ts")) or time.time(),
        }

        decisions = self._rows(
            "SELECT decision_id, user_id,"
            " DATE_PART(EPOCH_SECOND, ts) AS ts, amount, category,"
            " is_recurring, is_essential, severity_bucket, vigor_delta,"
            " maturity_delta, choice FROM decisions"
            " WHERE user_id=%(u)s ORDER BY ts", uid)
        for d in decisions:
            d["ts"] = _f(d["ts"])
            d["amount"] = _f(d["amount"])
            d["vigor_delta"] = _f(d["vigor_delta"])
            d["maturity_delta"] = _f(d["maturity_delta"])
            # columns the base schema does not carry, fill harmless defaults
            d.setdefault("merchant", "")
            d.setdefault("severity", 0.0)
            d.setdefault("baseline_delta", 0.0)

        transactions = self._rows(
            "SELECT txn_id, user_id, DATE_PART(EPOCH_SECOND, ts) AS ts,"
            " amount, category, merchant, is_recurring, is_essential, source"
            " FROM transactions WHERE user_id=%(u)s ORDER BY ts", uid)
        for t in transactions:
            t["ts"] = _f(t["ts"])
            t["amount"] = _f(t["amount"])

        commitments = self._rows(
            "SELECT commitment_id, user_id, DATE_PART(EPOCH_SECOND, ts) AS ts,"
            " kind, amount, goal_id, status FROM commitments"
            " WHERE user_id=%(u)s ORDER BY ts", uid)
        for c in commitments:
            c["ts"] = _f(c["ts"])
            c["amount"] = _f(c["amount"])

        subscriptions = self._rows(
            "SELECT merchant, amount_monthly, baseline_drop,"
            " DATE_PART(EPOCH_SECOND, started_ts) AS started_ts"
            " FROM subscriptions WHERE user_id=%(u)s ORDER BY started_ts", uid)
        for s in subscriptions:
            s["amount_monthly"] = _f(s["amount_monthly"])
            s["baseline_drop"] = _f(s["baseline_drop"])
            s["started_ts"] = _f(s["started_ts"])

        self.db = {
            "persona": p,
            "goals": goals,
            "plant_state": plant_state,
            "subscriptions": subscriptions,
            "decisions": decisions,
            "transactions": transactions,
            "commitments": commitments,
            "counters": {},
        }
        self.db["counters"] = self._derive_counters()
        return True

    def save(self):
        # full rewrite of this user rows, small demo data so this stays simple
        uid = {"u": self.user_id}
        p = self.db["persona"]
        self._exec("DELETE FROM persona WHERE user_id=%(u)s", uid)
        self._exec(
            "INSERT INTO persona VALUES (%(user_id)s, %(monthly_income)s,"
            " %(essentials_monthly)s, %(savings_target_monthly)s,"
            " %(liquid_buffer)s, %(horizon_months)s)",
            {"user_id": self.user_id, **{k: p.get(k) for k in (
                "monthly_income", "essentials_monthly",
                "savings_target_monthly", "liquid_buffer", "horizon_months")}})

        self._exec("DELETE FROM goals WHERE user_id=%(u)s", uid)
        self._many(
            "INSERT INTO goals VALUES (%(goal_id)s, %(user_id)s, %(term)s,"
            " %(name)s, %(amount)s, %(progress)s)",
            [{"goal_id": g["goal_id"], "user_id": self.user_id, "term": g["term"],
              "name": g["name"], "amount": g["amount"], "progress": g["progress"]}
             for g in self.db["goals"]])

        ps = self.db["plant_state"]
        self._exec("DELETE FROM plant_state WHERE user_id=%(u)s", uid)
        self._exec(
            "INSERT INTO plant_state SELECT %(user_id)s, %(vigor)s, %(baseline)s,"
            " %(maturity)s, PARSE_JSON(%(pests)s), TO_TIMESTAMP_NTZ(%(ts)s)",
            {"user_id": self.user_id, "vigor": ps["vigor"], "baseline": ps["baseline"],
             "maturity": ps["maturity"], "pests": json.dumps(ps.get("pests", [])),
             "ts": ps.get("last_event_ts", time.time())})

        self._exec("DELETE FROM decisions WHERE user_id=%(u)s", uid)
        self._many(
            "INSERT INTO decisions SELECT %(decision_id)s, %(user_id)s,"
            " TO_TIMESTAMP_NTZ(%(ts)s), %(amount)s, %(category)s, %(is_recurring)s,"
            " %(is_essential)s, %(severity_bucket)s, %(vigor_delta)s,"
            " %(maturity_delta)s, %(choice)s",
            [{"decision_id": d["decision_id"], "user_id": self.user_id,
              "ts": d.get("ts", time.time()), "amount": d.get("amount", 0.0),
              "category": d.get("category", ""),
              "is_recurring": bool(d.get("is_recurring")),
              "is_essential": bool(d.get("is_essential")),
              "severity_bucket": d.get("severity_bucket", "neutral"),
              "vigor_delta": d.get("vigor_delta", 0.0),
              "maturity_delta": d.get(
                  "maturity_delta",
                  engine.maturity_delta(d.get("severity_bucket", "neutral"))),
              "choice": d.get("choice", "buy")}
             for d in self.db["decisions"]])

        self._exec("DELETE FROM transactions WHERE user_id=%(u)s", uid)
        self._many(
            "INSERT INTO transactions SELECT %(txn_id)s, %(user_id)s,"
            " TO_TIMESTAMP_NTZ(%(ts)s), %(amount)s, %(category)s, %(merchant)s,"
            " %(is_recurring)s, %(is_essential)s, %(source)s",
            [{"txn_id": t["txn_id"], "user_id": self.user_id,
              "ts": t.get("ts", time.time()), "amount": t.get("amount", 0.0),
              "category": t.get("category", ""), "merchant": t.get("merchant", ""),
              "is_recurring": bool(t.get("is_recurring")),
              "is_essential": bool(t.get("is_essential")),
              "source": t.get("source", "manual")}
             for t in self.db["transactions"]])

        self._exec("DELETE FROM commitments WHERE user_id=%(u)s", uid)
        self._many(
            "INSERT INTO commitments SELECT %(commitment_id)s, %(user_id)s,"
            " TO_TIMESTAMP_NTZ(%(ts)s), %(kind)s, %(amount)s, %(goal_id)s, %(status)s",
            [{"commitment_id": c["commitment_id"], "user_id": self.user_id,
              "ts": c.get("ts", time.time()), "kind": c.get("kind", ""),
              "amount": c.get("amount", 0.0), "goal_id": c.get("goal_id"),
              "status": c.get("status", "active")}
             for c in self.db["commitments"]])

        self._exec("DELETE FROM subscriptions WHERE user_id=%(u)s", uid)
        self._many(
            "INSERT INTO subscriptions SELECT %(user_id)s, %(merchant)s,"
            " %(amount_monthly)s, %(baseline_drop)s, TO_TIMESTAMP_NTZ(%(ts)s)",
            [{"user_id": self.user_id, "merchant": s["merchant"],
              "amount_monthly": s.get("amount_monthly", 0.0),
              "baseline_drop": s.get("baseline_drop", 0.0),
              "ts": s.get("started_ts", time.time())}
             for s in self.db["subscriptions"]])

        self.conn.commit()

    def reset(self):
        # reload the seed persona and clear the dynamic rows
        self.db = json.loads(SEED_FILE.read_text())
        self.user_id = self.db["persona"]["user_id"]
        self.db["plant_state"]["last_event_ts"] = time.time()
        self.save()

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
        ps["last_event_ts"] = now
        self.save()

    # lookups

    def decision(self, decision_id: str):
        return next((d for d in self.db["decisions"]
                     if d["decision_id"] == decision_id), None)

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

    # counters are not their own table, we rebuild them from the max id seen
    def _derive_counters(self):
        base = dict(self._seed["counters"])

        def max_suffix(rows, key):
            m = 0
            for r in rows:
                tail = str(r.get(key, "")).rsplit("-", 1)[-1]
                if tail.isdigit():
                    m = max(m, int(tail))
            return m

        return {
            "decision": max(base.get("decision", 0),
                            max_suffix(self.db["decisions"], "decision_id")),
            "commitment": max(base.get("commitment", 0),
                              max_suffix(self.db["commitments"], "commitment_id")),
            "txn": max(base.get("txn", 0),
                       max_suffix(self.db["transactions"], "txn_id")),
        }
