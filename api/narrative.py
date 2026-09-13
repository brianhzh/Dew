"""fallback narrative lines, plus the seam where cortex plugs in later."""
import zlib

# each line is a list of sse chunks that concatenate as is.
# a continuation chunk starts with a leading space.
BANK = {
    "cold": [
        ["A cold snap creeps over your leaves.", " You hunch against it and wait for warmer light."],
        ["Frost rimes your youngest shoots.", " You shiver, hold your ground, and keep your roots deep."],
    ],
    "hail": [
        ["Hail hammers down and tears at your leaves.", " You stand bent and battered, and healing will take its time."],
        ["A dark storm splits the sky and beats you low.", " You will rise again, but not by morning."],
    ],
    "pest": [
        ["A colony of aphids settles beneath your leaves.", " Barely felt now, but they will sap you a little more each day."],
        ["Something small moves in under your foliage.", " It has no plans to leave on its own."],
    ],
    "cancel": [
        ["The last aphid is brushed from your stem.", " Your sap runs clean and easy again."],
        ["The clinging pests loosen and drop away.", " You breathe easier, lighter than you were."],
    ],
}

# bucket to bank key. neutral gets no line.
BUCKET_TO_BANK = {"small": "cold", "big": "hail", "recurring": "pest", "cancel": "cancel"}


def chunks_for(decision: dict):
    # pick a fallback line for a decision. essentials get no line.
    bucket = decision.get("severity_bucket")
    if bucket == "neutral":
        return None
    key = BUCKET_TO_BANK.get(bucket)
    if key is None:
        return None
    lines = BANK[key]
    pick = zlib.crc32(decision["decision_id"].encode()) % len(lines)  # stable per decision
    return lines[pick]


async def generate(decision: dict):
    # cortex will slot in here behind a timeout, falling back to chunks_for
    return chunks_for(decision)
