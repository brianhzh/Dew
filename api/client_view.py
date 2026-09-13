"""map a backend result into what the client plant renderer consumes.

the renderer client/src/plant/plantEngine.ts takes an EngineInput:
  { vigor, maturity, baseline, effects: {frost, hail, lightning, shake, rain,
    falling_leaves, pests, drought, wind}, pestsActive }
our buckets translate to those boolean flags here, so one /purchase drives the
plant directly. the frontend just does plantEngine.apply(response.render).
"""


def effects_flags(bucket: str, wind: float) -> dict:
    f = {"frost": False, "hail": False, "lightning": False, "shake": False,
         "rain": False, "falling_leaves": False, "pests": False,
         "drought": 0, "wind": round(wind, 2)}
    if bucket == "small":            # cold spell
        f["frost"] = True
        f["falling_leaves"] = True
    elif bucket == "big":            # hailstorm
        f["hail"] = True
        f["lightning"] = True
        f["shake"] = True
        f["falling_leaves"] = True
    elif bucket == "recurring":      # aphids
        f["pests"] = True
    elif bucket == "cancel":         # aphids leave, gentle rain
        f["rain"] = True
    return f


def render_block(bucket: str, vigor: float, maturity: float, baseline: float,
                 wind: float, pests_active: bool) -> dict:
    return {"vigor": round(vigor, 1), "maturity": round(maturity, 1),
            "baseline": round(baseline, 1),
            "effects": effects_flags(bucket, wind),
            "pestsActive": pests_active}
