import { useEffect, useRef } from 'react'
import type { Effects } from '../types.ts'
import { PlantEngine } from './plantEngine.ts'

type Props = {
  vigor: number
  maturity: number
  baseline: number
  effects?: Partial<Effects>
  pestsActive?: boolean
  seed?: number
  reserveWeeks?: number
}

export function PlantCanvas({
  vigor,
  maturity,
  baseline,
  effects = {},
  pestsActive = false,
  seed = 1337,
  reserveWeeks,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<PlantEngine | null>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const engine = new PlantEngine(ctx, {
      seed,
      height: 280,
      scaleCap: 1,
    })
    engineRef.current = engine
    const layout = () => {
      const w = cv.clientWidth || 360
      engine.resize(w, 280, Math.max(1, window.devicePixelRatio || 1))
    }
    layout()
    engine.apply({
      vigor,
      maturity,
      baseline,
      effects,
      pestsActive,
    })
    engine.start()
    window.addEventListener('resize', layout)
    return () => {
      window.removeEventListener('resize', layout)
      engine.stop()
      engineRef.current = null
    }
  }, [seed])

  const effectKey = JSON.stringify(effects)
  useEffect(() => {
    engineRef.current?.apply({
      vigor,
      maturity,
      baseline,
      effects,
      pestsActive,
    })
  }, [vigor, maturity, baseline, pestsActive, effectKey, effects])

  return (
    <div className="canvas-wrap">
      <canvas ref={ref} className="tree-canvas" />
      {reserveWeeks != null && (
        <p className="ring">{reserveWeeks} weeks of reserve</p>
      )}
    </div>
  )
}
