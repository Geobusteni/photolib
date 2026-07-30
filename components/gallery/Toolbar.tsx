'use client'

interface ToolbarProps {
  title: string
  mode: 'gallery' | 'selection'
  selectedCount: number
  zipEnabled: boolean
  projectId: string
  onEnterSelection: () => void
  onExitSelection: () => void
  onDownloadSelected: () => void
}

export default function Toolbar({
  title,
  mode,
  selectedCount,
  zipEnabled,
  projectId,
  onEnterSelection,
  onExitSelection,
  onDownloadSelected,
}: ToolbarProps) {
  return (
    <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-4 bg-black/80 px-4 backdrop-blur-sm">
      <span className="truncate text-sm font-medium text-zinc-100">{title}</span>

      {mode === 'gallery' ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onEnterSelection}
            className="h-9 rounded-lg px-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            Select
          </button>
          {zipEnabled && (
            <a
              href={`/api/projects/${projectId}/download`}
              download
              className="h-9 rounded-lg px-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Download ZIP
            </a>
          )}
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onExitSelection}
            className="h-9 rounded-lg px-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            Cancel
          </button>
          <button
            onClick={onDownloadSelected}
            disabled={selectedCount === 0}
            className="h-9 rounded-lg bg-white px-3 text-sm font-medium text-black transition-colors hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-40"
          >
            Download{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>
        </div>
      )}
    </div>
  )
}
