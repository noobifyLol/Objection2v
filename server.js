import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini client using API key from environment variable
const apiKey = "AIzaSyAtkRw5rb5c185wTJ1vowS3f3QtxP23vKg";
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY not set in .env");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);

// Helper to extract text from Gemini response
function extractText(result) {
  try {
    if (result?.response && typeof result.response.text === "function") return result.response.text();
    if (result?.response?.text) return result.response.text;
    if (Array.isArray(result?.output)) {
      for (const out of result.output) {
        if (Array.isArray(out?.content)) {
          for (const c of out.content) {
            if (c?.type === "output_text" && c?.text) return c.text;
            if (typeof c === "string") return c;
            if (c?.text) return c.text;
          }
        }
      }
    }
    return JSON.stringify(result);
  } catch (e) {
    return String(result);
  }
}

// ========== Generate AI Case ==========
app.post("/api/generate-prompt", async (req, res) => {
  try {
    const { currentRound = 1, lessonType = "normal" } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `Generate a unique debate case for round ${currentRound} (${lessonType} mode). 
      Return ONLY the case description.`;

    const result = await model.generateContent(prompt);
    const text = extractText(result);

    res.json({ prompt: text });
  } catch (err) {
    console.error("Generate prompt error:", err);
    res.status(500).json({
      error: true,
      message: err?.message || "Unknown error",
      fallback: "Should social media companies be held accountable for misinformation?"
    });
  }
});

// ========== Judge Argument ==========
app.post("/api/judge-argument", async (req, res) => {
  try {
    const { prompt, argument } = req.body;
    if (!prompt || !argument) return res.status(400).json({ error: "Missing prompt or argument" });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const instruction = `You are Judge Gemini.
CASE: ${prompt}
ARGUMENT: ${argument}
Evaluate with score out of 100, verdict, and constructive feedback.
Format EXACTLY as:
SCORE: [number]
VERDICT: [2-3 sentences]
FEEDBACK: [2-3 sentences]`;

    const result = await model.generateContent(instruction);
    const text = extractText(result);

    const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 70;

    res.json({ verdict: text, score });
  } catch (error) {
    console.error("Judge argument error:", error);
    res.status(500).json({
      error: "Failed to judge argument",
      fallback: {
        verdict: "SCORE: 75\nVERDICT: Solid argument!\nFEEDBACK: Provide more examples next time.",
        score: 75
      }
    });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
