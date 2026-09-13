import type { Importance } from './types.ts'
import type { SpendInput } from './model/plantModel.ts'

export function spendFromSearch(params: URLSearchParams, fallback?: SpendInput): SpendInput {
  const amount = Number(params.get('amount'))
  if (Number.isFinite(amount) && amount > 0) {
    const importance = (params.get('importance') || '') as Importance
    const known: Importance[] = ['essential', 'small_medium', 'subscription', 'large']
    return {
      amount,
      category: params.get('category') || params.get('label') || 'other',
      label: params.get('label') || undefined,
      importance: known.includes(importance) ? importance : undefined,
      flags: {
        essential: importance === 'essential' || params.get('essential') === '1',
        recurring: importance === 'subscription' || params.get('recurring') === '1',
      },
    }
  }
  return fallback ?? { amount: 40, category: 'other', importance: 'small_medium' }
}

export function spendQuery(input: SpendInput) {
  const q = new URLSearchParams()
  q.set('amount', String(input.amount))
  q.set('category', input.category)
  if (input.label) q.set('label', input.label)
  if (input.importance) q.set('importance', input.importance)
  return q.toString()
}
