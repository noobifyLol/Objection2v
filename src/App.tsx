import React, { useState, useEffect, useCallback } from 'react';
import { Scale, Clock, Gavel, Sparkles, Wand2, Trophy, Zap, Star, Disc } from 'lucide-react';
import './App.css';
import { playSound } from "./sound";

const FALLBACK_CASES = {
  rapid: [
    "Your client, a gig worker, was fired by an algorithm without explanation. Defend their right to transparency.",
    "The scenario: A school district uses facial recognition that misidentifies minority students. Argue for policy change.",
    "Your client faces housing discrimination from AI screening tools. Build a case for fair housing protections."
  ],
  normal: [
    "Your client, Maya Chen, is a software engineer who was denied a promotion after an AI hiring tool flagged her resume. The algorithm was trained on historical data that favored male candidates. She believes the system perpetuates gender bias in tech leadership. Defend her right to fair evaluation and argue for algorithmic transparency in hiring.",
    "The scenario involves a rural school district in Appalachia that lacks high-speed internet access, preventing students from participating in online learning opportunities. Meanwhile, neighboring affluent districts offer advanced coding courses and tech certifications. Advocate for equitable technology infrastructure as a civil right.",
    "Your client, James Rodriguez, is a freelance content creator whose posts about immigration rights were shadowbanned by a major social media platform. The algorithm flagged his content as 'controversial' without human review. Defend his free speech rights and argue for platform accountability in content moderation."
  ]
};

const CASE_GENERATION_PROMPT = (currentRound: number, lessonType: string) => `Generate a unique debate case scenario for a debate practice program.

Round Information:
- Current Round: ${currentRound} of 3
- Lesson Type: ${lessonType === 'rapid' ? 'Rapid Rush (2 min per case, MUST be SHORT)' : 'Normal Pace (4 min per case)'}

Rules:
- Use a new, distinct client or subject name that has not appeared previously.
- Match the difficulty level:
  • Round 1 → moderately challenging issue
  • Round 2 → complex issue with nuance
  • Round 3 → highly difficult systemic issue
- The scenario must be completely different from previous cases.
${lessonType === 'rapid' ? 'CRITICAL: For Rapid mode, the prompt MUST be between 15-35 words ONLY.' : ''}

Case Requirements:
- Start with "Your client..." or "The scenario..."
- For rapid mode: 1-2 sentences (15-35 words). For normal: 2-4 sentences.
- Clearly describe the core issue and why it matters.
- Debate-worthy and realistic.
Return ONLY the final case description text (no lists or extra formatting).`;

interface ToastContent {
  type: string;
  title: string;
  message: string;
}

type GameState = 'input' | 'playing' | 'judging' | 'results' | 'end';

export default function App() {
  const [fadeClass, setFadeClass] = useState("fade-in");
  const [started, setStarted] = useState(false);
  const [gameState, setGameState] = useState<GameState>('input');
  const [currentRound, setCurrentRound] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [argument, setArgument] = useState('');
  const [timeLeft, setTimeLeft] = useState(240);
  const [isGenerating, setIsGenerating] = useState(false);
  const [verdict, setVerdict] = useState('');
  const [scores, setScores] = useState<number[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; content: ToastContent | null }>({ open: false, content: null });
  const [showTutorial, setShowTutorial] = useState(false);
  const [lessonType, setLessonType] = useState('normal');

  const showToast = (type: string, title: string, message: string, duration = 4000) => {
    setToast({ open: true, content: { type, title, message } });
    setTimeout(() => setToast({ open: false, content: null }), duration);
  };

  useEffect(() => setFadeClass("fade-in"), []);

  useEffect(() => {
    if (!started) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [started]);

  const handleSubmitArgument = useCallback(async () => {
    new Audio("audio/button_click.ogg").play().catch(err => console.log('Audio play failed:', err));
    setGameState('judging');

    const submittedArgument = argument && argument.trim() ? argument : '[NO ARGUMENT SUBMITTED]';
    if (!argument.trim()) showToast('info', 'Auto-submitted', 'Time expired — submitting an empty argument.');

    try {
      const resp = await fetch('http://localhost:3000/api/judge-argument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, argument: submittedArgument })
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error((errBody as any)?.message || `Judge endpoint returned ${resp.status}`);
      }

      const data = await resp.json();
      const judgeText = (data.verdict || String(data)).trim();

      let verdictText = '';
      let feedback = '';
      let score = 75;

      const scoreMatch = judgeText.match(/SCORE:\s*(\d+)/i);
      const verdictMatch = judgeText.match(/VERDICT:\s*([^\n]+(?:\n[^\n]+)*?)(?=\nFEEDBACK:|$)/i);
      const feedbackMatch = judgeText.match(/FEEDBACK:\s*([\s\S]*?)$/i);

      if (scoreMatch) score = parseInt(scoreMatch[1]);
      if (verdictMatch) verdictText = verdictMatch[1].trim();
      if (feedbackMatch) feedback = feedbackMatch[1].trim();

      const fullResponse = `${verdictText}\n\n${feedback}`;

      if (score >= 80) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      setVerdict(fullResponse);
      setScores(prev => [...prev, score]);
      setTotalScore(prev => prev + score);
      setGameState('results');

      const feedbackType = score >= 85 ? 'success' : score >= 70 ? 'info' : 'warning';
      const feedbackTitle = score >= 85 ? '⭐ Excellent Defense!' : score >= 70 ? '💪 Solid Argument' : '📚 Keep Learning';
      const feedbackMsg = score >= 85 ? 'Your defense strongly advocates for justice!' : 
                          score >= 70 ? 'Good reasoning, but consider adding more specific examples.' :
                          'Focus on concrete evidence and empathy for your client.';

      showToast(feedbackType, feedbackTitle, feedbackMsg);

    } catch (error) {
      console.error('❌ JUDGE ERROR:', error);
      const argumentLength = submittedArgument.length;
      const hasEvidence = /example|evidence|study|research|data|statistic/i.test(submittedArgument);
      const hasEmpathy = /perspective|impact|affect|feel|experience|harm|benefit/i.test(submittedArgument);
      
      let score = 50;
      if (argumentLength > 200) score += 15;
      if (argumentLength > 400) score += 10;
      if (hasEvidence) score += 15;
      if (hasEmpathy) score += 10;
      
      const verdictText = argumentLength < 100 
        ? "Your argument is brief but shows initial reasoning. More development would strengthen your case."
        : "Your argument demonstrates understanding of the issue and presents a coherent position.";
      
      const feedback = hasEvidence 
        ? "You included supporting evidence, which strengthens your argument. Consider adding more specific examples and addressing potential counterarguments."
        : "To improve, include concrete examples, cite specific evidence, and demonstrate deeper empathy for affected parties.";
      
      const fullResponse = `${verdictText}\n\n${feedback}`;
      
      setVerdict(fullResponse);
      setScores(prev => [...prev, score]);
      setTotalScore(prev => prev + score);
      setGameState('results');
      
      showToast('info', 'Basic scoring', 'AI judging unavailable, using basic scoring algorithm.');
    }
  }, [argument, prompt]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && timeLeft === 0) {
      handleSubmitArgument();
    }
  }, [timeLeft, gameState, handleSubmitArgument]);

  useEffect(() => {
    const bgMusic = new Audio("audio/playmis.ogg");
    bgMusic.loop = true;
    bgMusic.volume = 0.5;

    if (gameState === 'playing') {
      bgMusic.play().catch(err => console.log('Could not autoplay music:', err));
    }

    return () => {
      bgMusic.pause();
      bgMusic.currentTime = 0;
    };
  }, [gameState]);

  const startLesson1 = () => {
    const clickSound = new Audio("audio/button_click.ogg");
    clickSound.volume = 0.3; 
    clickSound.play().catch(err => console.log('Audio play failed:', err));
    setLessonType('normal');
    setFadeClass("fade-out");
    setTimeout(() => {
      setStarted(true);
      setShowTutorial(true);
    }, 800);
  };

  const startLesson2 = () => {
    const clickSound = new Audio("audio/button_click.ogg");
    clickSound.volume = 0.3; 
    clickSound.play().catch(err => console.log('Audio play failed:', err));
    setLessonType('rapid');
    setFadeClass("fade-out");
    setTimeout(() => {
      setStarted(true);
      setShowTutorial(true);
    }, 800);
  };

  const generateAIPrompt = async () => {
    new Audio("audio/button_click.ogg").play().catch(err => console.log('Audio play failed:', err));
    setIsGenerating(true);
    setCustomPrompt('');

    try {
      const timerDuration = lessonType === 'rapid' ? 120 : 240;
      const fullPrompt = CASE_GENERATION_PROMPT(currentRound, lessonType);

      const resp = await fetch('http://localhost:3000/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, currentRound, lessonType })
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error((errBody as any)?.message || `generate endpoint returned ${resp.status}`);
      }

      const data = await resp.json();
      const generatedPrompt = (data.prompt || '').trim();

      if (!generatedPrompt) throw new Error('Empty response from backend');

      setPrompt(generatedPrompt);
      setGameState('playing');
      setTimeLeft(timerDuration);
      setArgument('');
      setIsGenerating(false);

    } catch (error) {
      console.error('❌ CASE GENERATION ERROR:', error);

      const caseType = lessonType === 'rapid' ? 'rapid' : 'normal';
      const fallbackCase = FALLBACK_CASES[caseType as keyof typeof FALLBACK_CASES][currentRound - 1];

      setPrompt(fallbackCase);
      setGameState('playing');
      setTimeLeft(lessonType === 'rapid' ? 120 : 240);
      setArgument('');
      setIsGenerating(false);

      showToast('info', 'Using preset case', 'AI generation unavailable, using a preset case instead.');
    }
  };

  const useCustomPrompt = () => {
    new Audio("audio/button_click.ogg").play().catch(err => console.log('Audio play failed:', err));
    if (!customPrompt.trim()) {
      showToast('warning', 'Input required', 'Please enter a case scenario first!');
      return;
    }
    const timerDuration = lessonType === 'rapid' ? 120 : 240;
    setPrompt(customPrompt);
    setGameState('playing');
    setTimeLeft(timerDuration);
    setArgument('');
  };

  const nextRound = () => {
    new Audio("audio/button_click.ogg").play().catch(err => console.log('Audio play failed:', err));
    if (currentRound < 3) {
      setCurrentRound(currentRound + 1);
      setGameState('input');
      setCustomPrompt('');
      setPrompt('');
      setArgument('');
    } else {
      setGameState('end');
    }
  };

  const restartGame = () => {
    new Audio("audio/button_click.ogg").play().catch(err => console.log('Audio play failed:', err));
    setStarted(false);
    setGameState('input');
    setCurrentRound(1);
    setPrompt('');
    setCustomPrompt('');
    setArgument('');
    setTimeLeft(240);
    setVerdict('');
    setScores([]);
    setTotalScore(0);
    setFadeClass('fade-in');
  };

  useEffect(() => {
    if (gameState === "end") {
      playSound("audio/winner.ogg");
      playSound("audio/congrats.ogg"); 
    }
  }, [gameState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const openTutorialModal = () => {
    setShowTutorial(true);
  };

  const closeTutorialModal = () => {
    setShowTutorial(false);
  };

  const timerDuration = lessonType === 'rapid' ? 120 : 240;
  const progressPercent = Math.max(0, Math.min(100, Math.round((timeLeft / timerDuration) * 100)));

  return (
    <>
      <div id="full-screen">
        <div className="bg-orbs" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
          <span className="orb orb-4" />
        </div>
        <div className="diagonal-ribbon" aria-hidden="true" />
        <div className="stage-spotlight" aria-hidden="true" />
        <div className="floating-ornaments" aria-hidden="true">
          <span className="ornament o-1" />
          <span className="ornament o-2" />
          <span className="ornament o-3" />
          <span className="ornament o-4" />
          <span className="ornament o-5" />
        </div>
        {!started && (
          <main id="main-wrapper" className={fadeClass}>
            <div id="top">
              <Scale size={80} />
              <h1>Objection!</h1>
              <Gavel size={80} />
            </div>

            <p id="description">
              You're a rookie lawyer/ debater defending clients or your position on arguement from marginalized backgrounds.
              Face 3 cases involving digital privacy, algorithmic bias, and social justice or any other debate Problem.
            </p>
            <div id="start-buttonwrapper">
              <button id="start-btn" onClick={() => {
                const audio = new Audio("/audio/button_click.mp4");
                audio.volume = 0.4;
                audio.play();
                startLesson1();
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "center", justifyContent: "center" }}>
                  Normal Pace <span style={{ fontSize: "18px" }}>(4 min per case)</span>
                </div>
              </button>
              <button id="start-btn" onClick={() => {
                const audio = new Audio("/audio/button_click.mp4");
                audio.volume = 0.4;
                audio.play();
                startLesson2();
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "center", justifyContent: "center" }}>
                  <Disc size={24} />
                  <span>Rapid Rush </span>
                  <span style={{ fontSize: "14px" }}>(2 min per case)</span>
                </div>
              </button>
            </div>
          </main>
        )}

        {started && (
          <main id="main2-wrapper">
            {gameState === 'input' && (
              <div>
                <h2 style={{fontSize: '36px', textAlign: 'center', marginBottom: '30px'}}>
                  Case {currentRound} of 3
                </h2>
                
                <div className="input-section">
                  <input
                    type="text"
                    placeholder="Enter your own case scenario or generate one with AI..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                  />
                  
                  <div className="button-group">
                    <button className="btn btn-primary" onClick={useCustomPrompt}>
                      Use My Case
                    </button>
                    <button className="btn btn-primary" onClick={generateAIPrompt} disabled={isGenerating}>
                      <Wand2 size={20} />
                      {isGenerating ? 'Generating Case...' : 'Generate AI Case'}
                    </button>
                  </div>
                </div>

                <div className="info-cards-grid">
                  <div className="info-card">
                    <div className="card-icon">⚖️</div>
                    <h3>Build Your Case</h3>
                    <p>Choose to create your own scenario or let AI generate a debate topic for you.</p>
                  </div>
                  <div className="info-card">
                    <div className="card-icon">💡</div>
                    <h3>Think Strategically</h3>
                    <p>Develop a compelling argument with evidence and empathy for your position.</p>
                  </div>
                  <div className="info-card">
                    <div className="card-icon">🎯</div>
                    <h3>Get Evaluated</h3>
                    <p>Judge Gemini will score your defense and give constructive feedback.</p>
                  </div>
                </div>
              </div>
            )}

            {gameState === 'playing' && (
              <div className="playingdiv">
                <div style={{width: '100%'}}>
                  <div className="round-header">
                    <div style={{fontSize: '24px', fontWeight: 'bold'}}>Case {currentRound} of 3</div>
                    <div className={`timer ${timeLeft < 30 ? 'warning' : ''}`}>
                      <Clock size={32} style={{display: 'inline', marginRight: '10px'}} />
                      {formatTime(timeLeft)}
                    </div>
                  </div>

                  <div className="prompt-box" style={lessonType === 'rapid' ? {fontSize: '18px', padding: '20px'} : {}}>
                    <strong>⚖️ THE CASE:</strong><br/><br/>
                    {prompt}
                  </div>

                  <div className="playing-extra" style={{textAlign: 'center'}}>
                    <div className="progress-wrap">
                      <div className="progress-bar" aria-hidden="true">
                        <div className="progress-fill" style={{width: `${progressPercent}%`}} />
                      </div>
                    </div>
                    <div style={{marginTop: 8, color: 'rgba(255,255,255,0.8)'}}>Time remaining: {formatTime(timeLeft)}</div>
                  </div>

                  <div className="input-section2">
                    <h3 style={{fontSize: '24px', marginBottom: '15px', textAlign: 'center'}}>Your Defense Argument <span style ={{color : '#ffd43b'}}>(Take a Side on the ARGUMENT):</span></h3>
                    <textarea
                      value={argument}
                      onChange={(e) => setArgument(e.target.value)}
                      placeholder="Write your argument defending your client or position here to sway the judges. . .  "
                    />
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', width: '85%', margin: '15px auto 0'}}>
                      <span style={{fontSize: '16px', color: '#a0aec0'}}>{argument.length} characters</span>
                      <button 
                        className="btn btn-success" 
                        onClick={handleSubmitArgument}
                        disabled={!argument.trim()}
                      >
                        Submit Defense
                      </button>
                    </div>
                  </div>

                  <div className="gameplay-tips">
                    <h4 style={{marginTop: 0, fontSize: '16px', marginBottom: '12px'}}>💡 Quick Tips</h4>
                    <ul style={{margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: '1.6'}}>
                      <li>Use concrete examples to support your argument</li>
                      <li>Address counterarguments proactively</li>
                      <li>Show empathy for affected parties</li>
                      <li>Keep language clear and persuasive</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {gameState === 'judging' && (
              <div style={{textAlign: 'center', paddingTop: '100px'}}>
                <div style={{position: 'relative', display: 'inline-block'}}>
                  <Gavel size={80} style={{margin: '0 auto 30px', animation: 'bounce 1s infinite', color: '#ffd43b'}} />
                  <Sparkles size={40} style={{position: 'absolute', top: 0, right: -20, color: '#667eea', animation: 'pulse 2s infinite'}} />
                </div>
                <h2 style={{fontSize: '36px', marginBottom: '30px'}}>⚖️ Judge Gemini is Deliberating...</h2>
                <div className="loading">
                  <div className="spinner"></div>
                  <span>✨ Analyzing your defense with AI wisdom...</span>
                </div>
              </div>
            )}

            {gameState === 'results' && (
              <div>
                {showConfetti && (
                  <div className="confetti-container">
                    {[...Array(50)].map((_, i) => (
                      <div key={i} className="confetti" style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 3}s`,
                        backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#ffd43b', '#51cf66'][Math.floor(Math.random() * 5)]
                      }}></div>
                    ))}
                  </div>
                )}
                
                <div style={{textAlign: 'center', marginBottom: '20px'}}>
                  <Trophy size={60} color="#ffd43b" style={{animation: 'bounce 2s infinite'}} />
                </div>
                
                <h2 style={{fontSize: '36px', textAlign: 'center', marginBottom: '30px'}}>
                  ⚖️ Case {currentRound} Verdict
                </h2>
                
                <div className="verdict-box">
                  <div style={{fontWeight: 800, marginBottom: 10}}>Judge Gemini's Decision</div>
                  {verdict}
                </div>

                <div className="button-group">
                  {currentRound < 3 ? (
                    <button className="btn btn-primary" onClick={nextRound}>
                      <Zap size={20} />
                      Next Case →
                    </button>
                  ) : (
                    <button className="btn btn-success" onClick={nextRound}>
                      <Star size={20} />
                      See Final Results 
                    </button>
                  )}
                </div>
              </div>
            )}

            {gameState === 'end' && (
              <div>
                <div style={{textAlign: 'center', marginBottom: '30px'}}>
                  <Trophy size={100} color="#ffd43b" style={{animation: 'bounce 2s infinite'}} />
                  <Star size={50} style={{position: 'absolute', top: '100px', left: 'calc(50% - 80px)', color: '#667eea', animation: 'pulse 2s infinite'}} />
                  <Star size={50} style={{position: 'absolute', top: '100px', right: 'calc(50% - 80px)', color: '#f093fb', animation: 'pulse 2s infinite 0.5s'}} />
                </div>
                
                <h2 style={{fontSize: '48px', textAlign: 'center', marginBottom: '20px'}}>
                  🎉 Trial Complete! 🎉
                </h2>
                
                <div className="final-score">
                  {Math.round(totalScore / 3)}/100
                </div>
                <p style={{textAlign: 'center', fontSize: '24px', marginBottom: '40px', color: 'rgba(255,255,255,0.9)'}}>
                  {Math.round(totalScore / 3) >= 90 ? '🏆 JUSTICE CHAMPION!' : 
                   Math.round(totalScore / 3) >= 75 ? '⭐ RISING ADVOCATE!' :
                   Math.round(totalScore / 3) >= 60 ? '💪 DEDICATED DEFENDER!' :
                   '📚 LEARNING LAWYER!'}
                </p>

                <div className="score-grid">
                  {scores.map((score, i) => (
                    <div key={i} className="score-card">
                      <div className="label">Case {i + 1}</div>
                      <div className="value">{score}</div>
                      <div style={{fontSize: '14px', marginTop: '10px'}}>
                        {score >= 90 ? '🌟' : score >= 75 ? '✨' : score >= 60 ? '💫' : '⭐'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="button-group">
                  <button className="btn btn-primary" onClick={restartGame}>
                    <Sparkles size={20} />
                    New Trial
                  </button>
                </div>
              </div>
            )}
          </main>
        )}

        <button className="info-button" onClick={openTutorialModal}>
          i
        </button>

        {showTutorial && (
          <div className="tutorial-modal">
            <div className="tutorial-card" onClick={(e) => e.stopPropagation()}>
              <h3>⚖️ How to Defend Justice</h3>
              <p>Welcome, Rookie Lawyer/Debater! You'll handle three cases involving tech injustice or any debate topic, such as national identity or social issues.</p>
              <ul>
                <li><strong>Generate a case</strong> about digital privacy, algorithmic bias, online harassment, or tech access, or any other debate topic</li>
                <li><strong>Build your defense</strong> with empathy, evidence, and legal reasoning (2 min per case)</li>
                <li><strong>Get feedback</strong> from Judge Gemini on how to strengthen your advocacy</li>
              </ul>
              <p><strong>Tips:</strong> Cite specific examples, address systemic issues, and always center your client's perspective!</p>
              <div className="tutorial-actions">
                <button className="btn btn-primary" onClick={closeTutorialModal}>Ready to Defend!</button>
              </div>
            </div>
          </div>
        )}

        {toast.open && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: toast.content?.type === 'success' ? '#51cf66' : toast.content?.type === 'warning' ? '#ffd43b' : '#5b82f7',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            maxWidth: '300px'
          }}>
            <div style={{fontWeight: 'bold', marginBottom: '5px'}}>{toast.content?.title}</div>
            <div>{toast.content?.message}</div>
            <button onClick={() => setToast({ open: false, content: null })} style={{
              marginTop: '10px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}>Close</button>
          </div>
        )}
      </div>
    </>
  );
}