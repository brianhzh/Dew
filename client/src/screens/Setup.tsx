import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBank } from '../bank/BankContext.tsx'
import { Carousel } from '../components/Carousel.tsx'
import { SoilPicker } from '../SoilPicker.tsx'
import type { Need } from '../types.ts'

function BooksIcon() {
  return (
    <svg className="carousel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  )
}

function PotIcon() {
  return (
    <svg className="carousel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 8.536V6a4 4 0 014-4h1.5a.5.5 0 01.5.5V4a4 4 0 01-4 4 4 4 0 00-4 4 5 5 0 01-8-4 5 5 0 018 4c0 2 1 3 1 5" />
      <path d="m18 17-1.085 3.58A2 2 0 0115 22H9.002a2 2 0 01-1.913-1.418L6 17" />
      <path d="M5 17h14" />
    </svg>
  )
}

function NameIcon() {
  return (
    <svg className="carousel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 21a8 8 0 00-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  )
}

export function Setup() {
  const { configure, setUserName, userName } = useBank()
  const nav = useNavigate()
  const [name, setName] = useState(userName)
  const [income, setIncome] = useState('')
  const [savings, setSavings] = useState('')
  const [needs, setNeeds] = useState<Need[]>([])
  const [slide, setSlide] = useState(0)
  const [phase, setPhase] = useState<'ask' | 'plant'>('ask')
  const incomeMo = Number(income)
  const cash = Number(savings)
  const nameReady = name.trim().length > 0
  const booksReady = Number.isFinite(incomeMo) && incomeMo > 0 && Number.isFinite(cash) && cash >= 0
  const hasExpenses = needs.some((n) => n.importance == null)
  const planted = needs.some((n) => n.importance === 'essential')

  function goSlide(next: number) {
    if (next >= 1 && !nameReady) return
    if (next >= 2 && !booksReady) return
    if (next >= 1) setUserName(name)
    setSlide(next)
  }

  return (
    <section className="setup">
      {phase === 'ask' ? (
        <div className="setup-ask">
          <Carousel
            baseWidth={360}
            autoplay={false}
            loop={false}
            round={false}
            swipe
            index={slide}
            onIndexChange={goSlide}
            items={[
              {
                id: 0,
                title: 'You',
                icon: <NameIcon />,
                content: (
                  <div className="books-ask" onPointerDown={(e) => e.stopPropagation()}>
                    <label>
                      What should we call you?
                      <input
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                      />
                    </label>
                    <button className="btn" type="button" disabled={!nameReady} onClick={() => goSlide(1)}>
                      Next
                    </button>
                  </div>
                ),
              },
              {
                id: 1,
                title: 'Your Plant',
                icon: <BooksIcon />,
                content: (
                  <div className="books-ask" onPointerDown={(e) => e.stopPropagation()}>
                    <label>
                      Income / month
                      <span className="money-field">
                        <span className="money-prefix" aria-hidden>
                          $
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={income}
                          onChange={(e) => setIncome(e.target.value)}
                          placeholder="What comes in"
                        />
                      </span>
                    </label>
                    <label>
                      Current savings
                      <span className="money-field">
                        <span className="money-prefix" aria-hidden>
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={savings}
                          onChange={(e) => setSavings(e.target.value)}
                          placeholder="What’s in the bank"
                        />
                      </span>
                    </label>
                    <button className="btn" type="button" disabled={!booksReady} onClick={() => goSlide(2)}>
                      Next
                    </button>
                  </div>
                ),
              },
              {
                id: 2,
                title: 'Essentials',
                icon: <PotIcon />,
                content: (
                  <div onPointerDown={(e) => e.stopPropagation()}>
                    <p className="hint">Add the bills you have to cover.</p>
                    <SoilPicker
                      stage="compose"
                      needs={needs}
                      onAdd={(need) => setNeeds((prev) => [...prev, need])}
                    />
                    <button
                      className="btn"
                      type="button"
                      disabled={!hasExpenses}
                      onClick={() => setPhase('plant')}
                    >
                      Plant these
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      ) : (
        <div className="setup-plant">
          <p className="kicker">Plant</p>
          <h1>Drop them in</h1>
          <p className="hint">Drag each essential into the bucket.</p>
          <SoilPicker
            stage="plant"
            needs={needs}
            onAdd={(need) => setNeeds((prev) => [...prev, need])}
            onPlant={(id) =>
              setNeeds((prev) => prev.map((n) => (n.id === id ? { ...n, importance: 'essential' } : n)))
            }
            onUnplant={(id) =>
              setNeeds((prev) => prev.map((n) => (n.id === id ? { ...n, importance: null } : n)))
            }
          />
          {planted && (
            <nav className="stack">
              <button
                className="btn"
                type="button"
                disabled={!booksReady}
                onClick={() => {
                  setUserName(name)
                  configure({
                    income_mo: incomeMo,
                    savings: cash,
                    essentials: needs
                      .filter((n) => n.importance === 'essential')
                      .reduce((sum, n) => sum + n.amount, 0),
                  })
                  nav('/home')
                }}
              >
                Continue
              </button>
            </nav>
          )}
        </div>
      )}
    </section>
  )
}
