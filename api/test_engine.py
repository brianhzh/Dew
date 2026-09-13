"""engine cross check. expected values worked out by hand against the seed persona."""
import json
from pathlib import Path

import engine

P = json.loads((Path(__file__).resolve().parent.parent / "shared" / "seed.json")
               .read_text())["persona"]


def close(got, want, tol=0.01):
    assert abs(got - want) <= tol, f"expected {want}, got {got}"


# disc room 200, income minus essentials minus savings
close(engine.disc_room_m(P), 200)

# small, a $15 coffee
a = engine.assess(P, 15, False, False)
assert a["bucket"] == "small", a
close(a["severity"], 0.075, 1e-9)
close(a["vigor_delta"], -3.375, 1e-9)

# small, a $60 impulse buy. same bucket, more damage
a = engine.assess(P, 60, False, False)
assert a["bucket"] == "small", a
close(a["vigor_delta"], -13.5, 1e-9)

# big, the $250 headphones. damage hits the cap
a = engine.assess(P, 250, False, False)
assert a["bucket"] == "big", a
close(a["severity"], 1.25, 1e-9)
close(a["vigor_delta"], -30)  # clamped
assert engine.concrete_unit(P, 250, "big") == "sets your next bloom back about 7 weeks"

# essential, $750 rent, no weather ever
a = engine.assess(P, 750, True, False)
assert a["bucket"] == "neutral" and a["vigor_delta"] == 0, a

# recurring, a $23 a month membership. aphids and a lower baseline
a = engine.assess(P, 23, False, True)
assert a["bucket"] == "recurring", a
close(a["baseline_delta"], -4.6, 1e-9)
assert a["vigor_delta"] == 0

# effect tables. a small purchase gets cold, never a storm
assert engine.effects_for("neutral") == {"storm": 0, "wind": 0, "rain": 0,
                                          "cold": 0, "pests_delta": 0}
assert engine.effects_for("small")["cold"] == 1.0
assert engine.effects_for("small")["storm"] == 0
assert engine.effects_for("big")["storm"] == 1.0

# maturity from the market projection. robust to the real table replacing the canned one.
pr = engine.projection(48)
assert pr["p10"] <= pr["p50"] <= pr["p90"], pr        # percentiles are ordered
LONG = 5000
big_set = engine.maturity_setback(P, 250, False, LONG)
small_set = engine.maturity_setback(P, 15, False, LONG)
assert big_set > small_set > 0, (big_set, small_set)  # a bigger buy is a bigger setback
assert big_set >= 3, big_set                          # a $250 buy really moves it, not 1.0
assert engine.maturity_setback(P, 23, True, LONG) > small_set  # a sub drags for months
assert engine.maturity_setback(P, 250, False, LONG) <= engine.C["maturity"]["setback_cap"]
assert engine.maturity_growth(30) > 0                 # steady saving grows the plant over time

print("all engine cross check cases pass")
