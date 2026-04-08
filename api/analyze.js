// /api/analyze.js  — Vercel Serverless Function
// Receives resume text from the frontend, calls Claude, returns structured JSON

export default async function handler(req, res) {
  // CORS headers (needed for browser fetch)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resumeText, filename } = req.body;

  if (!resumeText || resumeText.trim().length < 50) {
    return res.status(400).json({ error: 'Resume text is too short or empty.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in Vercel environment variables.' });
  }

  const prompt = `You are an expert ATS (Applicant Tracking System) resume analyzer. Analyze the following resume and return ONLY a valid JSON object — no markdown, no explanation, no extra text.

Resume filename: ${filename || 'resume.pdf'}

Resume text:
---
${resumeText.slice(0, 8000)}
---

Return this exact JSON structure:
{
  "title": "<Job Role> Resume",
  "score": <integer 0-100>,
  "breakdown": {
    "Skills": <integer 0-100>,
    "Experience": <integer 0-100>,
    "Projects": <integer 0-100>,
    "Education": <integer 0-100>
  },
  "skills": ["skill1", "skill2", ...],
  "missing": ["missing_skill1", "missing_skill2", ...],
  "jobs": [
    { "title": "Job Title", "company": "Company Name", "icon": "1-2 letter abbreviation", "match": <integer 0-100> },
    { "title": "Job Title", "company": "Company Name", "icon": "1-2 letter abbreviation", "match": <integer 0-100> },
    { "title": "Job Title", "company": "Company Name", "icon": "1-2 letter abbreviation", "match": <integer 0-100> },
    { "title": "Job Title", "company": "Company Name", "icon": "1-2 letter abbreviation", "match": <integer 0-100> }
  ],
  "suggestions": [
    "Specific actionable suggestion 1",
    "Specific actionable suggestion 2",
    "Specific actionable suggestion 3",
    "Specific actionable suggestion 4",
    "Specific actionable suggestion 5"
  ]
}

Rules:
- skills: list skills actually found in the resume (max 12)
- missing: list 4-6 important skills for the detected role that are NOT in the resume
- jobs: list 4 real job titles/companies that match this resume's profile, sorted by match % descending
- suggestions: 5 highly specific, actionable improvements based on the actual resume content
- score: holistic ATS score based on keyword density, quantified impact, formatting signals, and role fit
- Return ONLY the JSON. No backticks, no markdown, no extra words.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return res.status(502).json({ error: 'Claude API request failed.', detail: errText });
    }

    const data = await response.json();
    const rawText = data?.content?.[0]?.text || '';

    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON parse error. Raw response:', rawText);
      return res.status(500).json({ error: 'Claude returned invalid JSON.', raw: rawText });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error.', detail: err.message });
  }
}
