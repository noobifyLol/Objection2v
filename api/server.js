// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

/* =======================
   PATH FIX FOR ES MODULES
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
   JUDGE ARGUMENT
======================= */
app.post("/api/judge-argument", async (req, res) => {
  const { prompt, argument } = req.body;

  if (!prompt || !argument) {
    return res.status(400).json({ error: "Missing input" });
  }

  try {
    const judgePrompt = `
You are Judge Gemini, an expert debate evaluator.

CASE:
${prompt}

ARGUMENT:
${argument}

Return a score (0-100) and structured feedback.
`;

    const verdictRaw = await safeGenerate("gemini-2.5-flash-lite", judgePrompt);
    const scoreMatch = verdictRaw.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;

    res.json({ verdict: verdictRaw, score });

  } catch (err) {
    console.error("Judge error:", err.message);

    const fallbackScore = Math.min(100, Math.max(60, argument.length / 5));
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
   SERVE REACT BUILD (CRA)
======================= */
app.use(express.static(path.join(__dirname, "build")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

/* =======================
   START SERVER (RENDER SAFE)
======================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);
