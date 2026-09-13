import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

type Vine = {
  d: string
  width: number
  delay: number
  duration: number
  opacity?: number
  layer: 'back' | 'front'
}

const VINES: Vine[] = [
  {
    d: 'M198 8 C 199 52 197 88 198 128 C 199 168 197 198 198 228',
    width: 3.2,
    delay: 0,
    duration: 1.3,
    layer: 'back',
  },
  {
    d: 'M198 74 C 186 92 178 106 174 124',
    width: 2.6,
    delay: 0.4,
    duration: 0.65,
    layer: 'back',
  },
  {
    d: 'M62 712 C 80 640 48 578 84 518 C 112 468 68 424 128 378 C 152 352 136 328 150 318',
    width: 3.4,
    delay: 0.12,
    duration: 1.7,
    layer: 'back',
  },
  {
    d: 'M84 518 C 98 498 122 486 132 458',
    width: 2.5,
    delay: 0.72,
    duration: 0.7,
    layer: 'front',
  },
  {
    d: 'M208 712 C 222 638 186 572 214 508 C 236 458 192 418 218 372',
    width: 3.3,
    delay: 0.2,
    duration: 1.6,
    layer: 'back',
  },
  {
    d: 'M208 640 C 228 628 246 610 252 572 C 256 548 274 532 304 538',
    width: 2.8,
    delay: 0.55,
    duration: 1.05,
    layer: 'front',
  },
]

function VineLayer({ vines, grow }: { vines: Vine[]; grow: boolean }) {
  return (
    <svg className="intro-vines" viewBox="0 0 390 720" preserveAspectRatio="xMidYMid meet" aria-hidden>
      {vines.map((vine) => (
        <path
          key={vine.d}
          className={grow ? 'intro-vine is-growing' : 'intro-vine'}
          d={vine.d}
          fill="none"
          stroke="var(--vine)"
          strokeWidth={vine.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={vine.opacity ?? 1}
          style={{
            transitionDuration: `${vine.duration}s`,
            transitionDelay: `${vine.delay}s`,
          }}
        />
      ))}
    </svg>
  )
}

export function Intro({ onFinished }: { onFinished: () => void }) {
  const [grow, setGrow] = useState(false)

  useEffect(() => {
    const start = window.setTimeout(() => setGrow(true), 900)
    const done = window.setTimeout(onFinished, 5600)
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
      <motion.h1
        className="intro-word"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        Dew
      </motion.h1>
      <VineLayer vines={front} grow={grow} />
    </section>
  )
}
