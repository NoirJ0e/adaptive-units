import { useState, useEffect } from 'react'
import type { AdaptiveMode } from './types'

function getViewport(unit: string): number {
  return unit === 'vw' ? window.innerWidth : window.innerHeight
}

export function useAdaptScale(mode: AdaptiveMode | null): number {
  const [scale, setScale] = useState(() => {
    if (!mode || typeof window === 'undefined') return 1
    return getViewport(mode.unit) / mode.designBase
  })

  useEffect(() => {
    if (!mode) return
    const handler = () => {
      setScale(getViewport(mode.unit) / mode.designBase)
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [mode])

  return scale
}
