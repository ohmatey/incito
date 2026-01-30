import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { AgentFile, AgentIcon, ChatSession } from '@/types/agent'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
  ChevronDown,
  Plus,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react'
import { LANGUAGES } from '@/i18n/types'
import { getTranslationSettings } from '@/lib/store'

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

interface ChatHeaderProps {
  agent: AgentFile
  sessions: ChatSession[]
  currentSession: ChatSession | null
  listPanelCollapsed?: boolean
  onSelectSession: (session: ChatSession) => void
  onNewSession: () => void
  onEdit?: () => void
  onToggleListPanel?: () => void
}

export function ChatHeader({
  agent,
  sessions,
  currentSession,
  listPanelCollapsed = false,
  onSelectSession,
  onNewSession,
  onEdit,
  onToggleListPanel,
}: ChatHeaderProps) {
  const { t } = useTranslation('agents')
  const IconComponent = ICON_MAP[agent.icon] || Bot
  const [translationEnabled, setTranslationEnabled] = useState(false)

  useEffect(() => {
    async function loadTranslationSettings() {
      const result = await getTranslationSettings()
      if (result.ok) {
        setTranslationEnabled(result.data.enabled)
      }
    }
    loadTranslationSettings()
  }, [])

  const agentLanguage = translationEnabled && agent.settings.language
    ? LANGUAGES.find((l) => l.code === agent.settings.language)
    : null

  return (
    <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
      {/* Agent Info */}
      <div className="flex items-center gap-3">
        {onToggleListPanel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleListPanel}
            className="h-8 w-8"
            aria-label={listPanelCollapsed ? t('list.expand') : t('list.collapse')}
          >
            {listPanelCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        )}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <IconComponent className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {agent.name}
            </h2>
            {agentLanguage && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                <span>{agentLanguage.flag}</span>
                <span>{agentLanguage.code.toUpperCase()}</span>
              </span>
            )}
          </div>
          {agent.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {agent.description}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              {currentSession?.title || t('chat.newSession')}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onNewSession}>
              <Plus className="mr-2 h-4 w-4" />
              {t('chat.newSession')}
            </DropdownMenuItem>
            {sessions.length > 0 && <DropdownMenuSeparator />}
            {sessions.map((session) => (
              <DropdownMenuItem
                key={session.id}
                onClick={() => onSelectSession(session)}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                <span className="truncate">{session.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
