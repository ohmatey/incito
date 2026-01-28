import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { AppProvider, useAppContext } from '@/context/AppContext'
import { FolderSelect } from '@/components/FolderSelect'
import { NavSidebar, type NavView } from '@/components/NavSidebar'
import { NewPromptDialog } from '@/components/NewPromptDialog'
import { UpdateNotification } from '@/components/UpdateNotification'
import { Toaster } from '@/components/ui/sonner'

function RootLayoutInner() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    folderPath,
    isLoading,
    handleFolderSelect,
    showNewPromptDialog,
    setShowNewPromptDialog,
    newPromptDialogMode,
    triggerSearchFocus,
    handleCreatePrompt,
    handleCreateFromAI,
    rightPanelOpen,
    setRightPanelOpen,
    featureFlags,
  } = useAppContext()

  // Redirect if user is on a disabled feature route
  useEffect(() => {
    const pathname = location.pathname
    if (pathname.startsWith('/agents') && !featureFlags.agentsEnabled) {
      navigate({ to: '/prompts' })
    }
    if (pathname.startsWith('/resources') && !featureFlags.resourcesEnabled) {
      navigate({ to: '/prompts' })
    }
    if (pathname.startsWith('/runs') && !featureFlags.runsEnabled) {
      navigate({ to: '/prompts' })
    }
  }, [location.pathname, featureFlags, navigate])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K - Navigate to search view and focus search input
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        navigate({ to: '/search' })
        triggerSearchFocus()
      }
      // Cmd+N / Ctrl+N - Open new prompt dialog
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        if (folderPath) {
          setShowNewPromptDialog(true)
        }
      }
      // Cmd+\ / Ctrl+\ - Toggle right panel
      if ((e.metaKey || e.ctrlKey) && (e.key === '\\' || e.code === 'Backslash')) {
        e.preventDefault()
        setRightPanelOpen(!rightPanelOpen)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [folderPath, navigate, triggerSearchFocus, setShowNewPromptDialog, rightPanelOpen, setRightPanelOpen])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  // Folder selection
  if (!folderPath) {
    return (
      <>
        <FolderSelect onFolderSelect={handleFolderSelect} />
        <Toaster />
      </>
    )
  }

  // Derive current view from pathname for NavSidebar
  const currentView: NavView = (() => {
    const pathname = location.pathname
    if (pathname.startsWith('/search')) return 'search'
    if (pathname.startsWith('/agents')) return 'agents'
    if (pathname.startsWith('/runs')) return 'runs'
    if (pathname.startsWith('/resources')) return 'resources'
    if (pathname.startsWith('/tags')) return 'tags'
    if (pathname.startsWith('/settings')) return 'settings'
    return 'prompts'
  })()

  // Handle nav view change
  function handleViewChange(view: NavView) {
    switch (view) {
      case 'prompts':
        navigate({ to: '/prompts' })
        break
      case 'agents':
        navigate({ to: '/agents' })
        break
      case 'runs':
        navigate({ to: '/runs' })
        break
      case 'resources':
        navigate({ to: '/resources' })
        break
      case 'search':
        navigate({ to: '/search' })
        break
      case 'tags':
        navigate({ to: '/tags' })
        break
      case 'settings':
        navigate({ to: '/settings' })
        break
    }
  }

  // Wrapper to navigate after creating blank prompt
  async function handleCreateBlankAndNavigate() {
    const newPrompt = await handleCreatePrompt()
    if (newPrompt) {
      navigate({ to: '/prompts/$promptId', params: { promptId: newPrompt.id } })
    }
  }

  // Wrapper to navigate after AI generation
  async function handleCreateFromAIAndNavigate(generated: Parameters<typeof handleCreateFromAI>[0]) {
    const newPrompt = await handleCreateFromAI(generated)
    if (newPrompt) {
      navigate({ to: '/prompts/$promptId', params: { promptId: newPrompt.id } })
    }
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <NavSidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          agentsEnabled={featureFlags.agentsEnabled}
          resourcesEnabled={featureFlags.resourcesEnabled}
          runsEnabled={featureFlags.runsEnabled}
        />
        <Outlet />
      </div>
      <NewPromptDialog
        open={showNewPromptDialog}
        onOpenChange={setShowNewPromptDialog}
        onCreateBlank={handleCreateBlankAndNavigate}
        onCreateFromAI={handleCreateFromAIAndNavigate}
        onOpenSettings={() => navigate({ to: '/settings' })}
        defaultMode={newPromptDialogMode}
      />
      <UpdateNotification />
      <Toaster />
    </>
  )
}

export function RootLayout() {
  return (
    <AppProvider>
      <RootLayoutInner />
    </AppProvider>
  )
}
