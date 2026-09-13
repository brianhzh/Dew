import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { getState } from './api.ts'
import { BankProvider } from './bank/BankContext.tsx'
import { BeigeGridBackground } from './components/BeigeGridBackground.tsx'
import { Aftermath } from './screens/Aftermath.tsx'
import { Consider } from './screens/Consider.tsx'
import { Home } from './screens/Home.tsx'
import { Intro } from './screens/Intro.tsx'
import { Ledger } from './screens/Ledger.tsx'
import { Preview } from './screens/Preview.tsx'
import { Setup } from './screens/Setup.tsx'
import type { StateResponse } from './types.ts'

export default function App() {
  const [state, setState] = useState<StateResponse | null>(null)
  const [introDone, setIntroDone] = useState(false)
  const [name] = useState<string>(() => localStorage.getItem('dew.name') ?? '')

  const finishIntro = useCallback(() => setIntroDone(true), [])

  useEffect(() => {
    void getState().then(setState)
  }, [])

  if (!introDone || !state) {
    return (
      <>
        <BeigeGridBackground />
        <div className="phone">
          <Intro onFinished={finishIntro} />
        </div>
      </>
    )
  }

  return (
    <BankProvider seed={state} userName={name}>
      <BeigeGridBackground />
      <BrowserRouter>
        <div className="phone">
          <Routes>
            <Route path="/" element={<Setup />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/home" element={<Home />} />
            <Route path="/log" element={<Consider />} />
            <Route path="/confirm" element={<Preview />} />
            <Route path="/aftermath" element={<Aftermath />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </BankProvider>
  )
}
