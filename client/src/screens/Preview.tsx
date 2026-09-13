import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBank } from '../bank/BankContext.tsx'
import type { ParseResult } from '../types.ts'

export function Preview() {
  const bank = useBank()
  if (!bank.pending) {
    return (
      <section>
        <p className="kicker">Confirm</p>
        <h1>Nothing to confirm</h1>
        <p className="hint">Log a purchase first, then review it here.</p>
        <nav className="stack">
          <Link className="btn" to="/log">
            Log a purchase
          </Link>
        </nav>
      </section>
    )
  }
  return <ConfirmForm pending={bank.pending} />
}

function ConfirmForm({ pending }: { pending: ParseResult }) {
  const bank = useBank()
  const nav = useNavigate()
  const [amount, setAmount] = useState(pending.amount)
  const [category, setCategory] = useState(pending.category)
  const [merchant, setMerchant] = useState(pending.merchant)
  const [isEssential, setIsEssential] = useState(pending.is_essential)
  const [isRecurring, setIsRecurring] = useState(pending.is_recurring)

  async function logIt() {
    await bank.purchase({
      amount,
      category,
      merchant,
      is_recurring: isRecurring,
      is_essential: isEssential,
    })
    nav('/aftermath')
  }

  return (
    <section>
      <p className="kicker">Confirm</p>
      <h1>Review your purchase</h1>
      {pending.transcript && <p className="hint">"{pending.transcript}"</p>}
      <div className="panel stack">
        <label className="stack">
          <span>Amount</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          />
        </label>
        <label className="stack">
          <span>Category</span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label className="stack">
          <span>Merchant</span>
          <input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
        </label>
        <label>
          <input
            type="checkbox"
            checked={isEssential}
            onChange={(e) => setIsEssential(e.target.checked)}
          />{' '}
          Essential
        </label>
        <label>
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />{' '}
          Subscription
        </label>
      </div>
      <nav className="stack">
        <button className="btn" type="button" onClick={logIt} disabled={bank.loading}>
          Log it
        </button>
        <Link className="btn ghost" to="/log">
          Back
        </Link>
      </nav>
    </section>
  )
}
