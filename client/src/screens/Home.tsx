import { Link } from 'react-router-dom'
import constants from '../../../shared/constants.json'
import { useBank } from '../bank/BankContext.tsx'
import { PlantCanvas } from '../plant/PlantCanvas.tsx'
import { PlantStats } from '../PlantStats.tsx'

export function Home() {
  const { books } = useBank()
  const tree = books.plant
  const need = constants.model.warranted_after_clean
  const ready = books.clean_streak >= need
  return (
    <section>
      <header className="locked">
        <p className="kicker">Your books</p>
        <h1>{books.name}</h1>
        <dl className="profile">
          <div>
            <dt>Income / mo</dt>
            <dd>${books.income_mo.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Bank</dt>
            <dd>${books.cash.toLocaleString()}</dd>
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
        <p className="hint">
          {ready
            ? 'A small want will land softer. You earned it.'
            : `${need - books.clean_streak} more clean choice${need - books.clean_streak === 1 ? '' : 's'} until a small want lands softer.`}
        </p>
      </header>

      <div className="tree-slot">
        <PlantCanvas
          vigor={tree.vigor}
          maturity={tree.maturity}
          baseline={tree.baseline}
          pestsActive={books.pests.active}
          reserveWeeks={tree.reserve_weeks}
          effects={{ drought: books.drought, pests: books.pests.active }}
        />
      </div>
      <PlantStats
        vigor={tree.vigor}
        maturity={tree.maturity}
        effects={{ drought: books.drought, pests: books.pests.active }}
        pestsActive={books.pests.active}
      />

      <nav className="stack">
        <Link className="btn" to="/consider">
          Log a spend
        </Link>
        <Link className="btn ghost" to="/setup">
          Edit costs
        </Link>
        <Link className="btn ghost" to="/ledger">
          Ledger
        </Link>
      </nav>
    </section>
  )
}
