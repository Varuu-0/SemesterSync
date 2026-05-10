const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

/**
 * Send a chat message to Gemini with course context
 */
export async function sendChatMessage(message, courses, chatHistory = []) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key not configured.');

  const courseSummary = courses.map((c) => {
    const items = [
      ...(c.assignments || []).map((a) => `${a.name} (${a.type}) due ${a.dueDate || a.dueDateRaw || 'TBD'}${a.weight ? ` [${a.weight}%]` : ''}`),
      ...(c.importantDates || []).map((d) => `${d.event} on ${d.date || d.dateRaw || 'TBD'} (${d.type})`),
    ].join('\n  - ');
    return `${c.courseName} (${c.courseCode || ''}):\n  - ${items || 'No items'}`;
  }).join('\n\n');

  const systemPrompt = `You are SemesterSync AI, a helpful academic assistant. You have access to the student's semester schedule data below. Answer questions concisely (2-4 sentences). Be specific, referencing actual course names and dates. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.

STUDENT'S SCHEDULE:
${courseSummary || 'No courses uploaded yet.'}`;

  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'I have your schedule loaded. How can I help?' }] },
    ...chatHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('Rate limited — try again in a moment.');
    throw new Error('Failed to get response.');
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const textContent = parts.filter((p) => p.text).map((p) => p.text).pop();
  
  return textContent || 'Sorry, I couldn\'t process that.';
}

export const SUGGESTED_PROMPTS = [
  'What should I focus on this week?',
  'When is my busiest week?',
  'Summarize all my deadlines',
  'What exams do I have coming up?',
  'How can I prepare for my heaviest week?',
];
