import { describe, it, expect } from 'vitest'
import { STARTER_TEMPLATES } from '../index'
import { parsePromptFile } from '@/lib/parser'
import { getPreviewValues } from '@/lib/interpolate'
import { tokenizeTemplate } from '@/components/preview/PromptPreview'

describe('starter templates', () => {
  it('ships a non-trivial set with unique file names', () => {
    expect(STARTER_TEMPLATES.length).toBeGreaterThanOrEqual(6)
    const names = STARTER_TEMPLATES.map((s) => s.fileName)
    expect(new Set(names).size).toBe(names.length)
    for (const name of names) expect(name).toMatch(/^[a-z0-9-]+\.md$/)
  })

  for (const starter of STARTER_TEMPLATES) {
    describe(starter.fileName, () => {
      const prompt = parsePromptFile(starter.content, starter.fileName, `/tmp/${starter.fileName}`)

      it('parses as a valid prompt', () => {
        expect(prompt.isValid).toBe(true)
        expect(prompt.errors).toHaveLength(0)
        expect(prompt.name.trim().length).toBeGreaterThan(0)
        expect(prompt.description.trim().length).toBeGreaterThan(0)
        expect(prompt.variables.length).toBeGreaterThan(0)
      })

      it('gives every variable a label (the schema is the lesson)', () => {
        for (const v of prompt.variables) {
          expect(v.label, `${v.key} needs a label`).toBeTruthy()
        }
      })

      it('provides a preview value for every variable so use-mode seeds a filled example', () => {
        const preview = getPreviewValues(prompt.variables)
        for (const v of prompt.variables) {
          expect(preview[v.key], `${v.key} needs a preview or default`).not.toBeUndefined()
        }
      })

      it('only references variables it declares', () => {
        const declared = new Set(prompt.variables.map((v) => v.key))
        // Use the app's own tokenizer so the check matches real rendering behavior.
        const referenced = tokenizeTemplate(prompt.template)
          .filter((tok): tok is Extract<typeof tok, { key: string }> => 'key' in tok)
          .map((tok) => tok.key.replace(/_array$/, '')) // {{key}}_array is an each-helper alias
        for (const key of referenced) {
          expect(declared.has(key), `template references undeclared {{${key}}}`).toBe(true)
        }
      })
    })
  }
})
