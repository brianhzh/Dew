import { Link } from 'react-router-dom'
import { useBank } from '../bank/BankContext.tsx'
import type { EffectName } from '../types.ts'

const effectLabels: Record<EffectName, string> = {
  none: 'Calm',
  cold_spell: 'Cold spell',
  hailstorm: 'Hailstorm',
  aphids: 'Aphids',
  aphids_leave: 'Aphids leave',
}

export function Ledger() {
  const { state, history, cancel } = useBank()
  const { persona, subscriptions } = state

  return (
    <section>
      <p className="kicker">Ledger</p>
      <h1>Your money</h1>
      <dl className="profile">
        <div>
          <dt>Income / mo</dt>
          <dd>${persona.monthly_income.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Liquid buffer</dt>
          <dd>${persona.liquid_buffer.toLocaleString()}</dd>
        </div>
      </dl>

      <div className="stack">
        <p className="kicker">Subscriptions</p>
        <ul className="goals">
          {subscriptions.length === 0 && <li>No subscriptions</li>}
          {subscriptions.map((s) => (
            <li key={s.merchant}>
              <strong>{s.merchant}</strong>
              <span>${s.amount_monthly.toLocaleString()} /mo</span>
              <button className="btn ghost" onClick={() => cancel(s.merchant)}>
                Cancel
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="stack">
        <p className="kicker">Recent</p>
        <ul className="goals">
          {history.length === 0 && <li>No charges yet</li>}
          {history.map((h, i) => (
            <li key={`${h.decision_id}-${i}`}>
              <strong>{h.concrete_unit}</strong>
              <span>
                {h.severity_bucket} · {effectLabels[h.effect]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Link className="btn ghost" to="/home">
        Home
      </Link>
    </section>
  )
}
