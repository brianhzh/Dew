import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { getState, parsePurchase, postPurchase, postCancel } from "../api"
import type { Effects, ParseResult, PurchaseFields, PurchaseResponse, RenderInput, StateResponse } from "../types"

type Bank = {
  state: StateResponse
  userName: string
  last: PurchaseResponse | null
  pending: ParseResult | null
  history: PurchaseResponse[]
  loading: boolean
  vigor: number
  maturity: number
  prevVigor: number
  prevMaturity: number
  pestsActive: boolean
  setPending: (p: ParseResult | null) => void
  parse: (text: string) => Promise<ParseResult>
  purchase: (fields: PurchaseFields) => Promise<PurchaseResponse>
  cancel: (merchant: string) => Promise<PurchaseResponse>
  refresh: () => Promise<void>
  setUserName: (name: string) => void
  configure: (input: { income_mo: number; savings: number; essentials: number }) => void
}

const Ctx = createContext<Bank | null>(null)

const IDLE: Effects = {
  frost: false,
  hail: false,
  lightning: false,
  shake: false,
  rain: false,
  falling_leaves: false,
  pests: false,
  drought: 0,
  wind: 0.08,
}

function clamp(n: number, min = 0): number {
  return Math.round(Math.min(100, Math.max(min, n)) * 10) / 10
}

export function currentRender(b: Pick<Bank, "vigor" | "maturity" | "pestsActive" | "last">): RenderInput {
  return {
    vigor: b.vigor,
    maturity: b.maturity,
    baseline: b.vigor,
    pestsActive: b.pestsActive,
    effects: b.last ? b.last.render.effects : IDLE,
  }
}

export function BankProvider({
  seed,
  userName = '',
  children,
}: {
  seed: StateResponse
  userName?: string
  children: ReactNode
}) {
  const [state, setState] = useState<StateResponse>(seed)
  const [last, setLast] = useState<PurchaseResponse | null>(null)
  const [pending, setPending] = useState<ParseResult | null>(null)
  const [history, setHistory] = useState<PurchaseResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [vigor, setVigor] = useState<number>(seed.render.vigor)
  const [maturity, setMaturity] = useState<number>(seed.render.maturity)
  const [prevVigor, setPrevVigor] = useState<number>(seed.render.vigor)
  const [prevMaturity, setPrevMaturity] = useState<number>(seed.render.maturity)
  const [pestsActive, setPestsActive] = useState<boolean>(seed.render.pestsActive)
  const [name, setName] = useState(userName)

  const api = useMemo<Bank>(
    () => ({
      state,
      userName: name,
      last,
      pending,
      history,
      loading,
      vigor,
      maturity,
      prevVigor,
      prevMaturity,
      pestsActive,
      setPending,
      parse: async (text) => {
        setLoading(true)
        try {
          const p = await parsePurchase(text)
          setPending(p)
          return p
        } finally {
          setLoading(false)
        }
      },
      purchase: async (fields) => {
        setLoading(true)
        try {
          const res = await postPurchase(fields)
          setPrevVigor(vigor)
          setPrevMaturity(maturity)
          setVigor(clamp(vigor + res.vigor_delta, -100))
          setMaturity(clamp(maturity + res.maturity_delta))
          if (fields.is_recurring) setPestsActive(true)
          setLast(res)
          setHistory((prev) => [res, ...prev])
          const next = await getState()
          setState(next)
          return res
        } finally {
          setLoading(false)
        }
      },
      cancel: async (merchant) => {
        setLoading(true)
        try {
          const res = await postCancel(merchant)
          setPrevVigor(vigor)
          setPrevMaturity(maturity)
          setVigor(clamp(vigor + res.vigor_delta, -100))
          setMaturity(clamp(maturity + res.maturity_delta))
          setPestsActive(false)
          setLast(res)
          setHistory((prev) => [res, ...prev])
          const next = await getState()
          setState(next)
          return res
        } finally {
          setLoading(false)
        }
      },
      refresh: async () => {
        const next = await getState()
        setState(next)
      },
      setUserName: (next) => {
        const clean = next.trim()
        localStorage.setItem('dew.name', clean)
        setName(clean)
      },
      configure: ({ income_mo, savings, essentials }) => {
        setState((prev) => ({
          ...prev,
          persona: {
            ...prev.persona,
            monthly_income: income_mo,
            liquid_buffer: savings,
            essentials_monthly: essentials,
          },
        }))
      },
    }),
    [state, name, last, pending, history, loading, vigor, maturity, prevVigor, prevMaturity, pestsActive],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useBank() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useBank")
  return ctx
}
