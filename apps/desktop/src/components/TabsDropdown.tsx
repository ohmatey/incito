import { useTranslation } from 'react-i18next'
import type { RightPanelTab } from '@/components/PromptHeader'
import { ChevronDown, Eye, History, Settings2, StickyNote, List, Clock, Pencil } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Hoisted outside component to avoid recreation on each render
const tabIcons: Record<RightPanelTab, React.ReactNode> = {
  preview: <Eye className="h-4 w-4" aria-hidden="true" />,
  history: <History className="h-4 w-4" aria-hidden="true" />,
  notes: <StickyNote className="h-4 w-4" aria-hidden="true" />,
  config: <Settings2 className="h-4 w-4" aria-hidden="true" />,
  instructions: <List className="h-4 w-4" aria-hidden="true" />,
  runs: <Clock className="h-4 w-4" aria-hidden="true" />,
}

const editIcon = <Pencil className="h-4 w-4" aria-hidden="true" />

interface TabsDropdownProps {
  activeTab: RightPanelTab
  isEditMode: boolean
  runsEnabled?: boolean
  showEditOption?: boolean
  onTabChange: (tab: RightPanelTab) => void
  onEditModeChange?: (editMode: boolean) => void
}

export function TabsDropdown({
  activeTab,
  isEditMode,
  runsEnabled = false,
  showEditOption = false,
  onTabChange,
  onEditModeChange,
}: TabsDropdownProps) {
  const { t } = useTranslation('common')

  // Labels need to be inside component for i18n reactivity
  const tabLabels: Record<RightPanelTab, string> = {
    preview: t('tabs.prompt'),
    history: t('tabs.history'),
    notes: t('tabs.notes'),
    config: t('tabs.config'),
    instructions: t('tabs.instructions'),
    runs: t('tabs.runs'),
  }

  // Tabs available depends on edit mode and feature flags
  const availableTabs: RightPanelTab[] = isEditMode
    ? ['preview', 'instructions', 'notes', 'history', 'config']
    : runsEnabled
      ? ['preview', 'runs', 'notes', 'history', 'config']
      : ['preview', 'notes', 'history', 'config']

  return (
    <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md" role="group" aria-label={t('rightPanel.panelOptions')}>
      {/* Main button - opens panel */}
      <button
        type="button"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-l-md hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 transition-colors cursor-pointer"
        onClick={() => onTabChange('preview')}
      >
        {tabIcons[activeTab]}
        <span>{tabLabels[activeTab]}</span>
      </button>

      {/* Dropdown chevron button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center h-8 w-6 border-l border-gray-200 dark:border-gray-700 text-gray-500 rounded-r-md hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 transition-colors cursor-pointer"
            aria-haspopup="menu"
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{t('rightPanel.openMenu')}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {availableTabs
            .filter((tab) => tab !== activeTab)
            .map((tab) => (
              <DropdownMenuItem
                key={tab}
                onClick={() => onTabChange(tab)}
                className="gap-2 cursor-pointer"
              >
                {tabIcons[tab]}
                {tabLabels[tab]}
              </DropdownMenuItem>
            ))}

          {/* Edit option - shown when not in edit mode */}
          {showEditOption && !isEditMode && onEditModeChange && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onEditModeChange(true)}
                className="gap-2 cursor-pointer"
              >
                {editIcon}
                {t('buttons.edit')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
