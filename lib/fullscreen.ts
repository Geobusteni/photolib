// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

// iOS Safari has never implemented the Fullscreen API for anything other than
// a <video> element, and older WebKit only exposes the vendor-prefixed forms.
// Callers must treat "unsupported" and "request rejected" as the same signal
// (fall back to simulated fullscreen) since both surface identically to a user.

interface WebkitDocument extends Document {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

interface WebkitElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void
}

export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false
  if (document.fullscreenEnabled) return true
  const el = document.documentElement as WebkitElement
  return typeof el.webkitRequestFullscreen === 'function'
}

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false
  const doc = document as WebkitDocument
  return !!(document.fullscreenElement ?? doc.webkitFullscreenElement)
}

export async function requestFullscreen(el: HTMLElement): Promise<void> {
  if (el.requestFullscreen) {
    await el.requestFullscreen()
    return
  }
  const legacy = (el as WebkitElement).webkitRequestFullscreen
  if (legacy) {
    await legacy.call(el)
    return
  }
  throw new Error('Fullscreen API is not supported')
}

export async function exitFullscreen(): Promise<void> {
  if (document.exitFullscreen) {
    await document.exitFullscreen()
    return
  }
  const legacy = (document as WebkitDocument).webkitExitFullscreen
  if (legacy) {
    await legacy.call(document)
    return
  }
}
