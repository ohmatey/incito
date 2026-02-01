import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type FeatureFlags } from '@/lib/store'
import { GeneralTab } from '@/components/settings/tabs/GeneralTab'
import { ModelConfigTab } from '@/components/settings/tabs/ModelConfigTab'
import { PrivacyTab } from '@/components/settings/tabs/PrivacyTab'
import { SystemTab } from '@/components/settings/tabs/SystemTab'

interface SettingsPageProps {
  folderPath: string
  onChangeFolder: () => void
  featureFlags: FeatureFlags
  onUpdateFeatureFlags: (flags: Partial<FeatureFlags>) => Promise<void>
}

export function SettingsPage({ folderPath, onChangeFolder, featureFlags, onUpdateFeatureFlags }: SettingsPageProps) {
  const { t } = useTranslation(['settings'])

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex h-14 items-center border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('settings:title')}</h1>
      </div>

      {/* Content with Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="general" className="flex h-full flex-col">
          <div className="border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
            <TabsList className="h-10 bg-transparent p-0 gap-4">
              <TabsTrigger
                value="general"
                className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-2 font-medium text-gray-500 transition-none data-[state=active]:border-primary-500 data-[state=active]:text-primary-600 data-[state=active]:shadow-none dark:text-gray-400 dark:data-[state=active]:text-primary-400"
              >
                {t('settings:tabs.general')}
              </TabsTrigger>
              <TabsTrigger
                value="modelConfig"
                className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-2 font-medium text-gray-500 transition-none data-[state=active]:border-primary-500 data-[state=active]:text-primary-600 data-[state=active]:shadow-none dark:text-gray-400 dark:data-[state=active]:text-primary-400"
              >
                {t('settings:tabs.modelConfig')}
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-2 font-medium text-gray-500 transition-none data-[state=active]:border-primary-500 data-[state=active]:text-primary-600 data-[state=active]:shadow-none dark:text-gray-400 dark:data-[state=active]:text-primary-400"
              >
                {t('settings:tabs.privacy')}
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-2 font-medium text-gray-500 transition-none data-[state=active]:border-primary-500 data-[state=active]:text-primary-600 data-[state=active]:shadow-none dark:text-gray-400 dark:data-[state=active]:text-primary-400"
              >
                {t('settings:tabs.system')}
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <div className="max-w-2xl">
                <TabsContent value="general" className="mt-0">
                  <GeneralTab folderPath={folderPath} onChangeFolder={onChangeFolder} />
                </TabsContent>
                <TabsContent value="modelConfig" className="mt-0">
                  <ModelConfigTab featureFlags={featureFlags} />
                </TabsContent>
                <TabsContent value="privacy" className="mt-0">
                  <PrivacyTab />
                </TabsContent>
                <TabsContent value="system" className="mt-0">
                  <SystemTab
                    featureFlags={featureFlags}
                    onUpdateFeatureFlags={onUpdateFeatureFlags}
                  />
                </TabsContent>
              </div>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  )
}
