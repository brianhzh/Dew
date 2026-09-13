export type Importance = 'essential' | 'small_medium' | 'subscription' | 'large'

export type Need = {
  id: string
  label: string
  amount: number
  importance: Importance | null
}

export type Severity =
  | 'minor'
  | 'moderate'
  | 'major'
  | 'essential'
  | 'recurring'
  | 'skip'
  | 'cancel'
  | 'drought'

export type Effects = {
  frost: boolean
  hail: boolean
  lightning: boolean
  shake: boolean
  drought: number
  rain: boolean
  wind: number
  falling_leaves: boolean
  pests: boolean
}

export type PlantState = {
  vigor: number
  maturity: number
  baseline: number
  reserve_weeks: number
}

export type Layer1 = {
  decision_id: string
  mode: string
  phase: string
  severity: Severity
  effects: Effects
  plant_before: PlantState
  plant_after: PlantState
  plant_delta: {
    vigor_delta: number
    maturity_delta: number
    baseline_delta: number
  }
  pests: { active: boolean; kind?: string }
  reserve_weeks_before: number
  reserve_weeks_after: number
  reserve_material: boolean
  healthy: boolean
  healthy_score: number
  trophy_awarded: boolean
  healthy_saves_count: number
  goal_ref: { recommended_goal_id: string; reason_code: string }
  narrative_seed: {
    severity: string
    metaphor_key: string
    reserve_weeks_after: number
  }
  amount?: number
  category?: string
  label?: string
  importance?: Importance
  warranted?: boolean
  clean_streak?: number
  weeks_until_reserve_empty?: number
  required_discretionary_drop?: number
  drop_by_date?: string
}

export type Goal = {
  id: string
  horizon: 'short' | 'mid' | 'long'
  label: string
  target_amount: number
  current_amount: number
  pct_complete: number
  stage: number
  harvested: boolean
}

export type AppState = {
  persona: {
    name: string
    role: string
    income_mo: number
    savings: number
    age: number
    interests: string[]
    cost_of_living: string
    display_locked: true
  }
  plant_state: PlantState & {
    effects: { drought: number }
    pests: { active: boolean }
  }
  goals: Goal[]
  subscriptions: unknown[]
  trophies: unknown[]
  healthy_saves_count: number
  stage_label: string
}
