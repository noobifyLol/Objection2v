// api/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

/* =======================
   PATH FIX FOR ESM
======================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =======================
   APP SETUP
======================= */
const app = express();

// Configure CORS to allow requests from your frontend
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost origins
    if (origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

/* =======================
   GEMINI SETUP
======================= */
const apiKey = process.env.GEMINI_API_KEY;
console.log("🔑 API Key loaded:", apiKey ? `Yes (${apiKey.substring(0, 10)}...)` : "❌ NO API KEY FOUND");

if (!apiKey) {
  console.error("⚠️  GEMINI_API_KEY is not set in .env file!");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

async function generate(model, prompt) {
  if (!genAI) {
    console.error("❌ GoogleGenerativeAI not initialized - check your API key");
    throw new Error("NO_API_KEY");
  }
  
  console.log(`🤖 Calling Gemini model: ${model}`);
  
  try {
    const result = await genAI
      .getGenerativeModel({ model })
      .generateContent(prompt);

    const text = result?.response?.text?.();
    if (!text) {
      console.error("❌ Empty response from Gemini");
      throw new Error("EMPTY_RESPONSE");
    }
    
    console.log("✅ Gemini response received");
    return text.trim();
  } catch (error) {
    console.error("❌ Gemini API Error:", error.message);
    throw error;
  }
}

/* =======================
   GENERATE CASE
======================= */
// Test endpoint to verify API is working
app.get("/api/test", (req, res) => {
  res.json({ 
    status: "ok",
    hasApiKey: !!apiKey,
    geminiInitialized: !!genAI
  });
});

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

    const text = await generate("gemini-pro", prompt);
    res.json({ prompt: text });
  } catch (err) {
    console.error("Generate prompt error:", err);
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

    const judgePrompt = `You are Judge Gemini presiding over a case involving social justice and marginalized communities.

CASE: ${prompt}

ROOKIE LAWYER'S DEFENSE ARGUMENT:
${argument}

As a judge committed to equity and justice, evaluate this defense argument carefully.

Consider:
1. Does the argument show empathy and understanding of marginalized perspectives?
2. Are there concrete examples or evidence cited?
3. Is the legal reasoning sound and persuasive?
4. Does it address systemic issues or just surface-level concerns?
5. If the prompt and argument is not about underrepresented communities or Tech-related, grade it like a debate club argument.

Provide your evaluation in this EXACT format:

SCORE: [number from 0-100]
VERDICT: [In 2-3 sentences, explain your ruling on whether this defense would succeed]
FEEDBACK: [In 2-3 sentences, give constructive advice on how to strengthen this argument for defending marginalized clients]

Be encouraging but honest. This is a learning experience for a rookie lawyer.`;

    const verdict = await generate("gemini-pro", judgePrompt);
    const scoreMatch = verdict.match(/Score:\s*(\d+)/i);
    const score = scoreMatch ? Number(scoreMatch[1]) : 75;

    res.json({ verdict, score });
  } catch (err) {
    console.error("Judge argument error:", err);
    const fallbackScore = Math.min(100, (req.body.argument?.length || 0) / 5);
    res.json({
      verdict: "AI judging unavailable. Fallback scoring used based on argument length.",
      score: fallbackScore
    });
  }
});

/* =======================
   SERVE FRONTEND
======================= */
const buildPath = path.join(__dirname, "../build");
app.use(express.static(buildPath));

// Catch-all route for Express v5 - serve React app for any non-API route
app.use((req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

/* =======================
   START SERVER
======================= */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});