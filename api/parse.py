"""turn a spoken purchase into structured fields.

wisprflow hands the frontend a transcript. this replaces the old fake bank auto
detection: it reads the amount, guesses the category, and flags recurring and
essential. deterministic and offline. cortex can slot in behind parse_purchase()
later for messier speech, same return shape.

the plant only cares about amount, is_essential, is_recurring. the users own words
win over the category guess, so an essential they name stays essential.
"""
import re

# essential categories a first year cannot skip. keyword to category.
ESSENTIAL = {
    "rent": "rent", "landlord": "rent",
    "groceries": "groceries", "grocery": "groceries", "supermarket": "groceries",
    "bus": "transit", "subway": "transit", "metro": "transit", "transit": "transit",
    "transport": "transit", "gas": "gas", "fuel": "gas",
    "phone bill": "phone", "utilities": "utilities", "electricity": "utilities",
    "water bill": "utilities", "hydro": "utilities",
    "tuition": "tuition", "textbook": "textbook",
    "pharmacy": "health", "medicine": "health", "prescription": "health",
    "insurance": "insurance",
}
# discretionary categories. keyword to category.
NON_ESSENTIAL = {
    "coffee": "coffee", "latte": "coffee", "espresso": "coffee",
    "headphones": "electronics", "earbuds": "electronics", "laptop": "electronics",
    "console": "electronics", "electronics": "electronics", "gadget": "electronics",
    "phone": "electronics", "tv": "electronics",
    "game": "games", "videogame": "games",
    "movie": "entertainment", "concert": "entertainment", "ticket": "entertainment",
    "clothes": "clothing", "shirt": "clothing", "shoes": "clothing", "jacket": "clothing",
    "restaurant": "dining", "dinner": "dining", "lunch": "dining", "takeout": "dining",
    "delivery": "dining", "snack": "dining", "bar": "dining", "drinks": "dining",
    "book": "books",
}
RECURRING = ["subscription", "subscribe", "membership", "monthly", "per month",
             "a month", "every month", "recurring", "/mo", "netflix", "spotify",
             "dashpass", "prime", "gym"]
ESSENTIAL_HINT = ["essential", "necessary", "needed it", "have to", " bill"]
NON_ESSENTIAL_HINT = ["treat", "splurge", "impulse", "for fun", "wanted"]


def _amount(text):
    m = re.search(r"\$\s?(\d+(?:\.\d{1,2})?)", text)
    if m:
        return float(m.group(1))
    m = re.search(r"(\d+(?:\.\d{1,2})?)\s?(?:dollars?|bucks?|usd)", text, re.I)
    if m:
        return float(m.group(1))
    m = re.search(r"\b(\d+(?:\.\d{1,2})?)\b", text)
    return float(m.group(1)) if m else 0.0


def _merchant(text):
    m = re.search(r"\b(?:at|from)\s+([A-Za-z][\w&'.\- ]{1,30}?)"
                  r"(?:\s+(?:for|on|and|,)\b|[.,]|$)", text, re.I)
    return m.group(1).strip().title() if m else ""


def _category(text_l):
    for kw, cat in ESSENTIAL.items():
        if kw in text_l:
            return cat, True
    for kw, cat in NON_ESSENTIAL.items():
        if kw in text_l:
            return cat, False
    return "other", False


def parse_purchase(text):
    t = text.lower()
    amount = _amount(text)
    category, cat_essential = _category(t)
    is_recurring = any(k in t for k in RECURRING)

    # the users own words win over the category guess
    if any(h in t for h in ESSENTIAL_HINT):
        is_essential = True
    elif any(h in t for h in NON_ESSENTIAL_HINT):
        is_essential = False
    else:
        is_essential = cat_essential

    if is_recurring and category == "other":
        category = "subscription"

    return {
        "amount": amount,
        "category": category,
        "merchant": _merchant(text),
        "is_recurring": is_recurring,
        "is_essential": is_essential,
        "review": amount <= 0 or category == "other",  # frontend should ask
        "transcript": text,
    }
