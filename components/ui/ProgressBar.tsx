// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

interface ProgressBarProps {
  /** 0-100; omit for an indeterminate bar. */
  value?: number
  label: string
}

export default function ProgressBar({ value, label }: ProgressBarProps) {
  const determinate = typeof value === 'number'

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? Math.round(value) : undefined}
      className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
    >
      {determinate ? (
        <div
          className="h-full rounded-full bg-zinc-900 transition-[width] duration-200 dark:bg-white"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      ) : (
        <div className="h-full w-full origin-left animate-pulse rounded-full bg-zinc-900 dark:bg-white" />
      )}
    </div>
  )
}
