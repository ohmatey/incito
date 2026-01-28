import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { AgentFile, AgentIcon } from '@/types/agent'
import type { Tag } from '@/types/prompt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Save,
  X,
} from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { LANGUAGES } from '@/i18n/types'
import { getTranslationSettings } from '@/lib/store'
import { TagSelector } from './TagSelector'
import { TagBadge } from './TagBadge'

const ICON_OPTIONS: { value: AgentIcon; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { value: 'bot', icon: Bot, label: 'Bot' },
  { value: 'brain', icon: Brain, label: 'Brain' },
  { value: 'sparkles', icon: Sparkles, label: 'Sparkles' },
  { value: 'wand', icon: Wand2, label: 'Wand' },
  { value: 'search', icon: Search, label: 'Search' },
  { value: 'pencil', icon: Pencil, label: 'Pencil' },
  { value: 'code', icon: Code, label: 'Code' },
  { value: 'file-text', icon: FileText, label: 'File' },
  { value: 'message-circle', icon: MessageCircle, label: 'Message' },
  { value: 'zap', icon: Zap, label: 'Zap' },
  { value: 'lightbulb', icon: Lightbulb, label: 'Lightbulb' },
  { value: 'target', icon: Target, label: 'Target' },
  { value: 'clipboard', icon: Clipboard, label: 'Clipboard' },
  { value: 'book', icon: BookOpen, label: 'Book' },
  { value: 'globe', icon: Globe, label: 'Globe' },
]

interface AgentEditorProps {
  agent: AgentFile
  tags: Tag[]
  onSave: (agent: AgentFile) => Promise<void>
  onCancel: () => void
  onCreateTag: (name: string, color: string) => void
}

export function AgentEditor({ agent, tags, onSave, onCancel, onCreateTag }: AgentEditorProps) {
  const { t } = useTranslation(['agents', 'common', 'settings', 'tags'])
  const { language: appLanguage } = useLanguage()

  const [name, setName] = useState(agent.name)
  const [description, setDescription] = useState(agent.description)
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt)
  const [icon, setIcon] = useState<AgentIcon>(agent.icon)
  const [language, setLanguage] = useState(agent.settings.language || appLanguage)
  const [localTags, setLocalTags] = useState<string[]>(agent.tags || [])
  const [isSaving, setIsSaving] = useState(false)
  const [translationEnabled, setTranslationEnabled] = useState(false)

  // Load translation settings on mount
  useEffect(() => {
    async function loadTranslationSettings() {
      const result = await getTranslationSettings()
      if (result.ok) {
        setTranslationEnabled(result.data.enabled)
      }
    }
    loadTranslationSettings()
  }, [])

  // Reset form when agent changes
  useEffect(() => {
    setName(agent.name)
    setDescription(agent.description)
    setSystemPrompt(agent.systemPrompt)
    setIcon(agent.icon)
    setLanguage(agent.settings.language || appLanguage)
    setLocalTags(agent.tags || [])
  }, [agent.id, appLanguage])

  // Get Tag objects for display from tag names
  const agentTagObjects = localTags
    .map((tagName) => tags.find((t) => t.name === tagName))
    .filter((t): t is Tag => t !== undefined)

  function handleTagToggle(tagName: string) {
    if (localTags.includes(tagName)) {
      setLocalTags(localTags.filter((t) => t !== tagName))
    } else {
      setLocalTags([...localTags, tagName])
    }
  }

  function handleTagRemove(tagName: string) {
    setLocalTags(localTags.filter((t) => t !== tagName))
  }

  function handleCreateTagAndAdd(name: string, color: string) {
    onCreateTag(name, color)
    setLocalTags([...localTags, name])
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const updatedAgent: AgentFile = {
        ...agent,
        name,
        description,
        systemPrompt,
        icon,
        tags: localTags,
        settings: {
          ...agent.settings,
          language,
        },
      }
      await onSave(updatedAgent)
    } finally {
      setIsSaving(false)
    }
  }

  const SelectedIcon = ICON_OPTIONS.find((o) => o.value === icon)?.icon || Bot

  return (
    <div className="flex h-full flex-1 flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <SelectedIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('agents:editor.title')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="mr-1 h-4 w-4" />
            {t('common:buttons.cancel')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || !name.trim()}>
            <Save className="mr-1 h-4 w-4" />
            {t('common:buttons.save')}
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl space-y-6 p-6">
          {/* Name & Icon Row */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="name">{t('common:labels.name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('agents:editor.namePlaceholder')}
              />
            </div>
            <div className="w-32 space-y-2">
              <Label>{t('agents:editor.icon')}</Label>
              <Select value={icon} onValueChange={(v) => setIcon(v as AgentIcon)}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <SelectedIcon className="h-4 w-4" />
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((option) => {
                    const IconComp = option.icon
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <IconComp className="h-4 w-4" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('common:labels.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('agents:editor.descriptionPlaceholder')}
              rows={2}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>{t('tags:title')}</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {agentTagObjects.map((tag) => (
                <TagBadge
                  key={tag.id}
                  tag={tag}
                  onRemove={() => handleTagRemove(tag.name)}
                />
              ))}
              <TagSelector
                tags={tags}
                selectedTagNames={localTags}
                onTagToggle={handleTagToggle}
                onCreateTag={handleCreateTagAndAdd}
              />
            </div>
          </div>

          {/* Language - only shown when translation is enabled */}
          {translationEnabled && (
            <div className="space-y-2">
              <Label htmlFor="language">{t('agents:editor.language')}</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('agents:editor.languageHint')}
              </p>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language" className="w-full">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span>{LANGUAGES.find((l) => l.code === language)?.flag}</span>
                      <span>{LANGUAGES.find((l) => l.code === language)?.nativeName}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <div className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.nativeName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">{t('agents:editor.systemPrompt')}</Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('agents:editor.systemPromptHint')}
            </p>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={t('agents:editor.systemPromptPlaceholder')}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
