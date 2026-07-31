// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEffect, useRef } from 'react'

export interface GestureHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onTap?: () => void
  onDoubleTap?: (point: { x: number; y: number }) => void
  onPinchStart?: () => void
  onPinchMove?: (info: { scaleRatio: number; centerX: number; centerY: number }) => void
  onPinchEnd?: () => void
  onPanMove?: (info: { dx: number; dy: number }) => void
  onPanEnd?: () => void
}

export interface GestureOptions {
  /** Swipe-to-navigate and tap-to-toggle only make sense at 1x; a single
   * finger pans the image instead once zoomed in. */
  zoomed: boolean
}

const SWIPE_HORIZONTAL_THRESHOLD = 50
const SWIPE_VERTICAL_THRESHOLD = 80
const TAP_THRESHOLD = 10
const DOUBLE_TAP_WINDOW_MS = 300
const DOUBLE_TAP_DISTANCE = 30

type Point = { x: number; y: number }
type Phase = 'idle' | 'tracking' | 'panning' | 'pinching'

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function useGestures(
  ref: React.RefObject<HTMLElement | null>,
  handlers: GestureHandlers,
  options: GestureOptions = { zoomed: false }
) {
  // Callers pass fresh objects each render; refs keep the listeners stable.
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })
  const zoomedRef = useRef(options.zoomed)
  useEffect(() => {
    zoomedRef.current = options.zoomed
  })

  // Every active pointer's last known position, keyed by pointerId — this is
  // what lets a second touch start a pinch instead of corrupting the first
  // pointer's swipe/tap delta (the bug that made concurrent touches flaky).
  const pointers = useRef(new Map<number, Point>())
  const phase = useRef<Phase>('idle')
  const trackId = useRef<number | null>(null)
  const trackStart = useRef<Point | null>(null)
  const panLast = useRef<Point | null>(null)
  const pinchIds = useRef<[number, number] | null>(null)
  const pinchStartDistance = useRef(1)
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function classifyTap(x: number, y: number) {
      const now = Date.now()
      const last = lastTap.current
      if (last && now - last.time < DOUBLE_TAP_WINDOW_MS && dist(last, { x, y }) < DOUBLE_TAP_DISTANCE) {
        if (tapTimer.current) clearTimeout(tapTimer.current)
        tapTimer.current = null
        lastTap.current = null
        latest.current.onDoubleTap?.({ x, y })
        return
      }
      lastTap.current = { time: now, x, y }
      if (tapTimer.current) clearTimeout(tapTimer.current)
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null
        latest.current.onTap?.()
      }, DOUBLE_TAP_WINDOW_MS)
    }

    function beginPinch() {
      const ids = Array.from(pointers.current.keys())
      const [a, b] = [ids[0], ids[1]]
      const pa = pointers.current.get(a)
      const pb = pointers.current.get(b)
      if (!pa || !pb) return
      phase.current = 'pinching'
      pinchIds.current = [a, b]
      pinchStartDistance.current = dist(pa, pb) || 1
      latest.current.onPinchStart?.()
    }

    function onPointerDown(e: PointerEvent) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      try {
        el!.setPointerCapture(e.pointerId)
      } catch {
        // Capture can already be gone (e.g. pointer already released); harmless.
      }

      if (phase.current === 'idle') {
        phase.current = 'tracking'
        trackId.current = e.pointerId
        trackStart.current = { x: e.clientX, y: e.clientY }
        return
      }

      // A second touch mid-gesture is always the start of a pinch, even at
      // 1x zoom (so the user can pinch in from unzoomed) — never lets it
      // corrupt the first pointer's swipe/tap classification.
      if ((phase.current === 'tracking' || phase.current === 'panning') && pointers.current.size === 2) {
        beginPinch()
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (phase.current === 'pinching' && pinchIds.current) {
        const [a, b] = pinchIds.current
        const pa = pointers.current.get(a)
        const pb = pointers.current.get(b)
        if (!pa || !pb) return
        const rect = el!.getBoundingClientRect()
        const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }
        latest.current.onPinchMove?.({
          scaleRatio: dist(pa, pb) / pinchStartDistance.current,
          centerX: mid.x - rect.left,
          centerY: mid.y - rect.top,
        })
        return
      }

      if (phase.current === 'tracking' && trackId.current === e.pointerId && trackStart.current) {
        const dx = e.clientX - trackStart.current.x
        const dy = e.clientY - trackStart.current.y
        if (Math.max(Math.abs(dx), Math.abs(dy)) < TAP_THRESHOLD) return
        if (zoomedRef.current) {
          phase.current = 'panning'
          panLast.current = { x: e.clientX, y: e.clientY }
          latest.current.onPanMove?.({ dx, dy })
        }
        // Otherwise stays a swipe candidate; classified on pointerup below.
        return
      }

      if (phase.current === 'panning' && trackId.current === e.pointerId && panLast.current) {
        const dx = e.clientX - panLast.current.x
        const dy = e.clientY - panLast.current.y
        panLast.current = { x: e.clientX, y: e.clientY }
        latest.current.onPanMove?.({ dx, dy })
      }
    }

    function endToIdle() {
      phase.current = 'idle'
      trackId.current = null
      trackStart.current = null
      panLast.current = null
      pinchIds.current = null
    }

    function onPointerUp(e: PointerEvent) {
      try {
        el!.releasePointerCapture(e.pointerId)
      } catch {
        // Already released; harmless.
      }

      if (phase.current === 'pinching' && pinchIds.current?.includes(e.pointerId)) {
        latest.current.onPinchEnd?.()
        pointers.current.delete(e.pointerId)
        const remaining = Array.from(pointers.current.keys())
        if (remaining.length === 1) {
          // Releasing one finger of a pinch hands off to a single-finger pan.
          phase.current = 'panning'
          trackId.current = remaining[0]
          panLast.current = pointers.current.get(remaining[0]) ?? null
          pinchIds.current = null
        } else {
          endToIdle()
        }
        return
      }

      if (phase.current === 'panning' && trackId.current === e.pointerId) {
        latest.current.onPanEnd?.()
        pointers.current.delete(e.pointerId)
        endToIdle()
        return
      }

      if (phase.current === 'tracking' && trackId.current === e.pointerId && trackStart.current) {
        const dx = e.clientX - trackStart.current.x
        const dy = e.clientY - trackStart.current.y
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)
        const h = latest.current

        pointers.current.delete(e.pointerId)
        endToIdle()

        if (absDx < TAP_THRESHOLD && absDy < TAP_THRESHOLD) {
          classifyTap(e.clientX, e.clientY)
          return
        }

        // Swipe-to-navigate only fires at 1x; while zoomed, a completed drag
        // that didn't escalate to panning (e.g. only crossed the tap
        // threshold right at release) is simply dropped, not misread as nav.
        if (zoomedRef.current) return

        if (absDx > absDy) {
          if (absDx < SWIPE_HORIZONTAL_THRESHOLD) return
          if (dx < 0) h.onSwipeLeft?.()
          else h.onSwipeRight?.()
          return
        }

        if (absDy < SWIPE_VERTICAL_THRESHOLD) return
        if (dy < 0) h.onSwipeUp?.()
        else h.onSwipeDown?.()
        return
      }

      // An untracked pointer lifting (e.g. a third finger); just forget it.
      pointers.current.delete(e.pointerId)
    }

    function onPointerCancel(e: PointerEvent) {
      if (phase.current === 'pinching') {
        latest.current.onPinchEnd?.()
      } else if (phase.current === 'panning' && trackId.current === e.pointerId) {
        latest.current.onPanEnd?.()
      }
      try {
        el!.releasePointerCapture(e.pointerId)
      } catch {
        // Already released; harmless.
      }
      pointers.current.delete(e.pointerId)
      if (pointers.current.size === 0) endToIdle()
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerCancel)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerCancel)
      if (tapTimer.current) clearTimeout(tapTimer.current)
    }
  }, [ref])
}
