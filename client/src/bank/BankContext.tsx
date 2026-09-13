import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { getState, parsePurchase, postPurchase, postCancel } from "../api"
import type { ParseResult, PurchaseFields, PurchaseResponse, RenderInput, StateResponse } from "../types"

type Bank = {
  state: StateResponse
  last: PurchaseResponse | null
  pending: ParseResult | null
  history: PurchaseResponse[]
  loading: boolean
  setPending: (p: ParseResult | null) => void
  parse: (text: string) => Promise<ParseResult>
  purchase: (fields: PurchaseFields) => Promise<PurchaseResponse>
  cancel: (merchant: string) => Promise<PurchaseResponse>
  refresh: () => Promise<void>
  configure: (input: { income_mo: number; savings: number; essentials: number }) => void
}

const Ctx = createContext<Bank | null>(null)

export function currentRender(b: { last: PurchaseResponse | null; state: StateResponse }): RenderInput {
  return b.last?.render ?? b.state.render
}

export function BankProvider({ seed, children }: { seed: StateResponse; children: ReactNode }) {
  const [state, setState] = useState<StateResponse>(seed)
  const [last, setLast] = useState<PurchaseResponse | null>(null)
  const [pending, setPending] = useState<ParseResult | null>(null)
  const [history, setHistory] = useState<PurchaseResponse[]>([])
  const [loading, setLoading] = useState(false)

  const api = useMemo<Bank>(
    () => ({
      state,
      last,
      pending,
      history,
      loading,
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
    [state, last, pending, history, loading],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useBank() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useBank")
  return ctx
}
