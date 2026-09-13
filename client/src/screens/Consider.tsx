import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import constants from '../../../shared/constants.json'
import { useBank } from '../bank/BankContext.tsx'
import { spendQuery } from '../spend.ts'
import type { Need } from '../types.ts'

export function Consider() {
  const nav = useNavigate()
  const { books } = useBank()
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const threshold = constants.model.warranted_after_clean
  const essentials = books.needs.filter((n) => n.importance === 'essential')

  function go(need: Need) {
    nav(
      `/preview?${spendQuery({
        amount: need.amount,
        category: need.label.toLowerCase(),
        label: need.label,
        importance: 'essential',
      })}`,
    )
  }

  function goCustom(e: FormEvent) {
    e.preventDefault()
    const text = label.trim()
    const n = Number(amount)
    if (!text || !Number.isFinite(n) || n <= 0) return
    nav(
      `/preview?${spendQuery({
        amount: n,
        category: text.toLowerCase(),
        label: text,
      })}`,
    )
  }

  return (
    <section>
      <p className="kicker">After purchase</p>
      <h1>What did you spend?</h1>
      <p className="hint">
        Clean streak {books.clean_streak}/{threshold}. After enough clean choices, a small want lands
        softer.
      </p>

      <form className="custom-spend" onSubmit={goCustom}>
        <label>
          What
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Coffee, headphones…"
          />
        </label>
        <label>
          Amount
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="$"
          />
        </label>
        <button className="btn" type="submit">
          See the tree
        </button>
      </form>

      {essentials.length > 0 && (
        <div className="bucket">
          <p className="kicker">Your essentials</p>
          <div className="stack tight">
            {essentials.map((need) => (
              <button key={need.id} className="btn" type="button" onClick={() => go(need)}>
                {need.label}
                <small>${need.amount}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="stack">
        <Link className="btn ghost" to="/setup">
          Edit costs
        </Link>
        <Link className="btn ghost" to="/consider/whatif">
          What-if · income stops
        </Link>
        <Link className="btn ghost" to="/home">
          Back
        </Link>
      </nav>
    </section>
  )
}
