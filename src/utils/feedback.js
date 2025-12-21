// Small helper to transform raw verdict text (or AI response) into structured feedback
export function parseVerdict(raw) {
  // raw can be an object or a string. Try to extract a score and message.
  if (!raw) return { score: 0, title: 'No verdict', message: 'No feedback available.' };

  if (typeof raw === 'object') {
    const score = raw.score ?? 0;
    const title = raw.title ?? (score ? `Score: ${score}` : 'Verdict');
    // build a concise message: prefer `feedback`, then `message`, then assemble highlights
    let message = raw.feedback ?? raw.message ?? '';
    if (!message && Array.isArray(raw.highlights) && raw.highlights.length) {
      message = 'Highlights: ' + raw.highlights.join(' • ');
    }
    if (!message) message = JSON.stringify(raw);

    return { score, title, message, raw };
  }

  // If string, attempt to find a number score
  const scoreMatch = raw.match(/(SCORE:\s*)(\d{1,3})/i) || raw.match(/(\b)(\d{1,3})(\/100)/);
  const score = scoreMatch ? Number(scoreMatch[2]) : null;

  // pick a short title
  const title = score != null ? `Score: ${score}/100` : 'Judge Feedback';

  // Provide an actionable tip if possible by extracting 'FEEDBACK:' section
  const feedbackMatch = raw.match(/FEEDBACK:\s*(.*)/is);
  const message = feedbackMatch ? feedbackMatch[1].trim() : raw;

  return { score: score ?? 0, title, message };
}
