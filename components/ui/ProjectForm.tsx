'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProjectFormProps {
  mode: 'create' | 'edit'
  projectId?: string
  defaults?: {
    title?: string
    event_date?: string | null
    expires_at?: string | null
    zip_enabled?: boolean
    dl_enabled?: boolean
  }
}

export default function ProjectForm({ mode, projectId, defaults }: ProjectFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const getValue = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement)?.value || undefined
    const getChecked = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement)?.checked

    const body: Record<string, unknown> = {
      title: getValue('title'),
      event_date: getValue('event_date') || null,
      expires_at: getValue('expires_at') || null,
      zip_enabled: getChecked('zip_enabled'),
      dl_enabled: getChecked('dl_enabled'),
    }

    const password = getValue('password')
    if (password) body.password = password

    if (mode === 'create' && !password) {
      setError('Password is required')
      setLoading(false)
      return
    }

    try {
      const url = mode === 'create' ? '/api/projects' : `/api/projects/${projectId}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong')
        return
      }

      const project = await res.json()
      router.push(`/projects/${project.id}`)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isoToDate = (iso: string | null | undefined) =>
    iso ? iso.split('T')[0] : ''

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <Field label="Title" htmlFor="title" required>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={defaults?.title}
          autoFocus={mode === 'create'}
          className={inputClass}
        />
      </Field>

      <Field label="Event date" htmlFor="event_date">
        <input
          id="event_date"
          name="event_date"
          type="date"
          defaultValue={isoToDate(defaults?.event_date)}
          className={inputClass}
        />
      </Field>

      <Field
        label={mode === 'create' ? 'Gallery password' : 'New gallery password'}
        htmlFor="password"
        required={mode === 'create'}
        hint={mode === 'edit' ? 'Leave blank to keep current password' : undefined}
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required={mode === 'create'}
          className={inputClass}
        />
      </Field>

      <Field label="Expiration date" htmlFor="expires_at" hint="Gallery becomes inaccessible after this date">
        <input
          id="expires_at"
          name="expires_at"
          type="date"
          defaultValue={isoToDate(defaults?.expires_at)}
          className={inputClass}
        />
      </Field>

      <div className="flex flex-col gap-3">
        <Toggle
          id="zip_enabled"
          label="Allow ZIP download"
          defaultChecked={defaults?.zip_enabled ?? true}
        />
        <Toggle
          id="dl_enabled"
          label="Allow individual image downloads"
          defaultChecked={defaults?.dl_enabled ?? true}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="h-10 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {loading ? 'Saving…' : mode === 'create' ? 'Create project' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="h-10 rounded-lg border border-zinc-300 px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

const inputClass =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden>*</span>}
      </label>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      {children}
    </div>
  )
}

function Toggle({
  id,
  label,
  defaultChecked,
}: {
  id: string
  label: string
  defaultChecked: boolean
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
      <input
        id={id}
        name={id}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
      />
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
    </label>
  )
}
