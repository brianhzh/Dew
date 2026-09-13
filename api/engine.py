"""vigor and effect model plus the maturity projection. pure functions."""
from __future__ import annotations

import json
from pathlib import Path

SHARED = Path(__file__).resolve().parent.parent / "shared"
C = json.loads((SHARED / "constants.json").read_text())

WPM = C["weeks_per_month"]  # 4.33


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


# --- market projection (montecarlo output) ---------------------------------

def _default_mc() -> dict:
    # smooth fallback curve so the api runs before the snowflake table is loaded.
    # cumulative return by month at rough annual rates, p10 flat, p50 mid, p90 high.
    rows = []
    for m in range(1, 49):
        yrs = m / 12
        rows.append({"m": m,
                     "p10": round(0.98 ** yrs - 1, 4),
                     "p50": round(1.085 ** yrs - 1, 4),
                     "p90": round(1.20 ** yrs - 1, 4)})
    return {"horizon_months": 48, "source": "built in fallback", "rows": rows}


def _load_mc() -> dict:
    f = SHARED / "mc_percentiles.json"
    try:
        return json.loads(f.read_text())
    except Exception:
        return _default_mc()


MC = _load_mc()
_MC_BY_M = {r["m"]: r for r in MC["rows"]}
_MC_MAX = max(_MC_BY_M) if _MC_BY_M else 48


def projection(months: int) -> dict:
    # p10 p50 p90 cumulative return over this many months
    m = int(clamp(months, 1, _MC_MAX))
    return _MC_BY_M.get(m, _MC_BY_M[_MC_MAX])


def projection_public(persona: dict) -> dict:
    p = projection(persona["horizon_months"])
    return {"p10": p["p10"], "p50": p["p50"], "p90": p["p90"],
            "horizon_months": persona["horizon_months"]}


# --- purchase assessment (vigor and effect) --------------------------------

def disc_room_m(persona: dict) -> float:
    # monthly money left after essentials and savings
    return max(persona["monthly_income"] - persona["essentials_monthly"]
               - persona["savings_target_monthly"], 1.0)


def severity(persona: dict, amount: float) -> float:
    impact = amount / disc_room_m(persona)
    buffer_hit = amount / max(persona["liquid_buffer"], 1.0)
    return max(impact, C["buffer_hit_weight"] * buffer_hit)  # eating the buffer counts double


def bucket_for(sev: float) -> str:
    return "small" if sev < C["buckets"]["big_min"] else "big"


def assess(persona: dict, amount: float,
           is_essential: bool, is_recurring: bool) -> dict:
    # one made purchase to a bucket plus deltas. never mutates.
    if is_essential:
        # essentials never get weather
        return {"bucket": "neutral", "direction": "neutral", "severity": 0.0,
                "vigor_delta": 0.0, "baseline_delta": 0.0}
    if is_recurring:
        # subscriptions bring aphids and lower the baseline
        drop = clamp(amount / disc_room_m(persona) * C["recurring"]["baseline_scale"],
                     C["recurring"]["baseline_min"], C["recurring"]["baseline_max"])
        return {"bucket": "recurring", "direction": "damaging",
                "severity": severity(persona, amount),
                "vigor_delta": 0.0, "baseline_delta": -drop}
    sev = severity(persona, amount)
    bucket = bucket_for(sev)
    vd = -clamp(sev * C["vigor"]["delta_scale"], C["vigor"]["delta_min"], C["vigor"]["delta_max"])
    return {"bucket": bucket, "direction": "damaging", "severity": sev,
            "vigor_delta": vd, "baseline_delta": 0.0}


# --- maturity (slow, projection grounded) ----------------------------------

def future_value_lost(amount: float, is_recurring: bool, p50: float) -> float:
    # the money plus the market growth it would have earned over the horizon.
    # a subscription loses a stretch of future payments, not just one.
    months = C["maturity"]["recurring_months"] if is_recurring else 1
    return amount * months * (1 + p50)


def maturity_setback(persona: dict, amount: float, is_recurring: bool,
                     long_goal: float, months: int | None = None) -> float:
    # a purchase sets the long trajectory back by its opportunity cost,
    # measured against the long goal so a big buy really shows.
    M = C["maturity"]
    p = projection(months if months is not None else persona["horizon_months"])
    fv_lost = future_value_lost(amount, is_recurring, p["p50"])
    pts = M["setback_scale"] * fv_lost / max(long_goal, 1.0) * 100
    return clamp(pts, 0.0, M["setback_cap"])


def cancel_maturity_gain(persona: dict, amount: float, long_goal: float,
                         months: int | None = None) -> float:
    # dropping a subscription frees future outlay, so the trajectory recovers a bit
    return maturity_setback(persona, amount, True, long_goal, months) \
        * C["maturity"]["cancel_recover_frac"]


def maturity_growth(days: float) -> float:
    # steady saving grows the plant a little each day
    return C["maturity"]["growth_per_day"] * max(days, 0.0)


# --- effects and copy ------------------------------------------------------

def effects_for(bucket: str) -> dict:
    e = dict(C["effects"][bucket])
    e.pop("_note", None)
    return e


def effect_name(bucket: str) -> str:
    return {"neutral": "none", "small": "cold_spell", "big": "hailstorm",
            "recurring": "aphids", "cancel": "aphids_leave"}.get(bucket, "none")


def bloom_setback_weeks(persona: dict, amount: float) -> int:
    return round(amount / max(persona["savings_target_monthly"], 1) * C["weeks_per_month"])


def concrete_unit(persona: dict, amount: float, bucket: str) -> str:
    # spoken in bloom timing, never dollars
    if bucket == "neutral":
        return ""
    weeks = bloom_setback_weeks(persona, amount)
    if weeks < 1:
        return "sets your next bloom back a few days"
    return f"sets your next bloom back about {weeks} week{'s' if weeks != 1 else ''}"


def drift_vigor(vigor: float, baseline: float, days: float) -> float:
    # vigor eases back toward baseline over time, no boost
    r = C["vigor"]["recovery_r_day"]
    return baseline - (baseline - vigor) * (1 - r) ** max(days, 0.0)
