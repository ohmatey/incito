// ============================================================================
// Run Feedback Types
// ============================================================================

/**
 * Stored feedback for a run
 */
export interface RunFeedback {
  id: string
  runId: string
  rating?: number
  passFail?: 'pass' | 'fail'
  notes?: string
  tags?: string[]
  /** Time spent reviewing in milliseconds */
  timeSpentMs?: number
  reviewedAt: string
  createdAt: string
  updatedAt: string
}

/**
 * Form data for submitting feedback
 */
export interface FeedbackFormData {
  rating?: number
  passFail?: 'pass' | 'fail'
  notes?: string
  tags?: string[]
}

/**
 * Stats for feedback across runs
 */
export interface FeedbackStats {
  totalRuns: number
  reviewedRuns: number
  passedRuns: number
  failedRuns: number
  averageRating?: number
  topTags: { tag: string; count: number }[]
}

/**
 * Check if feedback has any data
 */
export function hasFeedbackData(data: FeedbackFormData): boolean {
  return (
    data.rating !== undefined ||
    data.passFail !== undefined ||
    (data.notes !== undefined && data.notes.trim() !== '') ||
    (data.tags !== undefined && data.tags.length > 0)
  )
}

/**
 * Check if run has been reviewed (has feedback)
 */
export function isRunReviewed(feedback: RunFeedback | null | undefined): boolean {
  return feedback !== null && feedback !== undefined
}
