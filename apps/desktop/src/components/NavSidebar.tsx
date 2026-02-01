import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FileText, Settings, Search, Keyboard, Bot, Play, FolderArchive, CheckCircle2, Tags, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal'

export type NavView = 'prompts' | 'agents' | 'resources' | 'runs' | 'graders' | 'playbooks' | 'tags' | 'settings' | 'search'

interface NavSidebarProps {
  currentView: NavView
  onViewChange: (view: NavView) => void
  agentsEnabled?: boolean
  resourcesEnabled?: boolean
  runsEnabled?: boolean
  gradersEnabled?: boolean
  playbooksEnabled?: boolean
}

export function NavSidebar({
  currentView,
  onViewChange,
  agentsEnabled = false,
  resourcesEnabled = false,
  runsEnabled = false,
  gradersEnabled = false,
  playbooksEnabled = false,
}: NavSidebarProps) {
  const { t } = useTranslation('common')
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
          aria-label={t('navigation.goToPrompts')}
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
                aria-label={t('navigation.search')}
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
              <p>{t('navigation.search')}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewChange('prompts')}
                aria-label={t('navigation.prompts')}
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
              <p>{t('navigation.prompts')}</p>
            </TooltipContent>
          </Tooltip>

          {agentsEnabled && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewChange('agents')}
                  aria-label={t('navigation.agents')}
                  className={cn(
                    'h-10 w-10 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                    currentView === 'agents' &&
                      'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                  )}
                >
                  <Bot className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{t('navigation.agents')}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {runsEnabled && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewChange('runs')}
                  aria-label={t('navigation.runs')}
                  className={cn(
                    'h-10 w-10 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                    currentView === 'runs' &&
                      'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                  )}
                >
                  <Play className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{t('navigation.runs')}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {gradersEnabled && runsEnabled && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewChange('graders')}
                  aria-label={t('navigation.graders')}
                  className={cn(
                    'h-10 w-10 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                    currentView === 'graders' &&
                      'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                  )}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{t('navigation.graders')}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {playbooksEnabled && runsEnabled && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewChange('playbooks')}
                  aria-label={t('navigation.playbooks')}
                  className={cn(
                    'h-10 w-10 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                    currentView === 'playbooks' &&
                      'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                  )}
                >
                  <BookOpen className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{t('navigation.playbooks')}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {resourcesEnabled && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewChange('resources')}
                  aria-label={t('navigation.resources')}
                  className={cn(
                    'h-10 w-10 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                    currentView === 'resources' &&
                      'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                  )}
                >
                  <FolderArchive className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{t('navigation.resources')}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewChange('tags')}
                aria-label={t('navigation.tags')}
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
              <p>{t('navigation.tags')}</p>
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
                aria-label={t('navigation.keyboardShortcuts')}
                className="h-10 w-10 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              >
                <Keyboard className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{t('navigation.keyboardShortcuts')}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewChange('settings')}
                aria-label={t('navigation.settings')}
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
              <p>{t('navigation.settings')}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </TooltipProvider>
  )
}
