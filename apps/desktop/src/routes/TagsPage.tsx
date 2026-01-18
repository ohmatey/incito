import { useAppContext } from '@/context/AppContext'
import { TagsPage as TagsPageComponent } from '@/components/TagsPage'

export function TagsPage() {
  const {
    promptManager,
    tagManager,
    handleCreateTag,
    handleUpdateTag,
    handleDeleteTag,
  } = useAppContext()

  return (
    <TagsPageComponent
      tags={tagManager.tags}
      prompts={promptManager.prompts}
      onCreateTag={handleCreateTag}
      onUpdateTag={handleUpdateTag}
      onDeleteTag={handleDeleteTag}
    />
  )
}
