import type { Effects } from './types.ts'

export function PlantStats({
  vigor,
  maturity,
  before,
}: {
  vigor: number
  maturity: number
  before?: { vigor: number; maturity: number }
  effects?: Partial<Effects>
  pestsActive?: boolean
}) {
  return (
    <div className="stats">
      <Bar label="Vigor" value={vigor} prior={before?.vigor} tone="vigor" />
      <Bar label="Maturity" value={maturity} prior={before?.maturity} tone="maturity" />
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
