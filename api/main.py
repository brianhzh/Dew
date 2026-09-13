"""thin api in front of the engine. post purchase only."""
import asyncio
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import client_view
import engine
import narrative
import parse
from store import Store

app = FastAPI(title="Dew API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

store = Store()


def r1(x):
    # numbers in a response land at one decimal
    return round(x + 1e-9, 1) if isinstance(x, float) else x


class PurchaseReq(BaseModel):
    user_id: str
    amount: float = 0.0
    category: str = ""
    merchant: str = ""
    is_recurring: bool = False
    is_essential: bool = False


class CancelReq(BaseModel):
    user_id: str
    merchant: str


class ParseReq(BaseModel):
    user_id: str = "demo-1"
    text: str


# response assembly

def snapshot() -> dict:
    ps = store.db["plant_state"]
    return {"vigor": ps["vigor"], "baseline": ps["baseline"], "maturity": ps["maturity"]}


def build_response(decision: dict, bucket: str, effect: str, direction: str,
                   before: dict, after: dict, md: float, concrete: str,
                   effects: dict, leaves_fall, flash_shake: bool,
                   projection: dict) -> dict:
    keys = ("storm", "wind", "rain", "cold", "pests_delta")
    return {
        "decision_id": decision["decision_id"],
        "severity_bucket": bucket,
        "effect": effect,
        "direction": direction,
        "vigor_before": r1(float(before["vigor"])),
        "vigor_after": r1(float(after["vigor"])),
        "vigor_delta": r1(float(after["vigor"] - before["vigor"])),
        "baseline": r1(float(after["baseline"])),
        "maturity_before": r1(float(before["maturity"])),
        "maturity_after": r1(float(after["maturity"])),
        "maturity_delta": r1(float(md)),
        "concrete_unit": concrete,
        "effects": {k: r1(effects.get(k, 0)) for k in keys},
        "leaves_fall": leaves_fall,
        "flash_shake": flash_shake,
        "projection": projection,
    }


# endpoints

@app.post("/parse")
def post_parse(req: ParseReq):
    # wisprflow transcript to purchase fields. the frontend confirms then posts /purchase.
    return parse.parse_purchase(req.text)


@app.post("/purchase")
def post_purchase(req: PurchaseReq):
    # a purchase was made. figure the effect and apply it.
    store.drift()
    p = store.db["persona"]
    ps = store.db["plant_state"]

    a = engine.assess(p, req.amount, req.is_essential, req.is_recurring)
    bucket = a["bucket"]
    # maturity setback is the market opportunity cost of the money. essentials none.
    if bucket == "neutral":
        md = 0.0
    else:
        md = -engine.maturity_setback(p, req.amount, req.is_recurring, store.long_goal_amount())
    before = snapshot()

    # apply to the plant
    ps["vigor"] = engine.clamp(ps["vigor"] + a["vigor_delta"], 0, 100)
    ps["baseline"] = engine.clamp(ps["baseline"] + a["baseline_delta"], 0, 100)
    ps["maturity"] = engine.clamp(ps["maturity"] + md, 0, 100)
    p["liquid_buffer"] -= req.amount

    d = {"decision_id": store.next_id("decision", "d"), "user_id": req.user_id,
         "ts": time.time(), "amount": req.amount, "category": req.category,
         "merchant": req.merchant, "is_recurring": req.is_recurring,
         "is_essential": req.is_essential, "severity_bucket": bucket,
         "severity": round(a["severity"], 4), "vigor_delta": a["vigor_delta"],
         "baseline_delta": a["baseline_delta"], "maturity_delta": md,
         "choice": "buy"}
    store.db["decisions"].append(d)

    store.db["transactions"].append({
        "txn_id": store.next_id("txn", "t"), "user_id": req.user_id, "ts": time.time(),
        "amount": req.amount, "category": req.category, "merchant": req.merchant,
        "is_recurring": req.is_recurring, "is_essential": req.is_essential,
        "source": "manual"})

    if req.is_recurring:
        # subscriptions bring aphids that stay
        merchant = req.merchant or req.category or "subscription"
        pests = engine.C["recurring"]["pests_per_subscription"]
        store.db["subscriptions"].append({
            "merchant": merchant, "amount_monthly": req.amount,
            "baseline_drop": -a["baseline_delta"], "started_ts": time.time()})
        ps["pests"].append({"merchant": merchant, "count": pests})

    ps["last_event_ts"] = time.time()
    store.save()

    effects = engine.effects_for(bucket)
    concrete = engine.concrete_unit(p, req.amount, bucket)
    leaves_fall = engine.C.get("leaves_fall", {}).get(bucket, 0)
    flash_shake = bucket in engine.C.get("flash_shake_buckets", [])
    resp = build_response(d, bucket, engine.effect_name(bucket), a["direction"],
                          before, snapshot(), md, concrete, effects,
                          leaves_fall, flash_shake, engine.projection_public(p))
    resp["render"] = client_view.render_block(
        bucket, ps["vigor"], ps["maturity"], ps["baseline"],
        effects.get("wind", 0.0), len(ps["pests"]) > 0)
    return resp


@app.post("/cancel")
def post_cancel(req: CancelReq):
    # drop a subscription and let the aphids go
    store.drift()
    sub = store.subscription(req.merchant)
    if sub is None:
        raise HTTPException(404, f"no active subscription for merchant {req.merchant!r}")
    ps = store.db["plant_state"]
    md = engine.cancel_maturity_gain(store.db["persona"], sub["amount_monthly"],
                                     store.long_goal_amount())
    before = snapshot()

    removed = sum(x["count"] for x in ps["pests"]
                  if x["merchant"].lower() == req.merchant.lower())
    ps["pests"] = [x for x in ps["pests"] if x["merchant"].lower() != req.merchant.lower()]
    ps["baseline"] = engine.clamp(ps["baseline"] + sub["baseline_drop"], 0, 100)
    ps["maturity"] = engine.clamp(ps["maturity"] + md, 0, 100)
    store.db["subscriptions"].remove(sub)

    # a decision row so the cancel line streams over the same endpoint
    d = {"decision_id": store.next_id("decision", "d"), "user_id": req.user_id,
         "ts": time.time(), "amount": sub["amount_monthly"], "category": "subscription",
         "merchant": sub["merchant"], "is_recurring": True, "is_essential": False,
         "severity_bucket": "cancel", "severity": 0.0, "vigor_delta": 0.0,
         "baseline_delta": sub["baseline_drop"], "maturity_delta": md,
         "choice": "cancelled"}
    store.db["decisions"].append(d)
    ps["last_event_ts"] = time.time()
    store.save()

    effects = engine.effects_for("cancel")
    effects["pests_delta"] = -removed  # actual aphids that left
    leaves_fall = engine.C.get("leaves_fall", {}).get("cancel", 0)
    flash_shake = "cancel" in engine.C.get("flash_shake_buckets", [])
    resp = build_response(d, "cancel", engine.effect_name("cancel"), "nourishing",
                          before, snapshot(), md, "", effects,
                          leaves_fall, flash_shake,
                          engine.projection_public(store.db["persona"]))
    resp["render"] = client_view.render_block(
        "cancel", ps["vigor"], ps["maturity"], ps["baseline"],
        effects.get("wind", 0.0), len(ps["pests"]) > 0)
    return resp


@app.get("/state")
def get_state():
    store.drift()
    ps = store.db["plant_state"]
    return {
        "persona": store.db["persona"],
        "goals": store.db["goals"],
        "plant": {"vigor": r1(float(ps["vigor"])), "baseline": r1(float(ps["baseline"])),
                  "maturity": r1(float(ps["maturity"])), "pests": ps["pests"],
                  "pest_count": sum(x["count"] for x in ps["pests"])},
        "subscriptions": store.db["subscriptions"],
        "projection": engine.projection_public(store.db["persona"]),
        "render": client_view.render_block(
            "neutral", ps["vigor"], ps["maturity"], ps["baseline"],
            0.08, sum(x["count"] for x in ps["pests"]) > 0),
    }


@app.get("/narrative/{decision_id}")
async def get_narrative(decision_id: str):
    d = store.decision(decision_id)
    if d is None:
        raise HTTPException(404, f"unknown decision_id {decision_id!r}")

    async def stream():
        chunks = await narrative.generate(d)
        if chunks:
            for c in chunks:
                yield f"data: {c}\n\n"
                await asyncio.sleep(0.25)
        yield "event: done\ndata:\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache"})


@app.post("/reset")
def post_reset():
    store.reset()
    return {"ok": True}


@app.get("/health")
def health():
    return {"ok": True}
