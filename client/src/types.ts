export type Effects = { frost: boolean; hail: boolean; lightning: boolean; shake: boolean; rain: boolean; falling_leaves: boolean; pests: boolean; drought: number; wind: number }
export type RenderInput = { vigor: number; maturity: number; baseline: number; pestsActive: boolean; effects: Effects }
export type Projection = { p10: number; p50: number; p90: number; horizon_months: number }
export type PurchaseFields = { amount: number; category: string; merchant: string; is_recurring: boolean; is_essential: boolean }
export type ParseResult = PurchaseFields & { review: boolean; transcript: string }
export type Bucket = "neutral" | "small" | "big" | "recurring" | "cancel"
export type EffectName = "none" | "cold_spell" | "hailstorm" | "aphids" | "aphids_leave"
export type PurchaseResponse = { decision_id: string; severity_bucket: Bucket; effect: EffectName; direction: "damaging"|"nourishing"|"neutral"; vigor_before: number; vigor_after: number; vigor_delta: number; baseline: number; maturity_before: number; maturity_after: number; maturity_delta: number; concrete_unit: string; effects: { storm: number; wind: number; rain: number; cold: number; pests_delta: number }; leaves_fall: number; flash_shake: boolean; projection: Projection; render: RenderInput }
export type Persona = { user_id: string; monthly_income: number; essentials_monthly: number; savings_target_monthly: number; liquid_buffer: number; horizon_months: number }
export type Goal = { goal_id: string; term: "short"|"mid"|"long"; name: string; amount: number; progress: number }
export type Subscription = { merchant: string; amount_monthly: number; baseline_drop: number; started_ts: number }
export type StateResponse = { persona: Persona; goals: Goal[]; plant: { vigor: number; baseline: number; maturity: number; pests: { merchant: string; count: number }[]; pest_count: number }; subscriptions: Subscription[]; projection: Projection; render: RenderInput }
// keep these two ONLY for the cosmetic onboarding (Setup/SoilPicker/needs.ts):
export type Importance = "essential" | "small_medium" | "subscription" | "large"
export type Need = { id: string; label: string; amount: number; importance: Importance | null }
