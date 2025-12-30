
// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* =======================
   ENV + API SETUP
======================= */
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ GEMINI_API_KEY missing — Gemini routes will fail");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/* =======================
   SAFE RESPONSE READER
======================= */
function extractText(result) {
  try {
    const textFn = result?.response?.text;
    return typeof textFn === "function" ? textFn().trim() : "";
  } catch {
    return "";
  }
}

/* =======================
   SAFE GENERATE
======================= */
async function safeGenerate(modelName, prompt) {
  if (!genAI) throw new Error("GEMINI_NOT_CONFIGURED");

  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);

  const text = extractText(result);
  if (!text) throw new Error("EMPTY_OR_BLOCKED_RESPONSE");

  return text;
}

/* =======================
   GENERATE CASE (UNCHANGED TEMPLATE)
======================= */
app.post("/api/generate-prompt", async (req, res) => {
  try {
    const { currentRound, lessonType } = req.body;

    const prompt = `Generate a unique debate case scenario for a debate practice program.

Round Information:
- Current Round: ${currentRound} of 3
- Lesson Type: ${lessonType === "rapid" ? "Rapid Rush (2 min per case, MUST be SHORT)" : "Normal Pace (4 min per case)"}

Topic Categories (choose ANY diverse topic):
- Civil Rights & Social Justice (discrimination, voting rights, free speech, privacy)
- Healthcare & Public Health (access to care, medical ethics, insurance, mental health)
- Environmental & Climate Issues (sustainability, pollution, conservation, climate policy)
- Criminal Justice (sentencing reform, policing, rehabilitation, wrongful conviction)
- Education (access, equity, curriculum, student rights, funding)
- Economics & Labor (worker rights, wage disputes, unions, corporate responsibility)
- Technology & Ethics (AI bias, data privacy, surveillance, platform regulation)
- Immigration & Citizenship (asylum, deportation, pathways to citizenship)
- International Relations (human rights violations, trade disputes, conflict resolution)
- Arts & Culture (censorship, cultural appropriation, intellectual property)

Rules:
- Use a new, distinct client or subject name that has not appeared previously.
- Select a DIFFERENT topic category than previous rounds.
- Round ${
      currentRound === 1 ? "1: moderately challenging issue" : 
      currentRound === 2 ? "2: complex issue with multiple perspectives" : 
      "3: highly difficult systemic or moral dilemma"
    }.
- Scenario must be completely different from previous cases.
${lessonType === "rapid" ? "CRITICAL: 15-35 words, 1-2 sentences only." : ""}

Case Requirements:
- Start with "Your client..." or "The scenario..."
- For rapid: 1-2 sentences (15-35 words); for normal: 2-4 sentences (40-80 words).
- Clearly describe the core issue, stakes, and why it matters.
- Debate-worthy, realistic, and morally engaging.
- Include specific details that make the case feel real.

Return ONLY the final case description.
`; // ← exactly your text

    const text = await safeGenerate("gemini-2.5-flash-lite", prompt);
    res.json({ prompt: text });

  } catch (err) {
    console.error("Generate error:", err.message);
    res.status(500).json({
      error: true,
      fallback: {
        prompt: "Your client is accused of mishandling confidential information at work..."
      }
    });
  }
});

/* =======================
   JUDGE ARGUMENT (UNCHANGED TEMPLATE)
======================= */
app.post("/api/judge-argument", async (req, res) => {
  const { prompt, argument } = req.body;

  if (!prompt || !argument) {
    return res.status(400).json({ error: "Missing input" });
  }

  try {
    const judgePrompt = `
You are Judge Gemini, an expert debate evaluator with expertise in rhetoric, ethics, and argumentation.

CASE:
${prompt}

ARGUMENT TO EVALUATE:
${argument}

Evaluate this argument comprehensively across these criteria:

1. LEGAL/ETHICAL REASONING (0-25 points)
   - Strength of legal or ethical framework
   - Understanding of relevant principles
   - Application of precedents or moral philosophy

2. EVIDENCE & SUPPORT (0-25 points)
   - Quality and relevance of evidence
   - Use of examples, statistics, or expert testimony
   - Credibility of sources

3. EMPATHY & IMPACT ANALYSIS (0-25 points)
   - Understanding of affected parties' perspectives
   - Recognition of real-world consequences
   - Emotional intelligence and compassion

4. RHETORIC & PERSUASION (0-25 points)
   - Clarity and organization of argument
   - Persuasive language and techniques
   - Anticipation of counterarguments

Return your evaluation EXACTLY in this format:

SCORE: [0-100]

VERDICT: [3-4 sentences summarizing overall performance and argument quality]

DETAILED ANALYSIS:

Legal/Ethical Reasoning ([X]/25): [2-3 sentences analyzing the strength of their legal or ethical framework, what worked well, and what could be improved]

Evidence & Support ([X]/25): [2-3 sentences evaluating their use of evidence, examples, and supporting material]

Empathy & Impact ([X]/25): [2-3 sentences assessing their understanding of human impact and affected parties' perspectives]

Rhetoric & Persuasion ([X]/25): [2-3 sentences reviewing their persuasive techniques, clarity, and argumentation structure]

SPECIFIC FEEDBACK: [3-4 sentences with concrete, actionable advice on how to improve this specific argument. Be constructive but honest.]

STRENGTHS: [List 2-3 specific things they did well]

AREAS FOR GROWTH: [List 2-3 specific areas where they can improve]
`;

    const verdictRaw = await safeGenerate("gemini-2.5-flash-lite", judgePrompt);

    const scoreMatch = verdictRaw.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;

    res.json({ verdict: verdictRaw, score });

  } catch (err) {
    console.error("Judge error:", err.message);

    // ✅ argument IS IN SCOPE HERE
    const argumentLength = argument.length;
    const fallbackScore = Math.min(100, Math.max(60, argumentLength / 5));

    res.json({
      verdict: "Fallback evaluation used due to AI error.",
      score: fallbackScore,
      usingFallback: true
    });
  }
});

/* =======================
   HEALTH CHECK
======================= */
app.get("/test-gemini", async (_req, res) => {
  try {
    const text = await safeGenerate(
      "gemini-2.5-flash-lite",
      "Write one short sentence about justice."
    );
    res.send(text);
  } catch {
    res.status(500).send("Gemini unavailable");
  }
});

/* =======================
   START SERVER (RENDER SAFE)
======================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);


