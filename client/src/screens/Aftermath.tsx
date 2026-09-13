import { Link } from 'react-router-dom'
import { useBank } from '../bank/BankContext.tsx'
import { PlantCanvas } from '../plant/PlantCanvas.tsx'
import { PlantStats } from '../PlantStats.tsx'

export function Aftermath() {
  const { books } = useBank()
  const last = books.last
  if (!last) {
    return (
      <section>
        <p>No spend settled yet.</p>
        <Link className="btn ghost" to="/consider">
          Log a spend
        </Link>
      </section>
    )
  }

  return (
    <section>
      <p className="kicker">Aftermath</p>
      <h1>
        {last.healthy ? 'The tree eases' : last.warranted ? 'You earned this one' : 'The tree takes it'}
      </h1>
      <PlantCanvas
        vigor={last.plant_after.vigor}
        maturity={last.plant_after.maturity}
        baseline={last.plant_after.baseline}
        effects={last.effects}
        pestsActive={last.pests.active}
        reserveWeeks={last.reserve_weeks_after}
      />
      <PlantStats
        vigor={last.plant_after.vigor}
        maturity={last.plant_after.maturity}
        before={last.plant_before}
        effects={last.effects}
        pestsActive={last.pests.active}
      />
      <p className="line">
        {last.narrative_seed.metaphor_key} · reserve {last.reserve_weeks_after} weeks · cash $
        {books.cash.toLocaleString()}
      </p>
      {last.healthy && <p className="hint">healthy save · {last.healthy_saves_count} so far</p>}
      {last.warranted && <p className="hint">warranted treat · streak spent</p>}
      <nav className="stack">
        <Link className="btn" to="/home">
          Home
        </Link>
        <Link className="btn ghost" to="/ledger">
          Ledger
        </Link>
      </nav>
    </section>
  )
}
