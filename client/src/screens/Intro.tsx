import { useEffect, useState } from 'react'

type Vine = {
  d: string
  width: number
  delay: number
  duration: number
  layer: 'back' | 'front'
}

type Flower = {
  x: number
  y: number
  size: number
  delay: number
}

const GROW_AT = 0.9
// steady start, slows right down as the tip lands
const EASE = 'cubic-bezier(0.12, 0.6, 0.18, 1)'

// viewBox 390x720, Dew sits around y≈360. Order follows the sketch: 1 → 8.
const VINES: Vine[] = [
  // 1 — bottom left, rises to meet 2
  { d: 'M68 712 C 58 668 66 628 82 600 C 92 582 96 570 94 556', width: 3.2, delay: 0, duration: 1.15, layer: 'back' },
  // 2 — continues up from 1 to a flower beside Dew, with a tendril off to the right
  { d: 'M94 556 C 104 520 78 486 82 446 C 86 404 60 364 68 332', width: 3, delay: 0.55, duration: 1.4, layer: 'back' },
  { d: 'M96 500 C 108 478 130 448 152 406', width: 2, delay: 1.05, duration: 0.85, layer: 'front' },
  // 3 — top, hangs down toward the D
  { d: 'M239 6 C 234 52 248 102 228 152 C 215 186 200 218 187 252', width: 3.1, delay: 0.9, duration: 1.35, layer: 'back' },
  // 4 — splits off 3 and sweeps right, two flowers along it
  { d: 'M228 140 C 262 178 292 224 307 279 C 318 330 348 382 354 436', width: 2.9, delay: 1.35, duration: 1.55, layer: 'front' },
  // 5 — top left corner down to a flower above the D
  { d: 'M47 6 C 56 62 42 122 74 166 C 92 192 116 222 120 256', width: 3.2, delay: 1.7, duration: 1.4, layer: 'back' },
  // 6 — thin tendril off 5 drifting under the D
  { d: 'M94 186 C 122 198 152 224 182 262', width: 1.9, delay: 2.1, duration: 0.9, layer: 'front' },
  // 7 — bottom center, straight-ish climb to a flower under the e
  { d: 'M213 714 C 222 660 262 602 244 540 C 236 504 232 440 229 396', width: 3.1, delay: 2.4, duration: 1.45, layer: 'back' },
  // 8 — bottom right, curls in with two short buds
  { d: 'M374 697 C 360 660 320 640 300 600 C 282 566 268 540 270 522', width: 3.2, delay: 2.85, duration: 1.2, layer: 'back' },
  { d: 'M270 522 C 285 500 300 470 307 448', width: 2.1, delay: 3.6, duration: 0.6, layer: 'front' },
  { d: 'M270 522 C 262 506 256 490 255 476', width: 2, delay: 3.65, duration: 0.5, layer: 'front' },
]

// a flower opens just as its vine's tip settles
const endOf = (i: number, lead = 0.2) => VINES[i].delay + VINES[i].duration - lead

const FLOWERS: Flower[] = [
  { x: 68, y: 332, size: 1, delay: endOf(1) }, // end of 2
  { x: 152, y: 406, size: 0.7, delay: endOf(2) }, // 2 tendril
  { x: 307, y: 279, size: 0.85, delay: endOf(4, 0.85) }, // mid 4 (tip passes here early)
  { x: 354, y: 436, size: 1, delay: endOf(4) }, // end of 4
  { x: 120, y: 256, size: 1, delay: endOf(5) }, // end of 5
  { x: 229, y: 396, size: 0.95, delay: endOf(7) }, // end of 7
  { x: 307, y: 448, size: 0.8, delay: endOf(9) }, // 8 bud
  { x: 255, y: 476, size: 0.7, delay: endOf(10) }, // 8 bud
]

const LAST_VINE_END = Math.max(...VINES.map((v) => v.delay + v.duration))
const LAST_FLOWER = Math.max(...FLOWERS.map((f) => f.delay)) + 0.7
const FINISH_MS = Math.round((GROW_AT + LAST_FLOWER + 0.6) * 1000)

function VinePath({ vine, grow }: { vine: Vine; grow: boolean }) {
  const cls = grow ? 'intro-vine is-growing' : 'intro-vine'
  const timing = {
    transitionDuration: `${vine.duration}s`,
    transitionDelay: `${vine.delay}s`,
    transitionTimingFunction: EASE,
  }
  return (
    <>
      <path
        className={cls}
        d={vine.d}
        pathLength={1}
        fill="none"
        stroke="var(--vine)"
        strokeWidth={vine.width}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={timing}
      />
      {/* thin companion strand — gives the stringy, two-fibre look */}
      <path
        className={cls}
        d={vine.d}
        pathLength={1}
        fill="none"
        stroke="var(--vine)"
        strokeWidth={Math.max(0.8, vine.width * 0.45)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
        transform="translate(2.2 -1.4)"
        style={timing}
      />
    </>
  )
}

function Bloom({ flower, grow }: { flower: Flower; grow: boolean }) {
  const r = 6.4 * flower.size
  const petals = [0, 72, 144, 216, 288]
  return (
    <g
      className={grow ? 'intro-flower is-open' : 'intro-flower'}
      transform={`translate(${flower.x} ${flower.y})`}
      style={{ transitionDelay: `${flower.delay}s` }}
    >
      <g className="intro-flower-inner">
        {petals.map((deg) => (
          <ellipse
            key={deg}
            cx={0}
            cy={-r * 0.95}
            rx={r * 0.62}
            ry={r}
            fill="#fff"
            transform={`rotate(${deg})`}
          />
        ))}
        <circle r={r * 0.42} fill="var(--vine)" opacity={0.85} />
      </g>
    </g>
  )
}

function VineLayer({ vines, grow, flowers }: { vines: Vine[]; grow: boolean; flowers?: Flower[] }) {
  return (
    <svg className="intro-vines" viewBox="0 0 390 720" preserveAspectRatio="xMidYMid meet" aria-hidden>
      {vines.map((vine) => (
        <VinePath key={vine.d} vine={vine} grow={grow} />
      ))}
      {flowers?.map((f) => (
        <Bloom key={`${f.x}-${f.y}`} flower={f} grow={grow} />
      ))}
    </svg>
  )
}

export function Intro({ onFinished }: { onFinished: () => void }) {
  const [grow, setGrow] = useState(false)

  useEffect(() => {
    const start = window.setTimeout(() => setGrow(true), GROW_AT * 1000)
    // TEMP-DEBUG: ?hold keeps the intro on screen
    const hold = new URLSearchParams(window.location.search).has('hold')
    const done = hold ? 0 : window.setTimeout(onFinished, FINISH_MS)
    return () => {
      window.clearTimeout(start)
      window.clearTimeout(done)
    }
  }, [onFinished])

  const back = VINES.filter((v) => v.layer === 'back')
  const front = VINES.filter((v) => v.layer === 'front')

  return (
    <section className="intro" aria-label="Dew">
      <VineLayer vines={back} grow={grow} />
      <h1
        className={grow ? 'intro-word is-bold' : 'intro-word'}
        style={{ transitionDuration: `${LAST_VINE_END}s` }}
      >
        Dew
      </h1>
      <VineLayer vines={front} grow={grow} flowers={FLOWERS} />
    </section>
  )
}
