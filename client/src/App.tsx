import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getState } from './api.ts'
import { BankProvider, useBank } from './bank/BankContext.tsx'
import { BeigeGridBackground } from './components/BeigeGridBackground.tsx'
import { Aftermath } from './screens/Aftermath.tsx'
import { Consider } from './screens/Consider.tsx'
import { Home } from './screens/Home.tsx'
import { Intro } from './screens/Intro.tsx'
import { Ledger } from './screens/Ledger.tsx'
import { Preview } from './screens/Preview.tsx'
import { Setup } from './screens/Setup.tsx'
import { WhatIf } from './screens/WhatIf.tsx'
import type { AppState } from './types.ts'

export default function App() {
  const [state, setState] = useState<AppState | null>(null)
  const [introDone, setIntroDone] = useState(false)

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
    <BankProvider seed={state}>
      <BeigeGridBackground />
      <BrowserRouter>
        <div className="phone">
          <Gate>
            <Routes>
              <Route path="/" element={<Setup />} />
              <Route path="/setup" element={<Setup />} />
              <Route path="/home" element={<Home />} />
              <Route path="/consider" element={<Consider />} />
              <Route path="/consider/whatif" element={<WhatIf />} />
              <Route path="/preview" element={<Preview />} />
              <Route path="/preview/:id" element={<Preview />} />
              <Route path="/aftermath/:id" element={<Aftermath />} />
              <Route path="/ledger" element={<Ledger />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Gate>
        </div>
      </BrowserRouter>
    </BankProvider>
  )
}

function Gate({ children }: { children: ReactNode }) {
  const { books } = useBank()
  const loc = useLocation()
  if (!books.setupDone && loc.pathname !== '/' && loc.pathname !== '/setup') {
    return <Navigate to="/" replace />
  }
  return children
}
