import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { MultiProviderSettings } from '@/components/settings/MultiProviderSettings'
import { TranslationSettings } from '@/components/translation/TranslationSettings'
import { DefaultModelSelector } from '@/components/settings/DefaultModelSelector'
import {
  getProviderConfigs,
  getModelDefaults,
  saveModelDefaults,
  type ProviderConfig,
  type ModelDefaults,
} from '@/lib/store'
import type { FeatureFlags } from '@/lib/store'

interface ModelConfigTabProps {
  featureFlags: FeatureFlags
}

export function ModelConfigTab({ featureFlags }: ModelConfigTabProps) {
  const { t } = useTranslation(['settings', 'translation'])
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [modelDefaults, setModelDefaults] = useState<ModelDefaults>({
    defaultGeneratorConfigId: null,
    defaultJudgeConfigId: null,
  })

  const loadData = useCallback(async () => {
    const [providersResult, defaultsResult] = await Promise.all([
      getProviderConfigs(),
      getModelDefaults(),
    ])

    if (providersResult.ok) {
      setProviders(providersResult.data.configs)
    }
    if (defaultsResult.ok) {
      setModelDefaults(defaultsResult.data)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleGeneratorChange = useCallback(async (configId: string | null) => {
    setModelDefaults((prev) => ({ ...prev, defaultGeneratorConfigId: configId }))
    await saveModelDefaults({ defaultGeneratorConfigId: configId })
  }, [])

  const handleJudgeChange = useCallback(async (configId: string | null) => {
    setModelDefaults((prev) => ({ ...prev, defaultJudgeConfigId: configId }))
    await saveModelDefaults({ defaultJudgeConfigId: configId })
  }, [])

  return (
    <div className="space-y-6">
      {/* AI Providers */}
      <MultiProviderSettings />

      {/* Default Models */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('settings:modelDefaults.title')}
        </h3>

        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          {/* Default Generator */}
          <DefaultModelSelector
            label={t('settings:modelDefaults.generator')}
            description={t('settings:modelDefaults.generatorDescription')}
            value={modelDefaults.defaultGeneratorConfigId}
            onChange={handleGeneratorChange}
            providers={providers}
          />

          {/* Default Judge */}
          <DefaultModelSelector
            label={t('settings:modelDefaults.judge')}
            description={t('settings:modelDefaults.judgeDescription')}
            value={modelDefaults.defaultJudgeConfigId}
            onChange={handleJudgeChange}
            providers={providers}
          />
        </div>
      </div>

      {/* Translation Settings - only show when translations feature is enabled */}
      {featureFlags.translationsEnabled && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('translation:settings.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('translation:settings.description')}
          </p>
          <TranslationSettings />
        </div>
      )}
    </div>
  )
}
