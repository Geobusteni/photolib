'use client'

import { useEffect } from 'react'

type KeyMap = Partial<Record<string, (e: KeyboardEvent) => void>>

export function useKeyboard(map: KeyMap, active = true) {
  useEffect(() => {
    if (!active) return

    function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const fn = map[e.key]
      if (fn) {
        e.preventDefault()
        fn(e)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [map, active])
}
