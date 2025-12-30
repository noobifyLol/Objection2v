import { useState, useEffect, useCallback } from 'react';
import { Scale, Clock, Gavel, Sparkles, Wand2, Trophy, Zap, Star, Disc } from 'lucide-react';
import './App.css';

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

// API Functions
const API_BASE = process.env.REACT_APP_API_URL || '';

async function post(path: string, body: any): Promise<any> {
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

function generateCase(currentRound: number, lessonType: string): Promise<any> {
  return post('/api/generate-prompt', {
    currentRound,
    lessonType
  });
}

function judgeArgument(prompt: string, argument: string): Promise<any> {
  return post('/api/judge-argument', {
    prompt,
    argument
  });
}

// Sound utility
const playSound = (src: string) => {
  const audio = new Audio(src);
  audio.volume = 0.3;
  audio.play().catch(() => {});
};

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
    playSound("audio/button_click.ogg");
    setGameState('judging');

    const submittedArgument = argument && argument.trim() ? argument : '[NO ARGUMENT SUBMITTED]';

    if (!argument.trim()) {
      showToast('info', 'Auto-submitted', 'Time expired — submitting an empty argument.');
    }

    try {
      const data = await judgeArgument(prompt, submittedArgument);

      const score = data.score ?? 75;
      const verdictText = data.verdict ?? 'No feedback returned.';

      if (score >= 80) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      setVerdict(verdictText);
      setScores(prev => [...prev, score]);
      setTotalScore(prev => prev + score);
      setGameState('results');

      showToast(
        score >= 85 ? 'success' : score >= 70 ? 'info' : 'warning',
        score >= 85 ? '⭐ Excellent Defense!' : score >= 70 ? '💪 Solid Argument' : '📚 Keep Learning',
        score >= 85
          ? 'Your defense strongly advocates for justice!'
          : score >= 70
          ? 'Good reasoning, but add more examples.'
          : 'Try using clearer evidence and empathy.'
      );

    } catch (err) {
      console.error(err);

      const basicScore = Math.min(100, submittedArgument.length / 5);

      setVerdict(
        "AI judging unavailable.\n\nYour argument was evaluated using a basic scoring system."
      );
      setScores(prev => [...prev, basicScore]);
      setTotalScore(prev => prev + basicScore);
      setGameState('results');

      showToast('info', 'Basic scoring', 'AI judge unavailable.');
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
    playSound("audio/button_click.ogg");
    setLessonType('normal');
    setFadeClass("fade-out");
    setTimeout(() => {
      setStarted(true);
      setShowTutorial(true);
    }, 800);
  };

  const startLesson2 = () => {
    playSound("audio/button_click.ogg");
    setLessonType('rapid');
    setFadeClass("fade-out");
    setTimeout(() => {
      setStarted(true);
      setShowTutorial(true);
    }, 800);
  };

  const generateAIPrompt = async () => {
    playSound("audio/button_click.ogg");
    setIsGenerating(true);
    setCustomPrompt('');

    try {
      const timerDuration = lessonType === 'rapid' ? 120 : 240;

      const data = await generateCase(currentRound, lessonType);
      const generatedPrompt = data.prompt?.trim();

      if (!generatedPrompt) throw new Error('Empty prompt');

      setPrompt(generatedPrompt);
      setGameState('playing');
      setTimeLeft(timerDuration);
      setArgument('');
    } catch (err) {
      console.error(err);

      const fallback = FALLBACK_CASES[lessonType as keyof typeof FALLBACK_CASES][currentRound - 1];

      setPrompt(fallback);
      setGameState('playing');
      setTimeLeft(lessonType === 'rapid' ? 120 : 240);
      setArgument('');

      showToast('info', 'Using preset case', 'AI unavailable, using fallback.');
    } finally {
      setIsGenerating(false);
    }
  };

  const useCustomPrompt = () => {
    playSound("audio/button_click.ogg");
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
    playSound("audio/button_click.ogg");
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
    playSound("audio/button_click.ogg");
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
              You're a rookie lawyer/debater defending clients from marginalized backgrounds.
              Face 3 cases involving digital privacy, algorithmic bias, and social justice or any other debate problem.
            </p>

            <div id="start-buttonwrapper">
              <button id="start-btn" onClick={startLesson1}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "center", justifyContent: "center" }}>
                  Normal Pace <span style={{ fontSize: "18px" }}>(4 min per case)</span>
                </div>
              </button>
              <button id="start-btn" onClick={startLesson2}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "center", justifyContent: "center" }}>
                  <Disc size={24} />
                  <span>Rapid Rush</span>
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
                    <h3 style={{fontSize: '24px', marginBottom: '15px', textAlign: 'center'}}>
                      Your Defense Argument <span style={{color: '#ffd43b'}}>(Take a Side on the ARGUMENT):</span>
                    </h3>
                    <textarea
                      value={argument}
                      onChange={(e) => setArgument(e.target.value)}
                      placeholder="Write your argument defending your client or position here to sway the judges..."
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
          <div className="tutorial-modal" onClick={closeTutorialModal}>
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
          <div className={`feedback-toast ${toast.content?.type}`}>
            <div className="toast-header">
              <strong>{toast.content?.title}</strong>
              <button className="toast-close" onClick={() => setToast({ open: false, content: null })}>✕</button>
            </div>
            <div className="toast-body">{toast.content?.message}</div>
          </div>
        )}
      </div>
    </>
  );
}