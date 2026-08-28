import { useEffect, useState } from 'react'

/**
 * Reveal disparado na montagem do componente (não por scroll, ao contrário de
 * useScrollReveal) — para o hero acima da dobra, que já está visível no load.
 */
export function useMountReveal(extraClassName = 'mount-reveal') {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(false)
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setReady(true))
    })
    return () => window.cancelAnimationFrame(id)
  }, [])

  return [extraClassName, ready ? 'is-ready' : ''].filter(Boolean).join(' ')
}
