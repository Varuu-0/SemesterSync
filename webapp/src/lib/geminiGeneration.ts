export function geminiThinkingGenerationSlice(): {
  thinkingConfig?: { thinkingBudget: number }
} {
  const raw = process.env.GEMINI_THINKING_BUDGET?.trim()
  if (raw === 'omit') return {}
  if (raw === undefined || raw === '') {
    return { thinkingConfig: { thinkingBudget: 0 } }
  }
  const n = parseInt(raw, 10)
  if (Number.isNaN(n) || n < 0) {
    return { thinkingConfig: { thinkingBudget: 0 } }
  }
  return { thinkingConfig: { thinkingBudget: n } }
}

export function compactSyllabusWhitespace(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim()
}
