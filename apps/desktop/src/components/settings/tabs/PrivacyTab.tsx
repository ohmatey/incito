import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Shield } from 'lucide-react'
import { getPrivacySettings, savePrivacySettings } from '@/lib/store'

export function PrivacyTab() {
  const { t } = useTranslation(['settings'])
  const [contextLimitInput, setContextLimitInput] = useState('')

  const loadPrivacySettings = useCallback(async () => {
    const result = await getPrivacySettings()
    if (result.ok) {
      setContextLimitInput(result.data.contextLimitTokens?.toString() ?? '')
    }
  }, [])

  useEffect(() => {
    loadPrivacySettings()
  }, [loadPrivacySettings])

  async function handleContextLimitChange(value: string) {
    setContextLimitInput(value)
    const parsed = value === '' ? null : parseInt(value, 10)
    if (value === '' || (!isNaN(parsed!) && parsed! > 0)) {
      await savePrivacySettings({ contextLimitTokens: parsed })
    }
  }

  return (
    <div className="space-y-6">
      {/* Context Limit */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('settings:privacy.contextLimit')}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('settings:privacy.contextLimitDescription')}
        </p>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="space-y-2">
            <Label htmlFor="context-limit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('settings:privacy.contextLimit')}
            </Label>
            <Input
              id="context-limit"
              type="number"
              min="1000"
              step="1000"
              placeholder={t('settings:privacy.contextLimitPlaceholder')}
              value={contextLimitInput}
              onChange={(e) => handleContextLimitChange(e.target.value)}
              className="max-w-xs"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('settings:privacy.contextLimitHint')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
