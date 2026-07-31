// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import type { RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Keeps Tab/Shift+Tab cycling within a dialog's focusable elements without
// ever losing keyboard position or trapping focus outside of the dialog.
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>) {
  return function trapFocus(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !containerRef.current) return
    const items = Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    )
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}
