import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBank } from '../bank/BankContext.tsx'
import { VoiceButton } from '../voice/VoiceButton'
import type { ParseResult } from '../types.ts'

export function Consider() {
  const nav = useNavigate()
  const { parse, setPending, loading } = useBank()
  const [text, setText] = useState('')
  const [essential, setEssential] = useState(false)
  const [subscription, setSubscription] = useState(false)

  async function onParse() {
    const t = text.trim()
    if (!t || loading) return
    await parse(t)
    nav('/confirm')
  }

  function onManual() {
    const t = text.trim()
    const m = t.match(/\$?\s?(\d+(?:\.\d+)?)/)
    const amount = m ? parseFloat(m[1]) : 0
    const pending: ParseResult = {
      amount,
      category: 'other',
      merchant: '',
      is_recurring: subscription,
      is_essential: essential,
      review: amount <= 0,
      transcript: t,
    }
    setPending(pending)
    nav('/confirm')
  }

  return (
    <section>
      <p className="kicker">New entry</p>
      <h1>Log a purchase</h1>

      <div className="stack">
        <textarea
          className="log-field"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Spent 250 on headphones at best buy…"
          rows={3}
        />
        {/* Voice input. Logic lives in src/voice/ — safe to restyle this button,
            just keep the <VoiceButton onResult={setText} /> wiring. */}
        <VoiceButton onResult={setText} />
        <button className="btn" type="button" onClick={onParse} disabled={loading || !text.trim()}>
          {loading ? 'Parsing…' : 'Parse'}
        </button>
      </div>

      <div className="chips">
        <label>
          <input
            type="checkbox"
            checked={essential}
            onChange={(e) => setEssential(e.target.checked)}
          />
          Essential
        </label>
        <label>
          <input
            type="checkbox"
            checked={subscription}
            onChange={(e) => setSubscription(e.target.checked)}
          />
          Subscription
        </label>
      </div>

      <nav className="stack">
        <button className="btn ghost" type="button" onClick={onManual}>
          Skip parsing, set the fields myself
        </button>
        <Link className="btn ghost" to="/home">
          Back
        </Link>
      </nav>
    </section>
  )
}
