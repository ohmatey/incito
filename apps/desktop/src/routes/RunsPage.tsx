import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useParams } from '@tanstack/react-router'
import { useLayout } from '@/context/LayoutContext'
import { RunsList } from '@/components/RunsList'
import { ResizeHandle } from '@/components/ui/resize-handle'
import type { PromptRun } from '@/types/run'
import { getRecentRuns } from '@/lib/store'

export function RunsPage() {
  const navigate = useNavigate()
  const { runId } = useParams({ strict: false })
  const {
    panelWidths,
    handlePromptListResize,
    handlePanelResizeEnd,
    listPanelCollapsed,
  } = useLayout()

  const [runs, setRuns] = useState<PromptRun[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadRuns() {
      setIsLoading(true)
      const result = await getRecentRuns(100)
      if (result.ok) {
        setRuns(result.data)
      }
      setIsLoading(false)
    }
    loadRuns()
  }, [])

  function handleSelectRun(run: PromptRun) {
    navigate({ to: '/runs/$runId', params: { runId: run.id }, search: { variable: undefined, collapsed: false, tab: undefined } })
  }

  // Derive selected run from URL param
  const selectedRun = runId ? runs.find((r) => r.id === runId) || null : null

  // Show list panel when not collapsed OR when no run is selected
  const showListPanel = !listPanelCollapsed || !selectedRun

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      </div>
    )
  }

  return (
    <>
      {showListPanel && (
        <>
          <RunsList
            runs={runs}
            selectedRunId={runId || null}
            onSelectRun={handleSelectRun}
            width={panelWidths.promptList}
          />
          <ResizeHandle
            side="left"
            onResize={handlePromptListResize}
            onResizeEnd={handlePanelResizeEnd}
          />
        </>
      )}
      <Outlet />
    </>
  )
}
