// api/api.js
/* ======================
   API BASE SETUP
====================== */
const API_BASE =
  process.env.REACT_APP_API_URL || '';

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Request failed');
  }

  return res.json();
}

/* ======================
   PUBLIC API FUNCTIONS
====================== */

export function generateCase(currentRound, lessonType) {
  return post('/api/generate-prompt', {
    currentRound,
    lessonType
  });
}

export function judgeArgument(prompt, argument) {
  return post('/api/judge-argument', {
    prompt,
    argument
  });
}
