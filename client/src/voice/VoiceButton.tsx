import { useEffect, useRef, type ReactNode } from 'react'
import { useSpeechInput } from './useSpeechInput'

type Props = {
  // called with the live transcript as the user speaks
  onResult: (text: string) => void
  className?: string
  children?: ReactNode
}

// A ready-made mic button. Person A can restyle it freely (pass className, or
// custom children for the label) — the recording logic is in useSpeechInput and
// is not affected by any visual change. If the browser has no speech support the
// button renders nothing, so typing into the textarea still works everywhere.
export function VoiceButton({ onResult, className, children }: Props) {
  const { supported, listening, transcript, error, start, stop } = useSpeechInput()
  const cb = useRef(onResult)
  cb.current = onResult

  useEffect(() => {
    if (transcript) cb.current(transcript)
  }, [transcript])

  if (!supported) return null

  return (
    <button
      type="button"
      className={className ?? 'btn ghost'}
      aria-pressed={listening}
      aria-label={listening ? 'Stop recording' : 'Record voice'}
      title={error ?? (listening ? 'Listening… tap to stop' : 'Record voice')}
      onClick={() => (listening ? stop() : start())}
    >
      {children ?? (listening ? '● Listening…' : '🎤 Record')}
    </button>
  )
}
