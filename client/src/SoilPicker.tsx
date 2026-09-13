import { useRef, useState, type FormEvent } from 'react'
import {
  DragDropProvider,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useDragOperation,
} from '@dnd-kit/react'
import { newNeed } from './model/needs.ts'
import type { Need } from './types.ts'

type ChipData = {
  label: string
  amount: number
}

function resetOverlay(el: HTMLElement) {
  for (const animation of el.getAnimations()) animation.cancel()
  el.style.opacity = ''
  el.style.transform = ''
  el.style.translate = ''
  el.style.scale = ''
}

function DropBucket() {
  return (
    <svg className="soil-bucket-icon" viewBox="0 0 100 100" aria-hidden>
      <path
        className="soil-bucket-handle"
        d="M22 38 C 38 8 72 8 82 30"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <circle cx="82" cy="30" r="3.4" fill="currentColor" />
      <path
        className="soil-bucket-body"
        d="M20 38 L30 92 H70 L80 38 Z"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlantPot({ size = 24 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-plant-pot"
      aria-hidden
    >
      <path d="M14 8.536V6a4 4 0 014-4h1.5a.5.5 0 01.5.5V4a4 4 0 01-4 4 4 4 0 00-4 4 5 5 0 01-8-4 5 5 0 018 4c0 2 1 3 1 5" />
      <path d="m18 17-1.085 3.58A2 2 0 0115 22H9.002a2 2 0 01-1.913-1.418L6 17" />
      <path d="M5 17h14" />
    </svg>
  )
}

function OverlayChip({ label, amount }: ChipData) {
  return (
    <div className="soil-overlay-item">
      <span className="soil-mini soil-overlay-pot" aria-hidden>
        <PlantPot size={26} />
      </span>
      {label} · ${amount}
    </div>
  )
}

function SoilChip({ need }: { need: Need }) {
  const { ref, handleRef, isDragSource } = useDraggable<ChipData>({
    id: need.id,
    type: 'need',
    data: { label: need.label, amount: need.amount },
  })

  return (
    <div
      ref={(node) => {
        ref(node)
        handleRef(node)
      }}
      className={isDragSource ? 'soil-chip is-ghost' : 'soil-chip'}
      tabIndex={0}
      role="button"
      aria-label={`Drag ${need.label}`}
    >
      <span className="grip soil-mini" aria-hidden>
        <PlantPot size={22} />
      </span>
      <span>
        {need.label} · ${need.amount}
      </span>
    </div>
  )
}

function SoilBucket({
  soil,
  caught,
  onUnplant,
}: {
  soil: Need[]
  caught: boolean
  onUnplant?: (id: string) => void
}) {
  const { ref, isDropTarget } = useDroppable({
    id: 'bucket',
    accept: 'need',
  })

  const cls = ['soil-drop']
  if (isDropTarget) cls.push('in-range')
  if (caught) cls.push('just-caught')

  return (
    <div ref={ref} className={cls.join(' ')}>
      <DropBucket />
      {soil.length === 0 ? (
        <p className="sr-only">Drop here</p>
      ) : (
        <ul className="soil-planted">
          {soil.map((need) => (
            <li key={need.id}>
              <span>
                {need.label} · ${need.amount}
              </span>
              <button type="button" className="text-btn" onClick={() => onUnplant?.(need.id)}>
                Undo
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SoilCompose({
  needs,
  onAdd,
  showList = true,
}: {
  needs: Need[]
  onAdd: (need: Need) => void
  showList?: boolean
}) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const field = useRef<HTMLInputElement>(null)
  const tray = needs.filter((n) => n.importance == null)

  function add(e: FormEvent) {
    e.preventDefault()
    const text = label.trim()
    const n = Number(amount)
    if (!text || !Number.isFinite(n) || n <= 0) return
    onAdd(newNeed({ label: text, amount: n, importance: null }))
    setLabel('')
    setAmount('')
    field.current?.focus()
  }

  return (
    <div className="soil-picker">
      <form className="soil-compose" onSubmit={add} onPointerDown={(e) => e.stopPropagation()}>
        <span className="soil-mini">
          <PlantPot size={28} />
        </span>
        <input
          ref={field}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Essential expense"
        />
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="$"
          className="soil-amt"
        />
        <button className="btn" type="submit">
          Add
        </button>
      </form>
      {showList && tray.length > 0 && (
        <div className="soil-tray">
          {tray.map((need) => (
            <div key={need.id} className="soil-chip">
              <span className="soil-mini" aria-hidden>
                <PlantPot size={22} />
              </span>
              <span>
                {need.label} · ${need.amount}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SoilBoard({
  needs,
  onAdd,
  onUnplant,
  caught,
  stage,
}: {
  needs: Need[]
  onAdd: (need: Need) => void
  onUnplant?: (id: string) => void
  caught: boolean
  stage: 'plant' | 'full'
}) {
  const { source } = useDragOperation()
  const tray = needs.filter((n) => n.importance == null)
  const soil = needs.filter((n) => n.importance === 'essential')

  return (
    <div className={source ? 'soil-picker dragging' : 'soil-picker'}>
      {stage === 'full' && <SoilCompose needs={needs} onAdd={onAdd} showList={false} />}
      {tray.length > 0 && (
        <div className="soil-tray">
          {tray.map((need) => (
            <SoilChip key={need.id} need={need} />
          ))}
        </div>
      )}
      <p className="drag-cue">↓ Drag</p>
      <SoilBucket soil={soil} caught={caught} onUnplant={onUnplant} />
    </div>
  )
}

export function SoilPicker({
  needs,
  onAdd,
  onPlant,
  onUnplant,
  stage = 'full',
}: {
  needs: Need[]
  onAdd: (need: Need) => void
  onPlant?: (id: string) => void
  onUnplant?: (id: string) => void
  stage?: 'compose' | 'plant' | 'full'
}) {
  const lastTarget = useRef<string | null>(null)
  const [caught, setCaught] = useState(false)
  const [overlayEpoch, setOverlayEpoch] = useState(0)
  const catchTimer = useRef<number>(0)
  const overlayTimer = useRef<number>(0)

  if (stage === 'compose') {
    return <SoilCompose needs={needs} onAdd={onAdd} />
  }

  return (
    <DragDropProvider
      sensors={[
        PointerSensor.configure({
          activationConstraints: () => undefined,
        }),
        KeyboardSensor,
      ]}
      onDragStart={() => {
        lastTarget.current = null
        const overlay = document.querySelector('.soil-overlay')
        if (overlay instanceof HTMLElement) resetOverlay(overlay)
      }}
      onDragOver={(event) => {
        lastTarget.current = event.operation.target?.id != null ? String(event.operation.target.id) : null
      }}
      onDragEnd={(event) => {
        if (event.canceled) {
          lastTarget.current = null
          return
        }
        const target = event.operation.target?.id != null ? String(event.operation.target.id) : null
        lastTarget.current = target
        if (target === 'bucket' && event.operation.source) {
          onPlant?.(String(event.operation.source.id))
          window.clearTimeout(catchTimer.current)
          setCaught(true)
          catchTimer.current = window.setTimeout(() => setCaught(false), 420)
        }
        window.clearTimeout(overlayTimer.current)
        overlayTimer.current = window.setTimeout(() => setOverlayEpoch((n) => n + 1), 400)
      }}
    >
      <SoilBoard
        needs={needs}
        onAdd={onAdd}
        onUnplant={onUnplant}
        caught={caught}
        stage={stage}
      />
      <DragOverlay
        key={overlayEpoch}
        className="soil-overlay"
        dropAnimation={async ({ feedbackElement, translate }) => {
          const el = feedbackElement as HTMLElement
          try {
            if (lastTarget.current === 'bucket') {
              const bucket = document.querySelector('.soil-drop')
              if (!bucket) return
              const from = el.getBoundingClientRect()
              const to = bucket.getBoundingClientRect()
              const dx = to.left + to.width / 2 - (from.left + from.width / 2)
              const dy = to.top + to.height * 0.58 - (from.top + from.height / 2)
              const animation = el.animate(
                [
                  {
                    transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(1)`,
                    opacity: 1,
                  },
                  {
                    transform: `translate3d(${translate.x + dx}px, ${translate.y + dy}px, 0) scale(0.18) rotate(16deg)`,
                    opacity: 0,
                  },
                ],
                { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
              )
              await animation.finished
              return
            }
            const animation = el.animate(
              [
                { transform: `translate3d(${translate.x}px, ${translate.y}px, 0)` },
                { transform: 'translate3d(0, 0, 0)' },
              ],
              { duration: 220, easing: 'ease' },
            )
            await animation.finished
          } finally {
            resetOverlay(el)
          }
        }}
      >
        {(source) => {
          const data = source.data as ChipData | undefined
          if (!data) return null
          return <OverlayChip label={data.label} amount={data.amount} />
        }}
      </DragOverlay>
    </DragDropProvider>
  )
}
