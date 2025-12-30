import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

/* =======================
   PATH FIX
======================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =======================
   APP SETUP
======================= */
const app = express();
app.use(cors());
app.use(express.json());

/* =======================
   GEMINI SETUP
======================= */
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

async function generate(model, prompt) {
  if (!genAI) throw new Error("NO_API_KEY");
  const result = await genAI
    .getGenerativeModel({ model })
    .generateContent(prompt);

  const text = result?.response?.text?.();
  if (!text) throw new Error("EMPTY_RESPONSE");
  return text.trim();
}

/* =======================
   GENERATE CASE
======================= */
app.post("/api/generate-prompt", async (req, res) => {
  try {
    const { currentRound, lessonType } = req.body;

    const prompt = `Generate a unique debate case scenario for a debate practice program.

Round Information:
- Current Round: ${currentRound} of 3
- Lesson Type: ${lessonType === "rapid" ? "Rapid Rush (2 min per case, MUST be SHORT)" : "Normal Pace (4 min per case)"}

Topic Categories (choose ANY diverse topic):
- Civil Rights & Social Justice
- Healthcare & Public Health
- Environmental & Climate Issues
- Criminal Justice
- Education
- Economics & Labor
- Technology & Ethics
- Immigration & Citizenship
- International Relations
- Arts & Culture

Rules:
- Use a new, distinct client or subject name.
- Select a DIFFERENT topic category than previous rounds.
- Round ${
      currentRound === 1 ? "1: moderately challenging issue" :
      currentRound === 2 ? "2: complex issue with multiple perspectives" :
      "3: highly difficult systemic or moral dilemma"
    }.
${lessonType === "rapid" ? "CRITICAL: 15-35 words, 1-2 sentences only." : ""}

Case Requirements:
- Start with "Your client..." or "The scenario..."
- Debate-worthy, realistic, morally engaging.
- Return ONLY the final case description.
`;

    const text = await generate("gemini-2.5-flash-lite", prompt);
    res.json({ prompt: text });

  } catch (err) {
    res.status(500).json({
      prompt: "Your client faces discrimination caused by automated decision-making."
    });
  }
});

/* =======================
   JUDGE ARGUMENT
======================= */
app.post("/api/judge-argument", async (req, res) => {
  try {
    const { prompt, argument } = req.body;

    const judgePrompt =  `You are Judge Gemini presiding over a case involving social justice and marginalized communities.

CASE: ${prompt}

ROOKIE LAWYER'S DEFENSE ARGUMENT:
${argument}

As a judge committed to equity and justice, evaluate this defense argument carefully.

Consider:
1. Does the argument show empathy and understanding of marginalized perspectives?
2. Are there concrete examples or evidence cited?
3. Is the legal reasoning sound and persuasive?
4. Does it address systemic issues or just surface-level concerns?
5. If the prompt and arguenment is not about underrepresented communities or Tech-related just grade how you want to grade it grade it like a debate club agruement. 
Provide your evaluation in this EXACT format:

SCORE: [number from 0-100]
VERDICT: [In 2-3 sentences, explain your ruling on whether this defense would succeed]
FEEDBACK: [In 2-3 sentences, give constructive advice on how to strengthen this argument for defending marginalized clients]

Be encouraging but honest. This is a learning experience for a rookie lawyer.`;

    const verdict = await generate("gemini-2.5-flash-lite", judgePrompt);

    const scoreMatch = verdict.match(/Score:\s*(\d+)/i);
    const score = scoreMatch ? Number(scoreMatch[1]) : 75;

    res.json({ verdict, score });

  } catch {
    res.json({
      verdict: "Fallback scoring used.",
      score: Math.min(100, argument.length / 5)
    });
  }
});

/* =======================
   STATIC FRONTEND
======================= */
app.use(express.static(path.join(__dirname, "build")));

app.get("/*", (_req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

/* =======================
   START SERVER
======================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Backend running"));

