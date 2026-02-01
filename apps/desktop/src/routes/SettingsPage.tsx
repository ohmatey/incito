import { useAppContext } from '@/context/AppContext'
import { useFeatureFlags } from '@/context/FeatureFlagsContext'
import { SettingsPage as SettingsPageComponent } from '@/components/SettingsPage'

export function SettingsPage() {
  const { folderPath, handleChangeFolder } = useAppContext()
  const { featureFlags, updateFeatureFlags } = useFeatureFlags()

  // folderPath should always exist when this route renders (protected by RootLayout)
  return (
    <SettingsPageComponent
      folderPath={folderPath || ''}
      onChangeFolder={handleChangeFolder}
      featureFlags={featureFlags}
      onUpdateFeatureFlags={updateFeatureFlags}
    />
  )
}
