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

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function onPointerDown(e: PointerEvent) {
      start.current = { x: e.clientX, y: e.clientY }
      el!.setPointerCapture(e.pointerId)
    }

    function onPointerUp(e: PointerEvent) {
      if (!start.current) return
      const dx = e.clientX - start.current.x
      const dy = e.clientY - start.current.y
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      start.current = null

      if (absDx < TAP_THRESHOLD && absDy < TAP_THRESHOLD) {
        handlers.onTap?.()
        return
      }

      if (absDx > absDy) {
        if (absDx >= SWIPE_HORIZONTAL_THRESHOLD) {
          if (dx < 0) handlers.onSwipeLeft?.()
          else handlers.onSwipeRight?.()
        }
      } else {
        if (absDy >= SWIPE_VERTICAL_THRESHOLD) {
          if (dy < 0) handlers.onSwipeUp?.()
          else handlers.onSwipeDown?.()
        }
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', onPointerUp)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
    }
  }, [ref, handlers])
}
