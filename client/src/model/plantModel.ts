import constants from '../../../shared/constants.json'
import type { Effects, Importance, Layer1, PlantState, Severity } from '../types.ts'

export type SpendFlags = {
  essential?: boolean
  recurring?: boolean
}

export type SpendInput = {
  amount: number
  category: string
  label?: string
  importance?: Importance
  flags?: SpendFlags
}

export type Books = {
  cash: number
  income_mo: number
  fixed_bills_mo: number
  healthy_saves_count: number
  clean_streak: number
  plant: PlantState
  pests: { active: boolean; kind?: string }
  drought: number
}

const essentials = new Set(constants.essentials)
const effectsBy = constants.severity_effects as Record<string, Effects>
const model = constants.model
const buckets = constants.buckets

export function weeklyDiscretionary(incomeMo: number, fixedBillsMo: number) {
  const disc = Math.max(1, incomeMo - fixedBillsMo)
  return disc / model.weeks_per_month
}

export function startingReserve(cash: number, incomeMo: number, fixedBillsMo: number) {
  const weeks = cash / weeklyDiscretionary(incomeMo, fixedBillsMo)
  return Math.max(2, Math.min(16, Math.round(weeks * 10) / 10))
}

export function importanceOf(input: SpendInput): Importance {
  if (input.importance) return input.importance
  if (input.flags?.essential || essentials.has(input.category)) return 'essential'
  if (input.flags?.recurring || input.category === 'subscription') return 'subscription'
  if (input.amount > buckets.moderate_max) return 'large'
  return 'small_medium'
}

export function severityOf(importance: Importance, amount: number, skip: boolean): Severity {
  if (skip) return 'skip'
  if (importance === 'essential') return 'essential'
  if (importance === 'subscription') return 'recurring'
  if (importance === 'large') return 'major'
  if (amount <= buckets.minor_max) return 'minor'
  return 'moderate'
}

export function isWarranted(importance: Importance, streak: number) {
  return importance === 'small_medium' && streak >= model.warranted_after_clean
}

/** First dollars sting more. 15→8, 60→16, 250→26 — matches the old fixtures. */
export function vigorHit(amount: number) {
  const raw = model.vigor_floor + (model.vigor_span * amount) / (amount + model.vigor_half)
  return Math.round(Math.min(40, Math.max(model.vigor_floor, raw)))
}

export function nextStreak(importance: Importance, mode: string, warranted: boolean, current: number) {
  if (mode === 'skip') return current + 1
  if (importance === 'essential') return current + 1
  if (warranted) return 0
  if (importance === 'large' || importance === 'subscription') return 0
  return current
}

export function decide(input: SpendInput, books: Books, mode: Layer1['mode'] = 'preview'): Layer1 {
  const amount = Math.max(0, Number(input.amount) || 0)
  const weekly = weeklyDiscretionary(books.income_mo, books.fixed_bills_mo)
  const before: PlantState = { ...books.plant }
  const skip = mode === 'skip'
  const importance = importanceOf({ ...input, amount })
  const warranted = !skip && isWarranted(importance, books.clean_streak)
  const severity: Severity = skip ? 'skip' : severityOf(importance, amount, false)
  const effects = { ...(warranted ? effectsBy.warranted : effectsBy[severity]) }

  let vigorDelta = 0
  let maturityDelta = 0
  let baselineDelta = 0
  let weeksLost = 0
  let pests = { ...books.pests }

  if (skip) {
    const would = decide(input, books, 'preview')
    weeksLost = -(would.reserve_weeks_before - would.reserve_weeks_after) * model.skip_reserve_restore
    vigorDelta = Math.min(model.skip_vigor_gain, 100 - before.vigor)
    pests = { active: false }
  } else if (importance === 'essential') {
    weeksLost = (amount / weekly) * model.essential_reserve_scale
  } else if (importance === 'subscription') {
    maturityDelta = -Math.min(
      28,
      Math.max(6, Math.round((amount * 12 * model.maturity_income_weight) / books.income_mo)),
    )
    baselineDelta = -Math.round(Math.abs(maturityDelta) * 0.55)
    weeksLost = (amount * model.recurring_months_prepaid) / weekly
    pests = { active: true, kind: 'aphids' }
  } else {
    const hit = vigorHit(amount)
    vigorDelta = -Math.max(2, Math.round(hit * (warranted ? model.warranted_vigor_scale : 1)))
    weeksLost = amount / weekly * (warranted ? model.warranted_vigor_scale : 1)
  }

  const after: PlantState = {
    vigor: clamp(before.vigor + vigorDelta),
    maturity: clamp(before.maturity + maturityDelta),
    baseline: clamp(before.baseline + baselineDelta),
    reserve_weeks: Math.max(0, round1(before.reserve_weeks - weeksLost)),
  }

  const metaphor = skip
    ? 'rain'
    : warranted
      ? 'treat'
      : importance === 'subscription'
        ? 'pests'
        : importance === 'essential'
          ? 'still'
          : importance === 'large'
            ? 'storm'
            : severity === 'moderate'
              ? 'cold_snap'
              : 'frost'

  const healthy = skip && importance !== 'essential'
  const saves = books.healthy_saves_count + (healthy ? 1 : 0)
  const streak = nextStreak(importance, mode, warranted, books.clean_streak)

  return {
    decision_id: `local-${mode}-${Date.now()}`,
    mode,
    phase: 'after_purchase',
    severity,
    effects,
    plant_before: before,
    plant_after: after,
    plant_delta: {
      vigor_delta: after.vigor - before.vigor,
      maturity_delta: after.maturity - before.maturity,
      baseline_delta: after.baseline - before.baseline,
    },
    pests,
    reserve_weeks_before: before.reserve_weeks,
    reserve_weeks_after: after.reserve_weeks,
    reserve_material: Math.abs(weeksLost) >= 0.5,
    healthy,
    healthy_score: healthy ? 1 : 0,
    trophy_awarded:
      healthy &&
      saves >= constants.healthy_saves_for_trophy &&
      saves % constants.healthy_saves_for_trophy === 0,
    healthy_saves_count: saves,
    goal_ref: {
      recommended_goal_id: importance === 'large' ? 'goal-mid' : 'goal-short',
      reason_code: importance === 'large' ? 'amount' : 'closest',
    },
    narrative_seed: {
      severity,
      metaphor_key: metaphor,
      reserve_weeks_after: after.reserve_weeks,
    },
    amount,
    category: input.category,
    label: input.label,
    importance,
    warranted,
    clean_streak: streak,
  }
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}
