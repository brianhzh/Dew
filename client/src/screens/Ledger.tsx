import { Link } from 'react-router-dom'
import constants from '../../../shared/constants.json'
import { useBank } from '../bank/BankContext.tsx'

export function Ledger() {
  const { books } = useBank()
  const need = constants.model.warranted_after_clean
  const essentials = books.needs.filter((n) => n.importance === 'essential')
  return (
    <section>
      <p className="kicker">Ledger</p>
      <h1>Fake bank</h1>
      <dl className="profile">
        <div>
          <dt>Cash</dt>
          <dd>${books.cash.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Income / mo</dt>
          <dd>${books.income_mo.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Essential Expenses</dt>
          <dd>${books.fixed_bills_mo.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Clean streak</dt>
          <dd>
            {books.clean_streak}/{need}
          </dd>
        </div>
      </dl>

      <div className="bucket">
        <p className="kicker">Essentials</p>
        <ul className="goals">
          {essentials.length === 0 && <li className="empty">None</li>}
          {essentials.map((n) => (
            <li key={n.id}>
              <strong>{n.label}</strong>
              <span>${n.amount}</span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="goals">
        {books.txns.length === 0 && <li>No charges yet</li>}
        {books.txns.map((t) => (
          <li key={t.id}>
            <strong>
              {t.skipped ? 'Skipped' : t.warranted ? 'Warranted' : 'Spent'} ${t.amount}
            </strong>
            <span>
              {t.category}
              {t.cadence === 'monthly' ? ' /mo' : ''}
            </span>
          </li>
        ))}
      </ul>
      <div className="panel">
        <p>Trophies: {books.trophies}</p>
        <p>Healthy saves: {books.healthy_saves_count}</p>
      </div>
      <Link className="btn ghost" to="/home">
        Home
      </Link>
    </section>
  )
}
