import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { preview } from '../api.ts'
import type { Layer1 } from '../types.ts'

export function WhatIf() {
  const [row, setRow] = useState<Layer1 | null>(null)
  useEffect(() => {
    void preview('drought').then(setRow)
  }, [])
  if (!row) return <p>Loading…</p>
  return (
    <section>
      <p className="kicker">What-if</p>
      <h1>Income stops</h1>
      <div className="panel">
        <p>Holds {row.weeks_until_reserve_empty} weeks.</p>
        <p>Drop discretionary to ${row.required_discretionary_drop} by {row.drop_by_date}.</p>
        <p className="hint">Ring-only ships even if this screen is cut.</p>
      </div>
      <Link className="btn ghost" to="/consider">
        Back
      </Link>
    </section>
  )
}
