// api/analyze.js — Vercel Serverless Function

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var body = req.body || {};
  var resumeText = body.resumeText || '';
  var filename   = body.filename   || 'resume';

  if (resumeText.trim().length < 50) {
    return res.status(400).json({ error: 'Resume text too short. Could not extract enough content.' });
  }

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'API key not configured. Go to Vercel → Settings → Environment Variables and add ANTHROPIC_API_KEY.'
    });
  }

  var prompt = 'You are an expert ATS resume analyzer. Analyze the resume below and return ONLY a valid JSON object. No markdown, no backticks, no explanation — raw JSON only.\n\n'
    + 'Resume: ' + filename + '\n\n'
    + resumeText.slice(0, 8000)
    + '\n\nReturn exactly this structure:\n'
    + '{\n'
    + '  "title": "<Role> Resume",\n'
    + '  "score": <0-100>,\n'
    + '  "breakdown": { "Skills": <0-100>, "Experience": <0-100>, "Projects": <0-100>, "Education": <0-100> },\n'
    + '  "skills": ["skill1", "skill2", ...],\n'
    + '  "missing": ["gap1", "gap2", ...],\n'
    + '  "jobs": [\n'
    + '    { "title": "Job Title", "company": "Company", "icon": "AB", "match": <0-100> },\n'
    + '    { "title": "Job Title", "company": "Company", "icon": "AB", "match": <0-100> },\n'
    + '    { "title": "Job Title", "company": "Company", "icon": "AB", "match": <0-100> },\n'
    + '    { "title": "Job Title", "company": "Company", "icon": "AB", "match": <0-100> }\n'
    + '  ],\n'
    + '  "suggestions": ["tip1", "tip2", "tip3", "tip4", "tip5"]\n'
    + '}\n\n'
    + 'Rules: skills = up to 12 found in resume. missing = 4-6 important role skills NOT in resume. jobs = 4 real companies sorted by match desc. suggestions = 5 specific actionable tips based on this resume. Return raw JSON only.';

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
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
      var errText = await response.text();
      console.error('Anthropic error:', response.status, errText);
      return res.status(502).json({ error: 'Claude API error (' + response.status + '). Check API key and billing at console.anthropic.com.' });
    }

    var data = await response.json();
    var raw = ((data.content || [])[0] || {}).text || '';
    var cleaned = raw.replace(/```json|```/g, '').trim();

    var parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch(e) {
      console.error('JSON parse error. Raw:', raw.slice(0, 500));
      return res.status(500).json({ error: 'AI returned malformed response. Please try again.' });
    }

    return res.status(200).json(parsed);

  } catch(err) {
    console.error('Server error:', err.message);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
