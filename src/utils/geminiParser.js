const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

const SYSTEM_INSTRUCTION = `You are an expert academic syllabus parser. Analyze the provided syllabus text and extract ALL structured information.
Return ONLY valid JSON matching this exact schema:

{
  "courseName": "string - full course name with code, e.g. 'CIS 1910 - Introduction to Computer Science'",
  "courseCode": "string - just the code, e.g. 'CIS 1910'",
  "instructor": "string - professor/instructor name",
  "semester": "string - e.g. 'Fall 2025'",
  "description": "string - brief 1-2 sentence course description",
  "officeHours": "string - office hours if mentioned",
  "gradeBreakdown": [
    {
      "component": "string - e.g. 'Midterm Exam'",
      "weight": "number - percentage as integer, e.g. 25"
    }
  ],
  "assignments": [
    {
      "name": "string - assignment name",
      "type": "string - one of: 'assignment', 'quiz', 'exam', 'project', 'lab', 'reading', 'presentation', 'other'",
      "dueDate": "string - ISO date YYYY-MM-DD if available, otherwise null",
      "dueDateRaw": "string - the original date text from syllabus",
      "weight": "number - grade percentage if mentioned, otherwise null",
      "description": "string - brief description if available"
    }
  ],
  "lectureTopics": [
    {
      "week": "number - week number if available",
      "date": "string - ISO date YYYY-MM-DD if available, otherwise null",
      "dateRaw": "string - original date text",
      "topic": "string - lecture topic"
    }
  ],
  "importantDates": [
    {
      "date": "string - ISO date YYYY-MM-DD if available",
      "dateRaw": "string - original date text",
      "event": "string - what happens on this date",
      "type": "string - one of: 'exam', 'deadline', 'holiday', 'class_cancelled', 'other'"
    }
  ],
  "policies": {
    "latePolicy": "string - late submission policy if mentioned",
    "attendancePolicy": "string - attendance policy if mentioned",
    "academicIntegrity": "string - academic integrity notes if mentioned"
  }
}

Rules:
- Extract ALL dates you can find, even approximate ones
- If a year isn't specified, infer it from context (semester, other dates)
- For weekly schedules without specific dates, still include them in lectureTopics
- grade weights should be numbers (e.g. 25 not "25%")
- If information is not found, use null for optional fields or empty arrays
- Parse date ranges (e.g., "Week of Jan 15") as the first date
- Be thorough — do not skip any assignments, exams, or deadlines`;

/**
 * Extract structured course data from syllabus text using Gemini AI.
 *
 * @param {string} syllabusText - Raw text extracted from the syllabus PDF
 * @param {Function} onStatus - Optional status callback
 * @returns {Promise<Object>} Structured course data
 */
export async function extractCourseData(syllabusText, onStatus) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env');
  }

  onStatus?.('Sending to Gemini AI...');

  // Minify text to save tokens: replace consecutive whitespaces with a single space
  const minifiedText = syllabusText.replace(/\s+/g, ' ').trim();

  // Trim text to stay within free-tier limits (~30k chars should be safe)
  const trimmedText = minifiedText.length > 30000
    ? minifiedText.substring(0, 30000) + ' [... truncated]'
    : minifiedText;

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }]
    },
    contents: [
      {
        parts: [
          {
            text: `SYLLABUS TEXT: ${trimmedText}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      maxOutputTokens: 65536,
      response_mime_type: "application/json"
    },
  };

  const maxRetries = 5;
  let retryCount = 0;
  let response;
  
  while (retryCount <= maxRetries) {
    try {
      response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) break;

      const error = await response.json().catch(() => ({}));
      const message = error?.error?.message || `HTTP ${response.status}`;
      if (response.status === 429 && retryCount < maxRetries) {
        retryCount++;
        
        // Check if the API explicitly told us how long to wait
        let delayMs = Math.pow(2, retryCount) * 2000; // default exponential (4s, 8s, 16s, 32s...)
        const retryMatch = message.match(/retry in ([\d\.]+)s/i);
        
        if (retryMatch && retryMatch[1]) {
           // Parse the seconds, convert to ms, and add a small 1s buffer
           delayMs = (parseFloat(retryMatch[1]) * 1000) + 1000; 
        }
        
        onStatus?.(`Rate limited. Waiting ${Math.ceil(delayMs/1000)}s before retrying...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      throw new Error(`Gemini API error (${response.status}): ${message}`);
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        if (retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw new Error('Network error. Please check your internet connection.');
      }
      throw err;
    }
  }

    onStatus?.('Parsing AI response...');

    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error('Failed to parse response body as JSON');
    }

    // Gemini 2.5 (thinking models) may return multiple parts — get the last text part
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const textContent = parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .pop();

    if (!textContent) {
      throw new Error('Gemini returned an empty response. The syllabus may not contain extractable content.');
    }

    // Parse the JSON response directly
    let parsed;
    try {
      parsed = JSON.parse(textContent);
    } catch (parseErr) {
      console.error('Raw AI response:', textContent);
      throw new Error('Failed to parse AI response as JSON. Please try again.');
    }

    // Validate and normalize
    const result = normalizeResult(parsed);

    onStatus?.('Done!');
    return result;
}

/**
 * Normalize and validate the parsed result
 */
function normalizeResult(data) {
  return {
    courseName: data.courseName || 'Unknown Course',
    courseCode: data.courseCode || '',
    instructor: data.instructor || 'Not specified',
    semester: data.semester || '',
    description: data.description || '',
    officeHours: data.officeHours || '',
    gradeBreakdown: Array.isArray(data.gradeBreakdown)
      ? data.gradeBreakdown.map((g) => ({
          component: g.component || 'Unknown',
          weight: typeof g.weight === 'number' ? g.weight : parseFloat(g.weight) || 0,
        }))
      : [],
    assignments: Array.isArray(data.assignments)
      ? data.assignments.map((a) => ({
          name: a.name || 'Untitled',
          type: a.type || 'other',
          dueDate: a.dueDate || null,
          dueDateRaw: a.dueDateRaw || '',
          weight: a.weight != null ? Number(a.weight) : null,
          description: a.description || '',
        }))
      : [],
    lectureTopics: Array.isArray(data.lectureTopics)
      ? data.lectureTopics.map((l) => ({
          week: l.week || null,
          date: l.date || null,
          dateRaw: l.dateRaw || '',
          topic: l.topic || '',
        }))
      : [],
    importantDates: Array.isArray(data.importantDates)
      ? data.importantDates.map((d) => ({
          date: d.date || null,
          dateRaw: d.dateRaw || '',
          event: d.event || '',
          type: d.type || 'other',
        }))
      : [],
    policies: {
      latePolicy: data.policies?.latePolicy || '',
      attendancePolicy: data.policies?.attendancePolicy || '',
      academicIntegrity: data.policies?.academicIntegrity || '',
    },
  };
}
