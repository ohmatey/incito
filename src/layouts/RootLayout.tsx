import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { AppProvider, useAppContext } from '@/context/AppContext'
import { FolderSelect } from '@/components/FolderSelect'
import { NavSidebar } from '@/components/NavSidebar'
import { NewPromptDialog } from '@/components/NewPromptDialog'
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
    triggerSearchFocus,
    handleCreatePrompt,
    handleCreateFromAI,
  } = useAppContext()

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
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [folderPath, navigate, triggerSearchFocus, setShowNewPromptDialog])

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
  const currentView = (() => {
    const pathname = location.pathname
    if (pathname.startsWith('/search')) return 'search'
    if (pathname.startsWith('/tags')) return 'tags'
    if (pathname.startsWith('/settings')) return 'settings'
    return 'prompts'
  })()

  // Handle nav view change
  function handleViewChange(view: 'prompts' | 'tags' | 'settings' | 'search') {
    switch (view) {
      case 'prompts':
        navigate({ to: '/prompts' })
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

  return (
    <>
      <div className="flex h-screen border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
        <NavSidebar currentView={currentView} onViewChange={handleViewChange} />
        <Outlet />
      </div>
      <NewPromptDialog
        open={showNewPromptDialog}
        onOpenChange={setShowNewPromptDialog}
        onCreateBlank={handleCreatePrompt}
        onCreateFromAI={handleCreateFromAI}
        onOpenSettings={() => navigate({ to: '/settings' })}
      />
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
