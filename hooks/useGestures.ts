'use client'

import { useEffect, useRef } from 'react'

export interface GestureHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onTap?: () => void
}

const SWIPE_HORIZONTAL_THRESHOLD = 50
const SWIPE_VERTICAL_THRESHOLD = 80
const TAP_THRESHOLD = 10

export function useGestures(
  ref: React.RefObject<HTMLElement | null>,
  handlers: GestureHandlers
) {
  const start = useRef<{ x: number; y: number } | null>(null)

  // Callers pass a fresh object each render; a ref keeps the listeners stable.
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function onPointerDown(e: PointerEvent) {
      start.current = { x: e.clientX, y: e.clientY }
    }

    function onPointerUp(e: PointerEvent) {
      if (!start.current) return
      const dx = e.clientX - start.current.x
      const dy = e.clientY - start.current.y
      start.current = null

      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      const h = latest.current

      if (absDx < TAP_THRESHOLD && absDy < TAP_THRESHOLD) {
        h.onTap?.()
        return
      }

      if (absDx > absDy) {
        if (absDx < SWIPE_HORIZONTAL_THRESHOLD) return
        if (dx < 0) h.onSwipeLeft?.()
        else h.onSwipeRight?.()
        return
      }

      if (absDy < SWIPE_VERTICAL_THRESHOLD) return
      if (dy < 0) h.onSwipeUp?.()
      else h.onSwipeDown?.()
    }

    function onPointerCancel() {
      start.current = null
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerCancel)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [ref])
}
