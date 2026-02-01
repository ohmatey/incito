import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import {
  getPanelWidths,
  savePanelWidths,
  getListPanelCollapsed,
  saveListPanelCollapsed,
  type PanelWidths,
} from '@/lib/store'
import type { RightPanelTab } from '@/components/PromptHeader'

interface LayoutContextValue {
  // Panel widths
  panelWidths: PanelWidths
  handlePromptListResize: (delta: number) => void
  handleRightPanelResize: (delta: number) => void
  handlePanelResizeEnd: () => void

  // List panel collapse state
  listPanelCollapsed: boolean
  toggleListPanelCollapsed: () => void

  // Right panel state
  rightPanelTab: RightPanelTab
  setRightPanelTab: (tab: RightPanelTab) => void
  rightPanelOpen: boolean
  setRightPanelOpen: (open: boolean) => void
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider')
  }
  return context
}

interface LayoutProviderProps {
  children: ReactNode
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  // Panel widths state
  const [panelWidths, setPanelWidths] = useState<PanelWidths>({ promptList: 200, rightPanel: 300 })

  // List panel collapsed state
  const [listPanelCollapsed, setListPanelCollapsed] = useState(false)

  // Right panel state
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('preview')
  const [rightPanelOpen, setRightPanelOpen] = useState(false)

  // Load persisted layout settings on mount
  useEffect(() => {
    async function loadLayoutSettings() {
      const [panelWidthsResult, collapsedResult] = await Promise.all([
        getPanelWidths(),
        getListPanelCollapsed(),
      ])

      if (panelWidthsResult.ok) {
        setPanelWidths(panelWidthsResult.data)
      }
      if (collapsedResult.ok) {
        setListPanelCollapsed(collapsedResult.data)
      }
    }
    loadLayoutSettings()
  }, [])

  // Panel resize handlers
  function handlePromptListResize(delta: number) {
    setPanelWidths((prev) => ({
      ...prev,
      promptList: Math.min(400, Math.max(150, prev.promptList + delta)),
    }))
  }

  function handleRightPanelResize(delta: number) {
    setPanelWidths((prev) => ({
      ...prev,
      rightPanel: Math.min(600, Math.max(200, prev.rightPanel + delta)),
    }))
  }

  async function handlePanelResizeEnd() {
    await savePanelWidths(panelWidths)
  }

  // List panel collapse toggle
  function toggleListPanelCollapsed() {
    setListPanelCollapsed((prev) => {
      const newCollapsed = !prev
      // Fire and forget - don't block UI for persistence
      saveListPanelCollapsed(newCollapsed)
      return newCollapsed
    })
  }

  const value: LayoutContextValue = {
    panelWidths,
    handlePromptListResize,
    handleRightPanelResize,
    handlePanelResizeEnd,
    listPanelCollapsed,
    toggleListPanelCollapsed,
    rightPanelTab,
    setRightPanelTab,
    rightPanelOpen,
    setRightPanelOpen,
  }

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}
