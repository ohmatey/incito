// Starter templates bundled into the app as raw markdown strings (Vite ?raw).
// Inlining as strings avoids Tauri resource-bundling and its fs-scope / dev-vs-prod
// path pitfalls — writing a starter is the same writeTextFile the app already uses
// for any prompt. Each starter has rich frontmatter (label/placeholder/preview/
// description on every variable) so the form itself teaches good prompting by example.
import rewriteEmail from './rewrite-email.md?raw'
import summarizeDocument from './summarize-document.md?raw'
import meetingNotesToActions from './meeting-notes-to-actions.md?raw'
import replyToMessage from './reply-to-message.md?raw'
import explainSimply from './explain-simply.md?raw'
import feedbackSynthesis from './feedback-synthesis.md?raw'
import brainstormIdeas from './brainstorm-ideas.md?raw'
import polishWriting from './polish-writing.md?raw'

export interface StarterTemplate {
  /** Destination file name written into the user's prompts folder. */
  fileName: string
  /** Raw markdown (frontmatter + template body). */
  content: string
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  { fileName: 'rewrite-email.md', content: rewriteEmail },
  { fileName: 'summarize-document.md', content: summarizeDocument },
  { fileName: 'meeting-notes-to-actions.md', content: meetingNotesToActions },
  { fileName: 'reply-to-message.md', content: replyToMessage },
  { fileName: 'explain-simply.md', content: explainSimply },
  { fileName: 'feedback-synthesis.md', content: feedbackSynthesis },
  { fileName: 'brainstorm-ideas.md', content: brainstormIdeas },
  { fileName: 'polish-writing.md', content: polishWriting },
]
