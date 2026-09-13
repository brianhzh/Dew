"""voice transcript parser checks. run as python test_parse.py"""
import parse


def check(text, **expect):
    r = parse.parse_purchase(text)
    for k, v in expect.items():
        assert r[k] == v, f"{text!r}: {k} expected {v!r}, got {r[k]!r}  ({r})"


# a big discretionary buy with a merchant
check("I spent 250 on headphones at Best Buy",
      amount=250, category="electronics", merchant="Best Buy",
      is_essential=False, is_recurring=False)

# essentials the user named stay essential
check("paid 800 for rent", amount=800, category="rent", is_essential=True)
check("grabbed groceries for 60 bucks", amount=60, category="groceries", is_essential=True)
check("bus pass was 40 dollars", amount=40, category="transit", is_essential=True)

# small discretionary
check("$15 coffee this morning", amount=15, category="coffee", is_essential=False)

# a subscription is recurring and discretionary
check("signed up for a 23 dollar monthly netflix subscription",
      amount=23, is_recurring=True, is_essential=False)

# a recurring essential stays essential, so the plant treats it as neutral not aphids
check("my monthly phone bill is 40 dollars",
      amount=40, is_essential=True, is_recurring=True)

# phone the object is discretionary, phone bill is essential
check("bought a new phone for 900", amount=900, category="electronics", is_essential=False)

# an explicit word overrides the category guess
check("headphones but honestly it was a splurge for 250",
      is_essential=False, category="electronics")

# missing amount flags review
r = parse.parse_purchase("bought some stuff")
assert r["review"] is True, r

print("all parse cases pass")
