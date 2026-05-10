export function extractGeminiResponseText(json: unknown): string {
  const o = json as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
    }>
  }
  const parts = o.candidates?.[0]?.content?.parts
  if (!parts?.length) return ''
  return parts.map((p) => p.text ?? '').join('')
}

export async function* iterateGeminiSseTextDeltas(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let carry = ''
  let prevFull = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    carry += decoder.decode(value, { stream: true })

    while (true) {
      const m = carry.match(/\r?\n/)
      if (!m || m.index === undefined) break
      const rawLine = carry.slice(0, m.index)
      carry = carry.slice(m.index + m[0].length)
      const line = rawLine.trim()
      if (!line || line.startsWith(':')) continue

      const payload = line.startsWith('data: ') ? line.slice(6).trim() : line
      if (!payload || payload === '[DONE]') continue

      let json: unknown
      try {
        json = JSON.parse(payload)
      } catch {
        continue
      }

      const snap = extractGeminiResponseText(json)
      if (!snap) continue

      if (snap.startsWith(prevFull)) {
        const delta = snap.slice(prevFull.length)
        prevFull = snap
        if (delta) yield delta
      } else {
        prevFull = snap
        yield snap
      }
    }
  }
}

export async function* iterateGeminiLineJsonDeltas(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let carry = ''
  let prevFull = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    carry += decoder.decode(value, { stream: true })

    while (true) {
      const m = carry.match(/\r?\n/)
      if (!m || m.index === undefined) break
      const line = carry.slice(0, m.index).trim()
      carry = carry.slice(m.index + m[0].length)
      if (!line) continue

      let json: unknown
      try {
        json = JSON.parse(line)
      } catch {
        continue
      }

      const snap = extractGeminiResponseText(json)
      if (!snap) continue

      if (snap.startsWith(prevFull)) {
        const delta = snap.slice(prevFull.length)
        prevFull = snap
        if (delta) yield delta
      } else {
        prevFull = snap
        yield snap
      }
    }
  }
}
