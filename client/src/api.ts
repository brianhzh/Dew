import type { ParseResult, PurchaseFields, PurchaseResponse, StateResponse } from "./types"
import bigHeadphones from "../../shared/fixtures/big_headphones.json"
import smallCoffee from "../../shared/fixtures/small_coffee.json"
import smallImpulse from "../../shared/fixtures/small_impulse.json"
import essential from "../../shared/fixtures/essential.json"
import subscription from "../../shared/fixtures/subscription.json"
import cancel from "../../shared/fixtures/cancel.json"
import state from "../../shared/fixtures/state.json"

const OFFLINE = import.meta.env.VITE_OFFLINE !== "false"
const BASE = (import.meta.env.VITE_API_BASE as string) || "http://localhost:8000"
const USER_ID = "demo-1"

const fixtures = [bigHeadphones, smallImpulse, smallCoffee, essential, subscription, cancel]

const json = { "Content-Type": "application/json" }

export async function getState(): Promise<StateResponse> {
  if (OFFLINE) return state as unknown as StateResponse
  const r = await fetch(BASE + "/state")
  return (await r.json()) as StateResponse
}

export async function parsePurchase(text: string): Promise<ParseResult> {
  if (OFFLINE) return localParse(text)
  const r = await fetch(BASE + "/parse", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ user_id: USER_ID, text }),
  })
  return (await r.json()) as ParseResult
}

export async function postPurchase(f: PurchaseFields): Promise<PurchaseResponse> {
  if (OFFLINE) return offlinePurchase(f)
  const r = await fetch(BASE + "/purchase", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ user_id: USER_ID, ...f }),
  })
  return (await r.json()) as PurchaseResponse
}

export async function postCancel(merchant: string): Promise<PurchaseResponse> {
  if (OFFLINE) return cancel.response as unknown as PurchaseResponse
  const r = await fetch(BASE + "/cancel", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ user_id: USER_ID, merchant }),
  })
  return (await r.json()) as PurchaseResponse
}

export async function getNarrative(id: string): Promise<string> {
  if (OFFLINE) {
    const hit = fixtures.find((f) => f.response.decision_id === id)
    return hit?.narrative ?? ""
  }
  const r = await fetch(BASE + "/narrative/" + id)
  const raw = await r.text()
  return raw
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("")
    .trim()
}

function localParse(text: string): ParseResult {
  const m = text.match(/\$?\s?(\d+(?:\.\d+)?)/)
  const amount = m ? parseFloat(m[1]) : 0
  const is_recurring = /subscription|monthly|per month|membership|netflix|spotify|gym/i.test(text)
  const is_essential = /rent|grocer|transit|bus|tuition|phone bill|utilit|insurance/i.test(text)
  return {
    amount,
    category: guessCategory(text),
    merchant: parseMerchant(text),
    is_recurring,
    is_essential,
    review: amount <= 0,
    transcript: text,
  }
}

function guessCategory(text: string): string {
  const t = text.toLowerCase()
  if (/coffee|latte|cafe|espresso/.test(t)) return "coffee"
  if (/headphone|laptop|phone|charger|gadget|electronic/.test(t)) return "electronics"
  if (/grocer|food|snack|lunch|dinner|restaurant|meal/.test(t)) return "food"
  if (/rent|apartment|housing|utilit/.test(t)) return "housing"
  if (/netflix|spotify|subscription|membership/.test(t)) return "subscription"
  if (/bus|transit|uber|lyft|train|gas/.test(t)) return "transit"
  if (/clothes|shirt|shoes|jacket|apparel/.test(t)) return "clothing"
  return "other"
}

function parseMerchant(text: string): string {
  const m = text.match(/\b(?:at|from)\s+(.+)/i)
  if (!m) return ""
  const rest = m[1].split(/\s+(?:for|on|because|and|to|with|that|yesterday|today)\b/i)[0]
  return rest.split(/[.,;]/)[0].trim()
}

function offlinePurchase(f: PurchaseFields): PurchaseResponse {
  const fixture = f.is_essential
    ? essential
    : f.is_recurring
      ? subscription
      : f.amount >= 70
        ? bigHeadphones
        : f.amount >= 30
          ? smallImpulse
          : smallCoffee
  return fixture.response as unknown as PurchaseResponse
}
