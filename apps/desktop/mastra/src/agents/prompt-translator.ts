import { generateText } from 'ai'
import { getModel } from './prompt-generator'
import type { AIConfig } from '../types'

const TRANSLATION_SYSTEM_PROMPT = `You are a specialized translator for prompt templates used with coding LLMs. Your task is to translate prompts from one language to English (or another target language) while preserving technical accuracy.

CRITICAL RULES:
1. PRESERVE ALL HANDLEBARS SYNTAX EXACTLY:
   - Variables: {{variable_name}} must remain unchanged
   - Conditionals: {{#if variable}}...{{/if}} must remain unchanged
   - Comparisons: {{#if (eq variable "value")}}...{{/if}} must remain unchanged
   - All double curly brace syntax must be kept as-is

2. PRESERVE TECHNICAL TERMS:
   - API names, function names, class names should NOT be translated
   - Code keywords (function, class, const, let, etc.) should NOT be translated
   - Common programming terms (API, HTTP, JSON, SQL, etc.) should NOT be translated
   - Keep technical terms in their original form

3. PRESERVE FORMATTING:
   - Code blocks (\`\`\`) must remain unchanged
   - Inline code (\`) must remain unchanged
   - Bullet points, numbered lists, headings
   - Markdown formatting (bold, italic, etc.)

4. TRANSLATION STYLE:
   - Use technical, professional English suitable for coding LLMs
   - Be precise and unambiguous
   - Maintain the original intent and structure
   - Keep instructions clear and actionable

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "translated": "The translated text with all formatting preserved",
  "confidence": "high" | "medium" | "low",
  "preservedTerms": ["list", "of", "technical", "terms", "kept", "as-is"]
}

Confidence levels:
- "high": Clear translation, technical context preserved
- "medium": Some ambiguity, but translation is reasonable
- "low": Significant uncertainty, manual review recommended

RESPOND WITH ONLY THE JSON OBJECT, no additional text or markdown formatting.`

export interface TranslatePromptInput {
  text: string
  sourceLanguage: string  // 'th', 'ja', 'ko', etc.
  targetLanguage: string  // 'en', 'es', 'de', etc.
  context?: 'coding' | 'general'  // Default: 'coding'
}

export interface TranslationOutput {
  translated: string
  confidence: 'high' | 'medium' | 'low'
  preservedTerms: string[]
}

export async function translate(
  input: TranslatePromptInput,
  config: AIConfig
): Promise<string> {
  const model = getModel(config)

  const languageNames: Record<string, string> = {
    'en': 'English',
    'th': 'Thai',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    'vi': 'Vietnamese',
    'id': 'Indonesian',
    'es': 'Spanish',
    'pt': 'Portuguese',
    'fr': 'French',
    'de': 'German'
  }

  const sourceName = languageNames[input.sourceLanguage] || input.sourceLanguage
  const targetName = languageNames[input.targetLanguage] || input.targetLanguage
  const contextType = input.context || 'coding'

  const userMessage = `Translate the following ${contextType} prompt template from ${sourceName} to ${targetName}.

SOURCE TEXT:
---
${input.text}
---

Remember:
- Keep ALL {{variable}} syntax exactly as-is
- Keep ALL code blocks and technical terms unchanged
- Translate ONLY the natural language portions
- Output ONLY the JSON object with translated text, confidence, and preservedTerms`

  const { text } = await generateText({
    model,
    system: TRANSLATION_SYSTEM_PROMPT,
    prompt: userMessage,
  })

  return text
}

// Language name lookup for display
export function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    'en': 'English',
    'th': 'Thai',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    'vi': 'Vietnamese',
    'id': 'Indonesian',
    'es': 'Spanish',
    'pt': 'Portuguese',
    'fr': 'French',
    'de': 'German'
  }
  return names[code] || code
}
