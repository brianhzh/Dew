import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBank } from '../bank/BankContext.tsx'
import { getNarrative } from '../api'
import { PlantCanvas } from '../plant/PlantCanvas.tsx'
import { PlantStats } from '../PlantStats.tsx'
import type { EffectName } from '../types'

const effectLabels: Record<EffectName, string> = {
  none: 'Clear skies',
  cold_spell: 'Cold spell',
  hailstorm: 'Hailstorm',
  aphids: 'Aphids',
  aphids_leave: 'Aphids leave',
}

export function Aftermath() {
  const { last } = useBank()
  const [narrative, setNarrative] = useState('')

  useEffect(() => {
    if (!last) return
    let live = true
    getNarrative(last.decision_id).then((n) => {
      if (live) setNarrative(n)
    })
    return () => {
      live = false
    }
  }, [last])

  if (!last) {
    return (
      <section>
        <p>No purchase logged yet.</p>
        <Link className="btn ghost" to="/log">
          Log a purchase
        </Link>
      </section>
    )
  }

  return (
    <section>
      <p className="kicker">Aftermath</p>
      <h1>{effectLabels[last.effect]}</h1>
      <PlantCanvas {...last.render} />
      <PlantStats
        vigor={last.vigor_after}
        maturity={last.maturity_after}
        before={{ vigor: last.vigor_before, maturity: last.maturity_before }}
        effects={last.render.effects}
        pestsActive={last.render.pestsActive}
      />
      <p className="hint">{last.concrete_unit}</p>
      {narrative && <p className="hint">{narrative}</p>}
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
