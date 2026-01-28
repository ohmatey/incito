import { useAppContext } from '@/context/AppContext'
import { SettingsPage as SettingsPageComponent } from '@/components/SettingsPage'

export function SettingsPage() {
  const { folderPath, handleChangeFolder, featureFlags, updateFeatureFlags } = useAppContext()

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
