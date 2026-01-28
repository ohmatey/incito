import { useTranslation } from 'react-i18next'
import type { AgentFile, AgentIcon } from '@/types/agent'
import { cn } from '@/lib/utils'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Bot,
  Brain,
  Sparkles,
  Wand2,
  Search,
  Pencil,
  Code,
  FileText,
  MessageCircle,
  Zap,
  Lightbulb,
  Target,
  Clipboard,
  BookOpen,
  Globe,
  Pin,
  Trash2,
} from 'lucide-react'

const ICON_MAP: Record<AgentIcon, React.ComponentType<{ className?: string }>> = {
  bot: Bot,
  brain: Brain,
  sparkles: Sparkles,
  wand: Wand2,
  search: Search,
  pencil: Pencil,
  code: Code,
  'file-text': FileText,
  'message-circle': MessageCircle,
  zap: Zap,
  lightbulb: Lightbulb,
  target: Target,
  clipboard: Clipboard,
  book: BookOpen,
  globe: Globe,
}

interface AgentListItemProps {
  agent: AgentFile
  isSelected: boolean
  isPinned: boolean
  onSelect: () => void
  onTogglePin: () => void
  onDelete: () => void
}

export function AgentListItem({
  agent,
  isSelected,
  isPinned,
  onSelect,
  onTogglePin,
  onDelete,
}: AgentListItemProps) {
  const { t } = useTranslation('agents')
  const IconComponent = ICON_MAP[agent.icon] || Bot

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onSelect}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            isSelected &&
              'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
          )}
        >
          <IconComponent className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
          <div className="flex-1 truncate">
            <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {agent.name}
            </div>
            {agent.description && (
              <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                {agent.description}
              </div>
            )}
          </div>
          {isPinned && (
            <Pin className="h-3 w-3 flex-shrink-0 text-gray-400 dark:text-gray-500" />
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onTogglePin}>
          <Pin className="mr-2 h-4 w-4" />
          {isPinned ? t('contextMenu.unpin') : t('contextMenu.pin')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onDelete} className="text-red-600 dark:text-red-400">
          <Trash2 className="mr-2 h-4 w-4" />
          {t('contextMenu.delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
