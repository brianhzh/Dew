import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useBank } from '../bank/BankContext.tsx'
import { PlantCanvas } from '../plant/PlantCanvas.tsx'
import { PlantStats } from '../PlantStats.tsx'
import { spendFromSearch } from '../spend.ts'

export function Preview() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const bank = useBank()
  const input = spendFromSearch(params)
  const row = bank.preview(input)
  const title = row.label || row.category

  return (
    <section>
      <p className="kicker">{row.warranted ? 'Preview · earned treat' : 'Preview'}</p>
      <h1>
        ${row.amount} {title}
      </h1>
      {row.warranted && (
        <p className="hint">Earned treat. Soft hit, rain instead of a storm. Streak will reset.</p>
      )}
      <PlantCanvas
        vigor={row.plant_after.vigor}
        maturity={row.plant_after.maturity}
        baseline={row.plant_after.baseline}
        effects={row.effects}
        pestsActive={row.pests.active}
        reserveWeeks={row.reserve_weeks_after}
      />
      <PlantStats
        vigor={row.plant_after.vigor}
        maturity={row.plant_after.maturity}
        before={row.plant_before}
        effects={row.effects}
        pestsActive={row.pests.active}
      />
      <p className="hint">
        Reserve {row.reserve_weeks_before} → {row.reserve_weeks_after} weeks · cash $
        {bank.books.cash.toLocaleString()} · streak {bank.books.clean_streak} → {row.clean_streak}
      </p>
      <nav className="stack">
        <button
          className="btn"
          type="button"
          onClick={() => {
            bank.commit(input)
            nav('/aftermath/commit')
          }}
        >
          {row.warranted ? 'Take the treat' : 'Buy anyway'}
        </button>
        {row.importance !== 'essential' && (
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              bank.skip(input)
              nav('/aftermath/skip')
            }}
          >
            Skip it
          </button>
        )}
        <Link className="btn ghost" to="/consider">
          Back
        </Link>
      </nav>
    </section>
  )
}
