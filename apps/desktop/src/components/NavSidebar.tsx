import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FileText, Tags, Settings, Search, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal'

interface NavSidebarProps {
  currentView: 'prompts' | 'tags' | 'settings' | 'search'
  onViewChange: (view: 'prompts' | 'tags' | 'settings' | 'search') => void
}

export function NavSidebar({
  currentView,
  onViewChange,
}: NavSidebarProps) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Global keyboard shortcut to open shortcuts modal (Cmd/Ctrl + /)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key === '/') {
        e.preventDefault()
        setShortcutsOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full w-[60px] flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {/* Logo */}
        <button
          onClick={() => onViewChange('prompts')}
          aria-label="Go to prompts"
          className="flex h-14 w-full items-center justify-center border-b border-gray-200 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 512 512"
            fill="none"
            className="text-gray-800 dark:text-gray-100"
          >
            <path
              d="M33.346 427.526L253.376 84.4732L478.654 427.527M33.346 427.526L478.654 427.527M33.346 427.526L253.274 339.649L478.654 427.527M253.274 92.0396V339.882"
              stroke="currentColor"
              strokeWidth="31.3647"
            />
          </svg>
        </button>

        {/* Navigation Items */}
        <div className="flex flex-1 flex-col items-center gap-1 py-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewChange('search')}
                aria-label="Search"
                className={cn(
                  'h-10 w-10 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                  currentView === 'search' &&
                    'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                )}
              >
                <Search className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Search</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewChange('prompts')}
                aria-label="Prompts"
                className={cn(
                  'h-10 w-10 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                  currentView === 'prompts' &&
                    'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                )}
              >
                <FileText className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Prompts</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewChange('tags')}
                aria-label="Tags"
                className={cn(
                  'h-10 w-10 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                  currentView === 'tags' &&
                    'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                )}
              >
                <Tags className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Tags</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Bottom - Shortcuts & Settings */}
        <div className="flex flex-col items-center gap-1 border-t border-gray-200 py-3 dark:border-gray-700">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShortcutsOpen(true)}
                aria-label="Keyboard shortcuts"
                className="h-10 w-10 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              >
                <Keyboard className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Keyboard Shortcuts</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewChange('settings')}
                aria-label="Settings"
                className={cn(
                  'h-10 w-10 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                  currentView === 'settings' &&
                    'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                )}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </TooltipProvider>
  )
}
