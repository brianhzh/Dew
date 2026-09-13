import type { Importance, Need } from '../types.ts'

export const IMPORTANCE: { id: Importance; label: string; hint: string }[] = [
  { id: 'essential', label: 'Essential', hint: 'Have to. Rent, food, transit, phone, tuition.' },
  { id: 'small_medium', label: 'Small–medium', hint: 'Everyday wants. Can be warranted after a clean streak.' },
  { id: 'subscription', label: 'Subscription', hint: 'Monthly drain. Pests on the tree.' },
  { id: 'large', label: 'Large', hint: 'The regret buy. Resets the streak.' },
]

export function newNeed(partial: Omit<Need, 'id'>): Need {
  return { ...partial, id: `need-${Date.now()}-${Math.random().toString(16).slice(2)}` }
}

export function fixedBillsFrom(needs: Need[]) {
  return needs
    .filter((n) => n.importance === 'essential' || n.importance === 'subscription')
    .reduce((sum, n) => sum + n.amount, 0)
}

export function sampleNeeds(): Need[] {
  return [
    newNeed({ label: 'Rent', amount: 700, importance: null }),
    newNeed({ label: 'Groceries', amount: 180, importance: null }),
    newNeed({ label: 'Transit pass', amount: 50, importance: null }),
    newNeed({ label: 'Coffee run', amount: 15, importance: null }),
    newNeed({ label: 'Impulse drop', amount: 60, importance: null }),
    newNeed({ label: 'Campus streaming', amount: 23, importance: null }),
    newNeed({ label: 'Headphones', amount: 250, importance: null }),
  ]
}
