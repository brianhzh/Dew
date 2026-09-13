import { Link } from 'react-router-dom'
import { useBank } from '../bank/BankContext.tsx'
import { PlantCanvas } from '../plant/PlantCanvas.tsx'
import { PlantStats } from '../PlantStats.tsx'

export function Home() {
  const bank = useBank()
  const { persona, projection } = bank.state
  // Home is the calm resting state — show the plant without replaying the
  // last purchase's weather effects (those belong on the Aftermath screen).
  const render = {
    vigor: bank.vigor,
    maturity: bank.maturity,
    baseline: bank.vigor,
    pestsActive: bank.pestsActive,
  }
  const greeting = bank.userName ? `Hi, ${bank.userName}` : 'Dew'

  return (
    <section className="home-shell">
      <header>
        <p className="kicker">Your money</p>
        <h1>{greeting}</h1>
        <dl className="profile">
          <div>
            <dt>Income / mo</dt>
            <dd>${persona.monthly_income.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Liquid buffer</dt>
            <dd>${persona.liquid_buffer.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Essential expenses</dt>
            <dd>${persona.essentials_monthly.toLocaleString()}</dd>
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
        pestsActive={render.pestsActive}
      />

      <nav className="stack">
        <Link className="btn" to="/log">
          Log a purchase
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
