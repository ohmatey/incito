import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface KeyboardShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Shortcut {
  labelKey: string
  keys: string[]
}

interface ShortcutSection {
  titleKey: string
  shortcuts: Shortcut[]
}

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
const modKey = isMac ? '⌘' : 'Ctrl'

const shortcutSections: ShortcutSection[] = [
  {
    titleKey: 'shortcuts.sections.navigation',
    shortcuts: [
      { labelKey: 'shortcuts.labels.searchPrompts', keys: [modKey, 'K'] },
      { labelKey: 'shortcuts.labels.newPrompt', keys: [modKey, 'N'] },
      { labelKey: 'shortcuts.labels.navigateList', keys: ['↑', '↓'] },
      { labelKey: 'shortcuts.labels.jumpVariables', keys: [modKey, 'Shift', '↑/↓'] },
    ],
  },
  {
    titleKey: 'shortcuts.sections.actions',
    shortcuts: [
      { labelKey: 'shortcuts.labels.copyPrompt', keys: [modKey, 'Enter'] },
      { labelKey: 'shortcuts.labels.editPrompt', keys: [modKey, 'E'] },
      { labelKey: 'shortcuts.labels.saveChanges', keys: [modKey, 'S'] },
      { labelKey: 'shortcuts.labels.duplicatePrompt', keys: [modKey, 'D'] },
    ],
  },
  {
    titleKey: 'shortcuts.sections.panels',
    shortcuts: [
      { labelKey: 'shortcuts.labels.toggleRightPanel', keys: [modKey, '\\'] },
    ],
  },
  {
    titleKey: 'shortcuts.sections.general',
    shortcuts: [
      { labelKey: 'shortcuts.labels.showShortcuts', keys: [modKey, '/'] },
      { labelKey: 'shortcuts.labels.closeCancel', keys: ['Esc'] },
      { labelKey: 'shortcuts.labels.moveBetweenFields', keys: ['Tab'] },
    ],
  },
]

function ShortcutKey({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded bg-gray-100 px-1.5 font-mono text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      {children}
    </kbd>
  )
}

function ShortcutRow({ shortcut, t }: { shortcut: Shortcut; t: (key: string) => string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600 dark:text-gray-400">{t(shortcut.labelKey)}</span>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((key, index) => (
          <ShortcutKey key={index}>{key}</ShortcutKey>
        ))}
      </div>
    </div>
  )
}

function ShortcutSectionComponent({ section, t }: { section: ShortcutSection; t: (key: string) => string }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {t(section.titleKey)}
      </h3>
      <div className="space-y-0.5">
        {section.shortcuts.map((shortcut, index) => (
          <ShortcutRow key={index} shortcut={shortcut} t={t} />
        ))}
      </div>
    </div>
  )
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  const { t } = useTranslation('common')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('shortcuts.title')}
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              {isMac ? t('shortcuts.platform.mac') : t('shortcuts.platform.other')}
            </span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="grid grid-cols-2 gap-6 pr-4">
            {shortcutSections.map((section, index) => (
              <ShortcutSectionComponent key={index} section={section} t={t} />
            ))}
          </div>
        </ScrollArea>
        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            {t('shortcuts.toggleHint', { mod: modKey })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
