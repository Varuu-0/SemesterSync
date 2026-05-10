/**
 * Shared Gemini REST request tweaks for SemesterSync API routes.
 *
 * Gemini 2.5 models may run an internal “thinking” step before answering.
 * That improves hard reasoning tasks but adds latency and cost. For syllabus
 * extraction and chat, disabling it (`thinkingBudget: 0`) is usually faster and
 * still accurate enough.
 *
 * Override with env:
 *   GEMINI_THINKING_BUDGET=4096   — allow up to N thinking tokens
 *   GEMINI_THINKING_BUDGET=omit   — omit thinkingConfig (use model defaults)
 */
export function geminiThinkingGenerationSlice(): {
  thinkingConfig?: { thinkingBudget: number };
} {
  const raw = process.env.GEMINI_THINKING_BUDGET?.trim();
  if (raw === "omit") return {};
  if (raw === undefined || raw === "") {
    return { thinkingConfig: { thinkingBudget: 0 } };
  }
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) {
    return { thinkingConfig: { thinkingBudget: 0 } };
  }
  return { thinkingConfig: { thinkingBudget: n } };
}

/** Drop huge blank runs to shave tokens without losing paragraph breaks. */
export function compactSyllabusWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
}
