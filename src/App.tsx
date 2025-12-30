import { useState, useEffect, useCallback } from 'react';
import { Scale, Clock, Gavel, Sparkles, Wand2, Trophy, Zap, Star, Disc } from 'lucide-react';

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

async function post(path : String, body : any) {
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

function generateCase( currentRound: number, lessonType : string) {
  return post('/api/generate-prompt', {
    currentRound,
    lessonType
  });
}

function judgeArgument(prompt : String, argument : String) {
  return post('/api/judge-argument', {
    prompt,
    argument
  });
}

// Sound utility
const playSound = (src : any) => {
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-700"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
      </div>

      {!started && (
        <main className={`relative z-10 flex flex-col items-center justify-center min-h-screen p-8 transition-opacity duration-700 ${fadeClass === 'fade-out' ? 'opacity-0' : 'opacity-100'}`}>
          <div className="text-center mb-12 flex items-center gap-6">
            <Scale size={80} className="animate-bounce" />
            <h1 className="text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-yellow-400">
              Objection!
            </h1>
            <Gavel size={80} className="animate-bounce" />
          </div>

          <p className="text-xl text-center max-w-3xl mb-12 leading-relaxed">
            You're a rookie lawyer/debater defending clients from marginalized backgrounds.
            Face 3 cases involving digital privacy, algorithmic bias, and social justice or any other debate problem.
          </p>

          <div className="flex flex-col gap-6 w-full max-w-md">
            <button
              onClick={startLesson1}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-6 px-8 rounded-xl shadow-2xl transform transition hover:scale-105 active:scale-95"
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">Normal Pace</span>
                <span className="text-lg opacity-80">(4 min per case)</span>
              </div>
            </button>

            <button
              onClick={startLesson2}
              className="bg-gradient-to-r from-pink-500 to-red-600 hover:from-pink-600 hover:to-red-700 text-white font-bold py-6 px-8 rounded-xl shadow-2xl transform transition hover:scale-105 active:scale-95"
            >
              <div className="flex items-center justify-center gap-3">
                <Disc size={24} />
                <span className="text-2xl">Rapid Rush</span>
                <span className="text-lg opacity-80">(2 min per case)</span>
              </div>
            </button>
          </div>
        </main>
      )}

      {started && (
        <main className="relative z-10 min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            {gameState === 'input' && (
              <div>
                <h2 className="text-5xl font-bold text-center mb-12">
                  Case {currentRound} of 3
                </h2>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-8">
                  <input
                    type="text"
                    placeholder="Enter your own case scenario or generate one with AI..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full bg-white/20 border-2 border-white/30 rounded-xl px-6 py-4 text-white placeholder-white/60 focus:outline-none focus:border-yellow-300 text-lg"
                  />

                  <div className="flex gap-4 mt-6">
                    <button
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95"
                      onClick={useCustomPrompt}
                    >
                      Use My Case
                    </button>
                    <button
                      className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                      onClick={generateAIPrompt}
                      disabled={isGenerating}
                    >
                      <Wand2 size={20} />
                      {isGenerating ? 'Generating...' : 'Generate AI Case'}
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { icon: '⚖️', title: 'Build Your Case', desc: 'Choose to create your own scenario or let AI generate a debate topic for you.' },
                    { icon: '💡', title: 'Think Strategically', desc: 'Develop a compelling argument with evidence and empathy for your position.' },
                    { icon: '🎯', title: 'Get Evaluated', desc: 'Judge Gemini will score your defense and give constructive feedback.' }
                  ].map((card, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
                      <div className="text-4xl mb-3">{card.icon}</div>
                      <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                      <p className="text-sm opacity-90">{card.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gameState === 'playing' && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div className="text-3xl font-bold">Case {currentRound} of 3</div>
                  <div className={`flex items-center gap-3 text-3xl font-bold ${timeLeft < 30 ? 'text-red-400 animate-pulse' : ''}`}>
                    <Clock size={32} />
                    {formatTime(timeLeft)}
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-6">
                  <strong className="text-2xl">⚖️ THE CASE:</strong>
                  <p className="mt-4 text-lg leading-relaxed">{prompt}</p>
                </div>

                <div className="mb-6">
                  <div className="bg-white/20 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-full transition-all duration-1000"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="text-center mt-2 text-sm opacity-80">Time remaining: {formatTime(timeLeft)}</div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-6">
                  <h3 className="text-2xl font-bold mb-4 text-center">
                    Your Defense Argument <span className="text-yellow-300">(Take a Side on the ARGUMENT)</span>
                  </h3>
                  <textarea
                    value={argument}
                    onChange={(e) => setArgument(e.target.value)}
                    placeholder="Write your argument defending your client or position here to sway the judges..."
                    className="w-full bg-white/20 border-2 border-white/30 rounded-xl px-6 py-4 text-white placeholder-white/60 focus:outline-none focus:border-yellow-300 text-lg min-h-[200px]"
                  />
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm opacity-70">{argument.length} characters</span>
                    <button
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95 disabled:scale-100"
                      onClick={handleSubmitArgument}
                      disabled={!argument.trim()}
                    >
                      Submit Defense
                    </button>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
                  <h4 className="text-lg font-bold mb-3">💡 Quick Tips</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Use concrete examples to support your argument</li>
                    <li>• Address counterarguments proactively</li>
                    <li>• Show empathy for affected parties</li>
                    <li>• Keep language clear and persuasive</li>
                  </ul>
                </div>
              </div>
            )}

            {gameState === 'judging' && (
              <div className="text-center py-20">
                <div className="relative inline-block mb-8">
                  <Gavel size={80} className="text-yellow-300 animate-bounce" />
                  <Sparkles size={40} className="absolute -top-2 -right-8 text-purple-300 animate-pulse" />
                </div>
                <h2 className="text-5xl font-bold mb-8">⚖️ Judge Gemini is Deliberating...</h2>
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 border-4 border-yellow-300 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xl">✨ Analyzing your defense with AI wisdom...</span>
                </div>
              </div>
            )}

            {gameState === 'results' && (
              <div>
                {showConfetti && (
                  <div className="fixed inset-0 pointer-events-none z-50">
                    {[...Array(50)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 animate-[fall_3s_linear_infinite]"
                        style={{
                          left: `${Math.random() * 100}%`,
                          animationDelay: `${Math.random() * 3}s`,
                          backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#ffd43b', '#51cf66'][Math.floor(Math.random() * 5)]
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="text-center mb-8">
                  <Trophy size={60} className="text-yellow-300 mx-auto animate-bounce" />
                </div>

                <h2 className="text-5xl font-bold text-center mb-8">
                  ⚖️ Case {currentRound} Verdict
                </h2>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-8">
                  <div className="font-bold text-xl mb-4">Judge Gemini's Decision</div>
                  <div className="text-lg leading-relaxed whitespace-pre-wrap">{verdict}</div>
                </div>

                <div className="flex justify-center">
                  {currentRound < 3 ? (
                    <button
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95 flex items-center gap-2"
                      onClick={nextRound}
                    >
                      <Zap size={20} />
                      Next Case →
                    </button>
                  ) : (
                    <button
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95 flex items-center gap-2"
                      onClick={nextRound}
                    >
                      <Star size={20} />
                      See Final Results
                    </button>
                  )}
                </div>
              </div>
            )}

            {gameState === 'end' && (
              <div>
                <div className="text-center mb-8 relative">
                  <Trophy size={100} className="text-yellow-300 mx-auto animate-bounce" />
                  <Star size={50} className="absolute top-0 left-1/3 text-purple-400 animate-pulse" />
                  <Star size={50} className="absolute top-0 right-1/3 text-pink-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
                </div>

                <h2 className="text-6xl font-bold text-center mb-8">
                  🎉 Trial Complete! 🎉
                </h2>

                <div className="text-center mb-8">
                  <div className="text-8xl font-bold text-yellow-300 mb-4">
                    {Math.round(totalScore / 3)}/100
                  </div>
                  <p className="text-3xl">
                    {Math.round(totalScore / 3) >= 90 ? '🏆 JUSTICE CHAMPION!' :
                     Math.round(totalScore / 3) >= 75 ? '⭐ RISING ADVOCATE!' :
                     Math.round(totalScore / 3) >= 60 ? '💪 DEDICATED DEFENDER!' :
                     '📚 LEARNING LAWYER!'}
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {scores.map((score, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
                      <div className="text-sm opacity-70 mb-2">Case {i + 1}</div>
                      <div className="text-5xl font-bold mb-2">{score}</div>
                      <div className="text-2xl">
                        {score >= 90 ? '🌟' : score >= 75 ? '✨' : score >= 60 ? '💫' : '⭐'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center">
                  <button
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95 flex items-center gap-2"
                    onClick={restartGame}
                  >
                    <Sparkles size={20} />
                    New Trial
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      <button
        onClick={openTutorialModal}
        className="fixed bottom-8 right-8 w-12 h-12 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg transition z-50"
      >
        i
      </button>

      {showTutorial && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={closeTutorialModal}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-3xl font-bold mb-4">⚖️ How to Defend Justice</h3>
            <p className="mb-4 text-lg">Welcome, Rookie Lawyer/Debater! You'll handle three cases involving tech injustice or any debate topic, such as national identity or social issues.</p>
            <ul className="space-y-3 mb-6 text-lg">
              <li><strong>Generate a case</strong> about digital privacy, algorithmic bias, online harassment, or tech access, or any other debate topic</li>
              <li><strong>Build your defense</strong> with empathy, evidence, and legal reasoning (2 min per case)</li>
              <li><strong>Get feedback</strong> from Judge Gemini on how to strengthen your advocacy</li>
            </ul>
            <p className="mb-6 text-lg"><strong>Tips:</strong> Cite specific examples, address systemic issues, and always center your client's perspective!</p>
            <div className="flex justify-center">
              <button
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95"
                onClick={closeTutorialModal}
              >
                Ready to Defend!
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.open && (
        <div className="fixed top-8 right-8 bg-white/10 backdrop-blur-md text-white p-6 rounded-xl shadow-2xl z-50 max-w-sm">
          <div className="font-bold text-lg mb-2">{toast.content?.title}</div>
          <div className="mb-4">{toast.content?.message}</div>
          <button
            onClick={() => setToast({ open: false, content: null })}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
          >
            Close
          </button>
        </div>
      )}

    </div>
  );
}