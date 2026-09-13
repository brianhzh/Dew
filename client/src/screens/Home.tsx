import { Link } from 'react-router-dom'
import { useBank, currentRender } from '../bank/BankContext.tsx'
import { PlantCanvas } from '../plant/PlantCanvas.tsx'
import { PlantStats } from '../PlantStats.tsx'

export function Home() {
  const bank = useBank()
  const { persona, projection } = bank.state
  const render = currentRender(bank)

  return (
    <section>
      <header>
        <p className="kicker">Your money</p>
        <h1>Dew</h1>
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
        <p className="hint">
          Market outlook: {projection.p50.toFixed(2)}× over {projection.horizon_months} months
        </p>
      </header>

      <div className="tree-slot">
        <PlantCanvas {...render} />
      </div>
      <PlantStats
        vigor={render.vigor}
        maturity={render.maturity}
        effects={render.effects}
        pestsActive={render.pestsActive}
      />

      <nav className="stack">
        <Link className="btn" to="/log">
          Log a purchase
        </Link>
        <Link className="btn ghost" to="/ledger">
          Ledger
        </Link>
      </nav>
    </section>
  )
}
