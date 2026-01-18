import { useState, useEffect, useCallback } from 'react'
import type { Variable } from '@/types/prompt'
import { getDefaultValues } from '@/lib/interpolate'

interface UseVariableValuesOptions {
  variables: Variable[]
  promptPath: string | undefined
}

export function useVariableValues({ variables, promptPath }: UseVariableValuesOptions) {
  const [variableValues, setVariableValues] = useState<Record<string, unknown>>({})

  // Reset values when prompt changes
  useEffect(() => {
    if (promptPath) {
      setVariableValues(getDefaultValues(variables))
    } else {
      setVariableValues({})
    }
  }, [promptPath, variables])

  const handleValueChange = useCallback((key: string, value: unknown) => {
    setVariableValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetValues = useCallback(() => {
    setVariableValues(getDefaultValues(variables))
  }, [variables])

  return {
    variableValues,
    setVariableValues,
    handleValueChange,
    resetValues,
  }
}
