// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface ZoomState {
  scale: number
  x: number
  y: number
  /** True only during the brief snap-back/snap-to-point transition. */
  snapping: boolean
}

const MIN_SCALE = 1
const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2
const SNAP_MS = 200
const IDLE: ZoomState = { scale: 1, x: 0, y: 0, snapping: false }

// Owns the zoom/pan transform for the lightbox image — a separate concern
// from useGestures, which only classifies *what* gesture is happening.
export function useImageZoom(containerRef: React.RefObject<HTMLElement | null>) {
  const [zoom, setZoom] = useState<ZoomState>(IDLE)
  const zoomRef = useRef(zoom)
  useEffect(() => {
    zoomRef.current = zoom
  })
  const scaleAtGestureStart = useRef(1)
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clampPan = useCallback(
    (scale: number, x: number, y: number) => {
      const el = containerRef.current
      if (!el) return { x, y }
      const rect = el.getBoundingClientRect()
      const maxX = (rect.width * (scale - 1)) / 2
      const maxY = (rect.height * (scale - 1)) / 2
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      }
    },
    [containerRef]
  )

  const isZoomed = useCallback(() => zoomRef.current.scale > 1.01, [])

  const reset = useCallback(() => {
    if (snapTimer.current) clearTimeout(snapTimer.current)
    setZoom(IDLE)
  }, [])

  const snapTo = useCallback((next: { scale: number; x: number; y: number }) => {
    if (snapTimer.current) clearTimeout(snapTimer.current)
    setZoom({ ...next, snapping: true })
    snapTimer.current = setTimeout(() => {
      setZoom((z) => ({ ...z, snapping: false }))
    }, SNAP_MS)
  }, [])

  const onPinchStart = useCallback(() => {
    scaleAtGestureStart.current = zoomRef.current.scale
  }, [])

  const onPinchMove = useCallback(
    (info: { scaleRatio: number; centerX: number; centerY: number }) => {
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleAtGestureStart.current * info.scaleRatio))
      const { x, y } = clampPan(nextScale, zoomRef.current.x, zoomRef.current.y)
      setZoom({ scale: nextScale, x, y, snapping: false })
    },
    [clampPan]
  )

  const onPinchEnd = useCallback(() => {
    if (zoomRef.current.scale < 1.05) snapTo({ scale: 1, x: 0, y: 0 })
  }, [snapTo])

  const onPanMove = useCallback(
    (info: { dx: number; dy: number }) => {
      if (zoomRef.current.scale <= 1.01) return
      const { x, y } = clampPan(zoomRef.current.scale, zoomRef.current.x + info.dx, zoomRef.current.y + info.dy)
      setZoom((z) => ({ ...z, x, y, snapping: false }))
    },
    [clampPan]
  )

  const onPanEnd = useCallback(() => {
    if (zoomRef.current.scale < 1.05) snapTo({ scale: 1, x: 0, y: 0 })
  }, [snapTo])

  const onDoubleTap = useCallback(
    (point: { x: number; y: number }) => {
      if (zoomRef.current.scale > 1.01) {
        snapTo({ scale: 1, x: 0, y: 0 })
        return
      }
      const el = containerRef.current
      if (!el) {
        snapTo({ scale: DOUBLE_TAP_SCALE, x: 0, y: 0 })
        return
      }
      const rect = el.getBoundingClientRect()
      const dx = point.x - (rect.left + rect.width / 2)
      const dy = point.y - (rect.top + rect.height / 2)
      const { x, y } = clampPan(DOUBLE_TAP_SCALE, dx * (1 - DOUBLE_TAP_SCALE), dy * (1 - DOUBLE_TAP_SCALE))
      snapTo({ scale: DOUBLE_TAP_SCALE, x, y })
    },
    [snapTo, clampPan, containerRef]
  )

  useEffect(
    () => () => {
      if (snapTimer.current) clearTimeout(snapTimer.current)
    },
    []
  )

  return { zoom, isZoomed, reset, onPinchStart, onPinchMove, onPinchEnd, onPanMove, onPanEnd, onDoubleTap }
}
