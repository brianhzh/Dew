import cancel from '../../shared/fixtures/cancel.json'
import essential from '../../shared/fixtures/essential.json'
import major from '../../shared/fixtures/major.json'
import minor from '../../shared/fixtures/minor.json'
import moderate from '../../shared/fixtures/moderate.json'
import recurring from '../../shared/fixtures/recurring.json'
import skip from '../../shared/fixtures/skip.json'
import state from '../../shared/fixtures/state.json'
import drought from '../../shared/fixtures/whatif-drought.json'
import type { AppState, Layer1 } from './types.ts'

const OFFLINE = import.meta.env.VITE_OFFLINE !== 'false'

const cases: Record<string, Layer1> = {
  minor: minor as Layer1,
  moderate: moderate as Layer1,
  major: major as Layer1,
  essential: essential as Layer1,
  recurring: recurring as Layer1,
  skip: skip as Layer1,
  cancel: cancel as Layer1,
  drought: drought as Layer1,
}

export async function getState(): Promise<AppState> {
  if (OFFLINE) return state as AppState
  const res = await fetch('/state')
  return res.json() as Promise<AppState>
}

export async function preview(id: keyof typeof cases): Promise<Layer1> {
  if (OFFLINE) return cases[id]
  const demo = cases[id]
  const res = await fetch('/decision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'preview',
      phase: 'after_purchase',
      amount: demo.amount,
      category: demo.category,
      flags: {
        essential: demo.severity === 'essential',
        recurring: demo.severity === 'recurring',
      },
    }),
  })
  return res.json() as Promise<Layer1>
}

export function narrativeLine(id: keyof typeof cases): string {
  const seed = cases[id].narrative_seed
  return `${seed.metaphor_key} · reserve ${seed.reserve_weeks_after} weeks`
}

export { OFFLINE, cases }
