
// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MUST set your API key in .env
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY missing. Put GEMINI_API_KEY=your_key in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// Utility: get text safely and log metadata
function readResponseText(result) {
  try {
    if (!result || !result.response) return "";
    // Many SDK responses expose response.text() as a function returning the content
    if (typeof result.response.text === "function") {
      return result.response.text();
    }
    if (result.response.text) return result.response.text;
    // fallback: check top-level fields
    if (result.output && Array.isArray(result.output)) {
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
    return "";
  } catch (e) {
    console.error("readResponseText error:", e);
    return "";
  }
}

// Try generation and if result is empty or blocked, optionally retry with a softened prompt
async function generateWithRetry(model, prompt, opts = { retries: 1 }) {
  try {
    const result = await model.generateContent(prompt);
    // debug logs for Cloud Console correlation
    console.log("GENERATION RESULT METADATA:", {
      promptFeedback: result?.response?.promptFeedback,
      candidates: result?.response?.candidates?.length ?? 0,
    });

    let text = readResponseText(result);
    if (text && String(text).trim()) return { text: String(text).trim(), raw: result };

    // if empty, try a softened prompt once
    if (opts.retries > 0) {
      const softened = prompt
        .replace(/Judge Gemini|You are Judge Gemini/gi, "You are an experienced debate coach")
        .replace(/Evaluate with score out of 100, verdict, and constructive feedback/gi,
                 "Provide a helpful approximate score and practical feedback for the student.");
      console.log("Response empty — retrying with softened prompt...");
      const retryResult = await model.generateContent(softened);
      console.log("RETRY RESULT METADATA:", {
        promptFeedback: retryResult?.response?.promptFeedback,
        candidates: retryResult?.response?.candidates?.length ?? 0,
      });
      const retryText = readResponseText(retryResult);
      if (retryText && String(retryText).trim()) return { text: String(retryText).trim(), raw: retryResult };
    }

    // nothing produced
    return { text: "", raw: result };
  } catch (err) {
    // bubble up to caller
    throw err;
  }
}


// ====== Generate AI Case ======
app.post("/api/generate-prompt", async (req, res) => {
  try {
    // Accept a full prompt from the frontend (preferred) OR build one here as fallback
    const { prompt: incomingPrompt, currentRound = 1, lessonType = "normal" } = req.body;

    // prefer prompt from frontend so it can enforce rules/word counts
    const builtPrompt = incomingPrompt || `
Write ONE debate case scenario.

Rules:
- Start with "Your client..." or "The scenario..."
- Be realistic and debate-worthy
- No lists, no markdown, return plain text only
- Round: ${currentRound}, Mode: ${lessonType}

Return ONLY the scenario text.
`.trim();

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const { text, raw } = await generateWithRetry(model, builtPrompt, { retries: 1 });

    // Debugging: log promptFeedback if any — helps identify safety blocks
    if (raw?.response?.promptFeedback) {
      console.log("Prompt feedback:", JSON.stringify(raw.response.promptFeedback, null, 2));
    }

    if (!text) {
      // no useful content from the model; surface a helpful message so frontend can fallback
      return res.status(500).json({
        error: true,
        message: "Empty response from Gemini. Possible safety filter or trimmed output.",
      });
    }

    return res.json({ prompt: text });
  } catch (err) {
    console.error("Generate prompt error:", err);
    return res.status(500).json({
      error: true,
      message: err?.message || "Unknown error when generating prompt",
    });
  }
});


// ====== Judge Argument ======
app.post("/api/judge-argument", async (req, res) => {
  try {
    const { prompt, argument } = req.body;
    if (!prompt || !argument) return res.status(400).json({ error: "Missing prompt or argument" });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // Use "debate coach" wording to reduce safety blocks, but require exact output format
    const instruction = `
You are an experienced debate coach. Read the CASE and the ROOKIE LAWYER'S DEFENSE below.
CASE: ${prompt}

ROOKIE LAWYER'S DEFENSE:
${argument}

Provide an evaluation in this EXACT format (no extra text):
SCORE: [number from 0-100]
VERDICT: [In 2-3 sentences, explain whether the defense would likely succeed]
FEEDBACK: [In 2-3 sentences, concrete, constructive advice to improve the argument]

Keep the output concise and only in that format.
`.trim();

    const { text } = await generateWithRetry(model, instruction, { retries: 1 });

    if (!text) {
      return res.status(500).json({
        error: "Empty response from Gemini judge. Possibly blocked by safety.",
        fallback: {
          verdict: "SCORE: 75\nVERDICT: Decent argument with room to expand evidence and counterclaims.\nFEEDBACK: Add specific examples and address counterarguments directly.",
          score: 75
        }
      });
    }

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


// Simple test route
app.get("/test-gemini", async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent("Write one short sentence about justice.");
    const text = readResponseText(result);
    res.send(text || "No text returned");
  } catch (e) {
    console.error("test-gemini error:", e);
    res.status(500).send(e.message || String(e));
  }
});


app.listen(3000, () => console.log("Server running on port 3000"));
// End of server.js