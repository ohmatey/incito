import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Play, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { Grader } from '@/types/grader'
import { isAssertionGrader } from '@/types/grader'
import { executeAssertionGrader } from '@/lib/grader-executor'

interface GraderPlaygroundProps {
  grader: Grader
}

interface TestResult {
  score: number
  passed: boolean
  reason?: string
  executionTimeMs: number
}

export function GraderPlayground({ grader }: GraderPlaygroundProps) {
  const { t } = useTranslation('graders')
  const isAssertion = isAssertionGrader(grader)

  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  async function handleRunTest() {
    if (!output.trim()) {
      toast.error('Please enter some output to test')
      return
    }

    setIsRunning(true)
    setResult(null)

    try {
      if (isAssertion) {
        // Run assertion locally
        const testResult = executeAssertionGrader(grader, output)
        setResult(testResult)
      } else {
        // For LLM judges, we need to call the backend
        const response = await fetch('http://localhost:3457/graders/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grader, input, output }),
        })

        if (!response.ok) {
          throw new Error('Failed to test grader')
        }

        const data = await response.json()
        setResult(data)
      }
    } catch (error) {
      toast.error(t('errors.testFailed'))
      console.error('Test grader error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Input (for LLM judges) */}
      {!isAssertion && (
        <div className="space-y-2">
          <Label>{t('playground.inputLabel')}</Label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('playground.inputPlaceholder')}
            rows={3}
            className="font-mono text-sm"
          />
        </div>
      )}

      {/* Output to evaluate */}
      <div className="space-y-2">
        <Label>{t('playground.outputLabel')}</Label>
        <Textarea
          value={output}
          onChange={(e) => setOutput(e.target.value)}
          placeholder={t('playground.outputPlaceholder')}
          rows={4}
          className="font-mono text-sm"
        />
      </div>

      {/* Run Button */}
      <Button
        onClick={handleRunTest}
        disabled={isRunning || !output.trim()}
        className="gap-2"
      >
        {isRunning ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {isRunning ? t('playground.running') : t('playground.runButton')}
      </Button>

      {/* Result */}
      {result && (
        <div className={`rounded-lg border p-4 ${
          result.passed
            ? 'border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-900/10'
            : 'border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/10'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {result.passed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
              <span className={`font-medium ${
                result.passed
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {result.passed ? t('playground.result.passed') : t('playground.result.failed')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {t('playground.result.score')}: {(result.score * 100).toFixed(0)}%
              </Badge>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {result.executionTimeMs}ms
              </span>
            </div>
          </div>
          {result.reason && (
            <p className={`text-sm ${
              result.passed
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {result.reason}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
