const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

const ROAST_PROMPT = `You are a witty, sarcastic AI that "roasts" a student's semester schedule. You're funny but not mean — think friendly comedic commentary. Use gaming/pop culture references, hyperbole, and dramatic language.

Given the following semester schedule data, write a SHORT, hilarious roast (3-5 sentences max). Be specific — reference actual course names, dates, and deadlines from the data. End with one genuine piece of encouragement.

Format: Just the roast text, nothing else. No quotes, no labels.

SCHEDULE DATA:
`;

/**
 * Generate a humorous AI roast of the student's semester
 */
export async function generateRoast(courses) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key not configured.');

  // Build a summary of the schedule
  const summary = courses.map((c) => {
    const assignments = (c.assignments || [])
      .map((a) => `  - ${a.name} (${a.type}) due ${a.dueDateRaw || a.dueDate || 'TBD'}${a.weight ? ` [${a.weight}%]` : ''}`)
      .join('\n');
    return `${c.courseName}:\n${assignments || '  No assignments listed'}`;
  }).join('\n\n');

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: ROAST_PROMPT + summary }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('Rate limited — try again in a moment.');
    throw new Error('Failed to generate roast.');
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const textContent = parts.filter((p) => p.text).map((p) => p.text).pop();
  
  return textContent || 'Your schedule is too powerful for me to roast. 🫡';
}
