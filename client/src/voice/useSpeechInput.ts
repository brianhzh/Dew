import { useCallback, useEffect, useRef, useState } from 'react'

// All the browser Web Speech API logic lives here, on purpose: it is kept apart
// from any screen so UI/visual changes cannot break voice recording. A screen
// (or a custom button) consumes this hook; nothing here touches styling.

// Minimal local types, deliberately NOT named SpeechRecognition* so they never
// clash with whatever the TS lib.dom version does or does not ship.
interface SRAlternative {
  transcript: string
}
interface SRResult {
  isFinal: boolean
  readonly length: number
  [index: number]: SRAlternative
}
interface SRResultList {
  readonly length: number
  [index: number]: SRResult
}
interface SRResultEvent {
  resultIndex: number
  results: SRResultList
}
interface SRErrorEvent {
  error?: string
}
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SRResultEvent) => void) | null
  onerror: ((e: SRErrorEvent) => void) | null
  onend: ((e: Event) => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionCtor = new () => Recognition

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type SpeechInput = {
  supported: boolean
  listening: boolean
  transcript: string
  error: string | null
  start: () => void
  stop: () => void
}

export function useSpeechInput(): SpeechInput {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<Recognition | null>(null)
  const supportedRef = useRef(getCtor() !== null)

  useEffect(() => {
    return () => {
      recRef.current?.abort()
      recRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) {
      setError('Voice input is not supported in this browser.')
      return
    }
    if (recRef.current) return

    const rec = new Ctor()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        const alt = res?.[0]
        if (!alt) continue
        if (res.isFinal) finalText += alt.transcript
        else interim += alt.transcript
      }
      setTranscript(`${finalText} ${interim}`.replace(/\s+/g, ' ').trim())
    }
    rec.onerror = (e) => {
      setError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Microphone permission was denied.'
          : 'Voice input stopped unexpectedly.',
      )
    }
    rec.onend = () => {
      setListening(false)
      recRef.current = null
    }

    setError(null)
    setTranscript('')
    recRef.current = rec
    setListening(true)
    try {
      rec.start()
    } catch {
      setListening(false)
      recRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    recRef.current?.stop()
  }, [])

  return { supported: supportedRef.current, listening, transcript, error, start, stop }
}
