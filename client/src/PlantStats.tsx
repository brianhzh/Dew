import type { Effects } from './types.ts'

const labels: { key: keyof Effects; name: string }[] = [
  { key: 'frost', name: 'frost' },
  { key: 'hail', name: 'hail' },
  { key: 'lightning', name: 'lightning' },
  { key: 'shake', name: 'shake' },
  { key: 'rain', name: 'rain' },
  { key: 'falling_leaves', name: 'falling leaves' },
  { key: 'pests', name: 'pests' },
]

export function PlantStats({
  vigor,
  maturity,
  before,
  effects,
  pestsActive,
}: {
  vigor: number
  maturity: number
  before?: { vigor: number; maturity: number }
  effects?: Partial<Effects>
  pestsActive?: boolean
}) {
  const weather = labels.filter((l) => effects?.[l.key])
  if (pestsActive && !weather.some((w) => w.key === 'pests')) {
    weather.push({ key: 'pests', name: 'pests' })
  }
  const drought = effects?.drought ?? 0
  return (
    <div className="stats">
      <Bar label="Vigor" value={vigor} prior={before?.vigor} tone="vigor" />
      <Bar label="Maturity" value={maturity} prior={before?.maturity} tone="maturity" />
      <div className="chips">
        {weather.map((w) => (
          <span key={w.key} className="chip">
            {w.name}
          </span>
        ))}
        {drought > 0 && <span className="chip">drought {Math.round(drought * 100)}%</span>}
        {!weather.length && drought <= 0 && <span className="chip quiet">clear sky</span>}
      </div>
    </div>
  )
}

function Bar({
  label,
  value,
  prior,
  tone,
}: {
  label: string
  value: number
  prior?: number
  tone: 'vigor' | 'maturity'
}) {
  const delta = prior != null ? value - prior : null
  return (
    <div className={`stat ${tone}`}>
      <div className="stat-row">
        <span>{label}</span>
        <span>
          {prior != null && prior !== value ? `${prior} → ${value}` : value}
          {delta != null && delta !== 0 && (
            <small>
              {' '}
              ({delta > 0 ? '+' : ''}
              {delta})
            </small>
          )}
        </span>
      </div>
      <div className="bar" aria-hidden>
        {prior != null && prior !== value && (
          <i className="ghost" style={{ width: `${Math.max(0, Math.min(100, prior))}%` }} />
        )}
        <i className="fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}
