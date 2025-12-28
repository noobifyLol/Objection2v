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
  console.error("❌ Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

/* =======================
   SAFE RESPONSE READER
======================= */
function extractText(result) {
  try {
    const textFn = result?.response?.text;
    const text = typeof textFn === "function" ? textFn() : "";
    return text?.trim() || "";
  } catch (err) {
    console.error("extractText error:", err);
    return "";
  }
}

/* =======================
   SAFE GENERATE
======================= */
async function safeGenerate(modelName, prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);

    console.log("Prompt feedback:", result?.response?.promptFeedback || "none");

    const text = extractText(result);

    if (!text) throw new Error("EMPTY_OR_BLOCKED_RESPONSE");

    return text;
  } catch (err) {
    console.error(`safeGenerate error for model ${modelName}:`, err);
    throw err;
  }
}

/* =======================
   GENERATE CASE (EXPANDED TOPICS)
======================= */
app.post("/api/generate-prompt", async (req, res) => {
  try {
    const { currentRound, lessonType } = req.body;

    const prompt = `
Generate a unique debate case scenario for a debate practice program.

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
`.trim();

    const text = await safeGenerate("gemini-2.5-flash-lite", prompt);

    res.json({ prompt: text });
  } catch (err) {
    console.error("Generate error:", err.message);
    res.status(500).json({
      error: true,
      fallback: { prompt: "Your client is accused of mishandling confidential information at work..." },
    });
  }
});

/* =======================
   JUDGE ARGUMENT (DETAILED & EXPANDED)
======================= */
app.post("/api/judge-argument", async (req, res) => {
  try {
    const { prompt, argument } = req.body;

    if (!prompt || !argument) {
      return res.status(400).json({ error: "Missing input" });
    }

    // Construct the detailed judgment prompt
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

    // Try to get AI judgment
    const verdictRaw = await safeGenerate("gemini-2.5-flash-lite", judgePrompt);
    console.log("✅ Raw detailed verdict received");

    // Extract score
    const scoreMatch = verdictRaw.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;

    // Return the full detailed response
    res.status(200).json({
      verdict: verdictRaw,
      score
    });

  } catch (err) {
    console.error("❌ Judge endpoint error:", err);

    // Calculate detailed fallback score
    const argumentLength = argument.length;
    const hasEvidence = /example|evidence|study|research|data|statistic|according to|research shows/i.test(argument);
    const hasEmpathy = /perspective|impact|affect|feel|experience|harm|benefit|suffer|struggle|vulnerable/i.test(argument);
    const hasCounterargument = /however|although|while|some may argue|critics|opponents|on the other hand/i.test(argument);
    const hasStructure = /first|second|finally|furthermore|additionally|in conclusion|therefore/i.test(argument);
    
    let reasoningScore = 10;
    let evidenceScore = 10;
    let empathyScore = 10;
    let rhetoricsScore = 10;
    
    // Reasoning score
    if (argumentLength > 300) reasoningScore += 8;
    if (argumentLength > 500) reasoningScore += 7;
    
    // Evidence score
    if (hasEvidence) evidenceScore += 10;
    if ((argument.match(/example|evidence|study/gi) || []).length >= 2) evidenceScore += 5;
    
    // Empathy score
    if (hasEmpathy) empathyScore += 10;
    if ((argument.match(/impact|affect|harm|benefit/gi) || []).length >= 2) empathyScore += 5;
    
    // Rhetoric score
    if (hasStructure) rhetoricsScore += 8;
    if (hasCounterargument) rhetoricsScore += 7;
    
    const fallbackScore = reasoningScore + evidenceScore + empathyScore + rhetoricsScore;

    const detailedFallback = `SCORE: ${fallbackScore}

VERDICT: Your argument demonstrates ${argumentLength > 400 ? 'substantial' : 'initial'} understanding of the issue and presents a ${hasEvidence ? 'supported' : 'basic'} position. ${hasEmpathy ? 'You show awareness of human impact.' : 'Consider emphasizing the human element more.'} ${hasStructure ? 'Your organization helps the argument flow logically.' : 'Stronger organization would improve clarity.'}

DETAILED ANALYSIS:

Legal/Ethical Reasoning (${reasoningScore}/25): ${argumentLength > 300 ? 'You develop your reasoning with adequate depth and show understanding of the core principles involved.' : 'Your reasoning shows promise but would benefit from deeper exploration of ethical or legal frameworks. Consider how established principles apply to this case.'}

Evidence & Support (${evidenceScore}/25): ${hasEvidence ? 'You include supporting evidence which strengthens your claims. To improve further, cite specific sources, statistics, or expert testimony that directly supports each major point.' : 'Your argument would be significantly stronger with concrete evidence, examples, or data. General statements need specific support to be persuasive.'}

Empathy & Impact (${empathyScore}/25): ${hasEmpathy ? 'You demonstrate awareness of how this issue affects real people. Consider exploring multiple perspectives to show even deeper understanding of the stakes involved.' : 'Focus more on the human element—who is affected by this issue and how? Showing empathy and understanding of real-world impact makes arguments more compelling.'}

Rhetoric & Persuasion (${rhetoricsScore}/25): ${hasStructure ? 'Your argument has logical structure which helps your points land effectively.' : 'Organize your thoughts more clearly with transitions and a logical flow.'} ${hasCounterargument ? 'Addressing counterarguments shows sophistication.' : 'Anticipating and addressing opposing views would strengthen your persuasiveness.'}

SPECIFIC FEEDBACK: ${!hasEvidence ? 'Start by adding at least 2-3 concrete examples or pieces of evidence. ' : ''}${!hasEmpathy ? 'Connect your points to real human experiences and consequences. ' : ''}${!hasCounterargument ? 'Address potential objections to show you understand the complexity of the issue. ' : ''}${argumentLength < 200 ? 'Expand your argument with more depth and detail.' : 'Continue developing your analytical skills and evidence integration.'}

STRENGTHS:
${argumentLength > 300 ? '- Comprehensive treatment of the topic' : '- Clear communication of your main point'}
${hasEvidence ? '- Inclusion of supporting evidence or examples' : '- Demonstrates basic understanding of the issue'}
${hasEmpathy ? '- Awareness of human impact and consequences' : '- Engagement with the ethical dimensions'}

AREAS FOR GROWTH:
${!hasEvidence ? '- Add more concrete evidence, data, or specific examples' : '- Cite more authoritative sources and expert testimony'}
${!hasStructure ? '- Use clearer organizational structure and transitions' : '- Develop more nuanced sub-arguments'}
${!hasCounterargument ? '- Address and refute potential counterarguments' : '- Engage with more complex aspects of the issue'}`;

    // Return detailed fallback with 200 status
    res.status(200).json({
      verdict: detailedFallback,
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
    const text = await safeGenerate("gemini-2.5-flash-lite", "Write one short sentence about justice.");
    res.send(text);
  } catch {
    res.status(500).send("Gemini unavailable");
  }
});

/* =======================
   START SERVER
======================= */
app.listen(3000, () => console.log("✅ Server running on http://localhost:3000"));