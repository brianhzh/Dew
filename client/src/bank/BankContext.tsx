import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { decide, startingReserve, type Books, type SpendInput } from '../model/plantModel.ts'
import { fixedBillsFrom } from '../model/needs.ts'
import type { AppState, Layer1, Need } from '../types.ts'

export type BankTxn = {
  id: string
  amount: number
  category: string
  cadence: 'once' | 'monthly'
  skipped: boolean
  warranted?: boolean
}

export type Profile = {
  name: string
  income_mo: number
  needs: Need[]
}

export type BankState = {
  setupDone: boolean
  name: string
  cash: number
  income_mo: number
  fixed_bills_mo: number
  needs: Need[]
  clean_streak: number
  plant: Books['plant']
  pests: Books['pests']
  drought: number
  healthy_saves_count: number
  txns: BankTxn[]
  last: Layer1 | null
  subscriptions: { id: string; amount: number; category: string }[]
  trophies: number
}

export type SetupInput = {
  name: string
  income_mo: number
  savings: number
  needs: Need[]
}

type BankApi = {
  books: BankState
  preview: (input: SpendInput) => Layer1
  commit: (input: SpendInput) => Layer1
  skip: (input: SpendInput) => Layer1
  configure: (input: SetupInput) => void
}

const Ctx = createContext<BankApi | null>(null)

export function seedBank(state: AppState): BankState {
  return {
    setupDone: false,
    name: state.persona.name,
    cash: state.persona.savings,
    income_mo: state.persona.income_mo,
    fixed_bills_mo: 0,
    needs: [],
    clean_streak: 0,
    plant: {
      vigor: state.plant_state.vigor,
      maturity: state.plant_state.maturity,
      baseline: state.plant_state.baseline,
      reserve_weeks: state.plant_state.reserve_weeks,
    },
    pests: { ...state.plant_state.pests },
    drought: state.plant_state.effects.drought,
    healthy_saves_count: state.healthy_saves_count,
    txns: [],
    last: null,
    subscriptions: [],
    trophies: state.trophies.length,
  }
}

function asBooks(b: BankState): Books {
  return {
    cash: b.cash,
    income_mo: b.income_mo,
    fixed_bills_mo: b.fixed_bills_mo,
    healthy_saves_count: b.healthy_saves_count,
    clean_streak: b.clean_streak,
    plant: b.plant,
    pests: b.pests,
    drought: b.drought,
  }
}

function applyRow(prev: BankState, row: Layer1, skipped: boolean): BankState {
  const debit = skipped ? 0 : row.amount ?? 0
  const recurring = row.importance === 'subscription' && !skipped
  return {
    ...prev,
    cash: Math.max(0, Math.round((prev.cash - debit) * 100) / 100),
    plant: { ...row.plant_after },
    pests: { ...row.pests },
    drought: row.effects.drought,
    healthy_saves_count: row.healthy_saves_count,
    clean_streak: row.clean_streak ?? prev.clean_streak,
    last: row,
    trophies: prev.trophies + (row.trophy_awarded ? 1 : 0),
    subscriptions: recurring
      ? [...prev.subscriptions, { id: row.decision_id, amount: debit, category: row.category ?? 'subscription' }]
      : prev.subscriptions,
    txns: [
      {
        id: row.decision_id,
        amount: row.amount ?? 0,
        category: row.label || row.category || 'other',
        cadence: recurring ? 'monthly' : 'once',
        skipped,
        warranted: row.warranted,
      },
      ...prev.txns,
    ],
  }
}

export function BankProvider({ seed, children }: { seed: AppState; children: ReactNode }) {
  const [books, setBooks] = useState(() => seedBank(seed))

  const api = useMemo<BankApi>(
    () => ({
      books,
      preview: (input) => decide(input, asBooks(books), 'preview'),
      commit: (input) => {
        const row = decide(input, asBooks(books), 'commit')
        setBooks((prev) => applyRow(prev, row, false))
        return row
      },
      skip: (input) => {
        const row = decide(input, asBooks(books), 'skip')
        setBooks((prev) => applyRow(prev, row, true))
        return row
      },
      configure: (input) => {
        const bills = fixedBillsFrom(input.needs)
        const reserve = startingReserve(input.savings, input.income_mo, bills)
        setBooks((prev) => ({
          ...prev,
          setupDone: true,
          name: input.name.trim() || 'You',
          income_mo: input.income_mo,
          cash: input.savings,
          fixed_bills_mo: bills,
          needs: input.needs,
          clean_streak: 0,
          last: null,
          txns: [],
          subscriptions: [],
          plant: {
            vigor: 100,
            maturity: 100,
            baseline: 100,
            reserve_weeks: reserve,
          },
          pests: { active: false },
          drought: 0,
        }))
      },
    }),
    [books],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useBank() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBank')
  return ctx
}
