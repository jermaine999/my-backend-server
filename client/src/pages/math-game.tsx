import { useState, useEffect, useCallback } from 'react';
import { Calculator, Clock, Star, Trophy, Play, Banknote, RotateCcw } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { GameScore } from '@shared/schema';

type GameState = 'start' | 'modeSelection' | 'playing' | 'ended';
type GameMode = 'purple' | 'blue' | 'orange';

interface Problem {
  firstNumber: number;
  secondNumber: number;
  answer: number;
}

const gameModeConfig = {
  purple: {
    name: 'Purple Game',
    description: 'Single digit + Single digit',
    color: 'from-purple-500 to-purple-600',
    hoverColor: 'hover:from-purple-600 hover:to-purple-700',
    generateProblem: () => {
      const first = Math.floor(Math.random() * 9) + 1;
      const second = Math.floor(Math.random() * 9) + 1;
      return { firstNumber: first, secondNumber: second, answer: first + second };
    }
  },
  blue: {
    name: 'Blue Game',
    description: 'Two-digit + Single digit',
    color: 'from-blue-500 to-blue-600',
    hoverColor: 'hover:from-blue-600 hover:to-blue-700',
    generateProblem: () => {
      const first = Math.floor(Math.random() * 90) + 10;
      const second = Math.floor(Math.random() * 9) + 1;
      return { firstNumber: first, secondNumber: second, answer: first + second };
    }
  },
  orange: {
    name: 'Orange Game',
    description: 'Two-digit + Two-digit',
    color: 'from-orange-500 to-orange-600',
    hoverColor: 'hover:from-orange-600 hover:to-orange-700',
    generateProblem: () => {
      const first = Math.floor(Math.random() * 90) + 10;
      const second = Math.floor(Math.random() * 90) + 10;
      return { firstNumber: first, secondNumber: second, answer: first + second };
    }
  }
};

export default function MathGame() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [playerName, setPlayerName] = useState('');
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('purple');
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes
  const [currentScore, setCurrentScore] = useState(0);
  const [currentProblem, setCurrentProblem] = useState<Problem>({ firstNumber: 0, secondNumber: 0, answer: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{type: string, message: string, emoji: string} | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [personalBest, setPersonalBest] = useState(0);

  // API queries and mutations
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['/api/leaderboard', selectedGameMode],
    queryFn: async () => {
      const response = await fetch(`/api/leaderboard?gameMode=${selectedGameMode}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return (await response.json()) as GameScore[];
    },
    enabled: gameState === 'ended'
  });

  const { data: bestScoreData } = useQuery({
    queryKey: ['/api/best-score', playerName, selectedGameMode],
    queryFn: async () => {
      const response = await fetch(`/api/best-score?playerName=${encodeURIComponent(playerName)}&gameMode=${selectedGameMode}`);
      if (!response.ok) throw new Error('Failed to fetch best score');
      return (await response.json()) as { bestScore: number };
    },
    enabled: gameState === 'ended' && !!playerName
  });

  const saveScoreMutation = useMutation({
    mutationFn: async (scoreData: { playerName: string; score: number; gameMode: string }) => {
      const response = await fetch('/api/scores', {
        method: 'POST',
        body: JSON.stringify(scoreData),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to save score');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/best-score'] });
    }
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (gameState === 'playing' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [gameState, timeRemaining]);

  // Clear feedback after 2 seconds - but only for correct answers
  useEffect(() => {
    if (feedback && feedback.type === 'correct') {
      const timer = setTimeout(() => {
        setFeedback(null);
        if (gameState === 'playing') {
          generateNewProblem();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback, gameState]);

  const generateNewProblem = useCallback(() => {
    const problem = gameModeConfig[selectedGameMode].generateProblem();
    setCurrentProblem(problem);
  }, [selectedGameMode]);

  // Generate first problem when game starts
  useEffect(() => {
    if (gameState === 'playing' && currentProblem.firstNumber === 0) {
      generateNewProblem();
    }
  }, [gameState, generateNewProblem, currentProblem.firstNumber]);

  const goToModeSelection = () => {
    if (!playerName.trim()) {
      alert('Please enter your name!');
      return;
    }
    setGameState('modeSelection');
  };

  const startGame = (gameMode: GameMode) => {
    setSelectedGameMode(gameMode);
    setGameState('playing');
    setCurrentScore(0);
    setTimeRemaining(180);
    setFeedback(null);
    setUserAnswer('');
    setCurrentProblem({ firstNumber: 0, secondNumber: 0, answer: 0 }); // Reset to trigger new problem generation
  };

  const submitAnswer = () => {
    const answer = parseInt(userAnswer);
    
    if (isNaN(answer)) {
      setFeedback({
        type: 'invalid',
        message: 'Please enter a number!',
        emoji: '🤔'
      });
      return;
    }
    
    if (answer === currentProblem.answer) {
      setCurrentScore(prev => prev + 20);
      setFeedback({
        type: 'correct',
        message: 'Excellent! Well done!',
        emoji: '🎉'
      });
      setUserAnswer('');
    } else {
      setFeedback({
        type: 'incorrect',
        message: 'Try that again!',
        emoji: '🤔'
      });
      // Don't clear the answer for incorrect responses - let them try again
    }
  };

  const endGame = () => {
    setGameState('ended');
    saveScore();
  };

  const saveScore = () => {
    const previousBest = bestScoreData?.bestScore || 0;
    setPersonalBest(Math.max(previousBest, currentScore));
    setIsNewHighScore(currentScore > previousBest);
    
    // Save to database
    saveScoreMutation.mutate({
      playerName,
      score: currentScore,
      gameMode: selectedGameMode
    });
  };

  const resetGame = () => {
    setGameState('start');
    setCurrentScore(0);
    setTimeRemaining(180);
    setFeedback(null);
    setUserAnswer('');
    setIsNewHighScore(false);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (gameState === 'start') {
        goToModeSelection();
      } else if (gameState === 'playing') {
        submitAnswer();
      } else if (gameState === 'ended') {
        resetGame();
      }
    }
  };

  // Start screen
  if (gameState === 'start') {
    return (
      <div className="h-screen bg-gradient-to-br from-skyblue to-turquoise flex items-center justify-center p-4 overflow-hidden" onKeyPress={handleKeyPress}>
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg text-center transform transition-all duration-500 hover:scale-105">
          <div className="mb-6">
            <Calculator className="w-20 h-20 text-coral mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-fredoka text-darkblue mb-2">Math Adventure!</h1>
            <p className="text-lg text-gray-600">Let's practice addition together!</p>
          </div>
          
          <div className="mb-8">
            <label htmlFor="playerName" className="block text-xl font-semibold text-darkblue mb-4">What's your name?</label>
            <input 
              type="text" 
              id="playerName" 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-6 py-4 text-xl border-4 border-mint rounded-2xl focus:border-coral focus:outline-none focus:ring-4 focus:ring-coral/20 transition-all duration-300"
              maxLength={20}
              autoFocus
            />
          </div>
          
          <button 
            onClick={goToModeSelection}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white text-2xl font-fredoka py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-green-500/50"
          >
            <Play className="inline-block w-6 h-6 mr-3" />
            Let's Go!
          </button>
        </div>
      </div>
    );
  }

  // Mode selection screen
  if (gameState === 'modeSelection') {
    return (
      <div className="h-screen bg-gradient-to-br from-skyblue to-turquoise flex items-center justify-center p-4 overflow-hidden">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl text-center">
          <div className="mb-8">
            <Star className="w-20 h-20 text-sunny mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-fredoka text-darkblue mb-2">Choose Your Game!</h1>
            <p className="text-lg text-gray-600">Hi {playerName}! Pick a challenge level:</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            {(Object.keys(gameModeConfig) as GameMode[]).map((mode) => {
              const config = gameModeConfig[mode];
              return (
                <button
                  key={mode}
                  onClick={() => startGame(mode)}
                  className={`bg-gradient-to-br ${config.color} ${config.hoverColor} text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-${mode}-500/50`}
                >
                  <div className="text-2xl font-fredoka mb-2">{config.name}</div>
                  <div className="text-sm opacity-90">{config.description}</div>
                </button>
              );
            })}
          </div>
          
          <button 
            onClick={() => setGameState('start')}
            className="mt-8 text-darkblue hover:text-coral transition-colors duration-300 font-semibold"
          >
            ← Back to Name Entry
          </button>
        </div>
      </div>
    );
  }

  // Playing screen
  if (gameState === 'playing') {
    return (
      <div className="h-screen bg-gradient-to-br from-skyblue to-turquoise flex flex-col overflow-hidden" onKeyPress={handleKeyPress}>
        {/* Timer and Score Header */}
        <div className="flex justify-between items-center p-4 bg-white/20 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-xl p-2 shadow-lg">
              <Clock className="w-6 h-6 text-coral" />
            </div>
            <div>
              <div className="text-white text-sm font-semibold">Time</div>
              <div className="text-2xl font-fredoka text-white">{formatTime(timeRemaining)}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-xl p-2 shadow-lg">
              <Star className="w-6 h-6 text-sunny" />
            </div>
            <div>
              <div className="text-white text-sm font-semibold">Score</div>
              <div className="text-2xl font-fredoka text-white">{currentScore}</div>
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="flex-1 flex flex-row p-4 gap-6 min-h-0">
          {/* Left Side - Math Problem */}
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md w-full">
              <h2 className="text-xl font-fredoka text-darkblue mb-6">Solve this problem!</h2>
              
              {/* Math problem display with proper vertical alignment */}
              <div className="text-center mb-6">
                <div className="inline-block text-right font-mono">
                  <div className="text-5xl md:text-6xl font-bold text-darkblue mb-2 leading-tight">{currentProblem.firstNumber}</div>
                  <div className="flex items-center justify-end mb-2">
                    <span className="text-5xl md:text-6xl font-bold text-darkblue mr-2">+</span>
                    <span className="text-5xl md:text-6xl font-bold text-darkblue leading-tight">{currentProblem.secondNumber}</span>
                  </div>
                  <div className="border-t-4 border-darkblue mt-2 mb-4 w-full"></div>
                </div>
              </div>

              {/* Answer Input */}
              <div className="mb-6">
                <input 
                  type="number" 
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Answer"
                  className="w-full max-w-xs mx-auto px-4 py-3 text-2xl text-center border-4 border-mint rounded-2xl focus:border-coral focus:outline-none focus:ring-4 focus:ring-coral/20 transition-all duration-300 font-mono"
                  autoFocus
                />
              </div>

              {/* Submit Button */}
              <button 
                onClick={submitAnswer}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white text-xl font-fredoka py-3 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-green-500/50"
              >
                <Banknote className="inline-block w-5 h-5 mr-2" />
                Put it in the bank!
              </button>
            </div>
          </div>

          {/* Right Side - Feedback */}
          <div className="w-80 flex items-center justify-center">
            <div className="bg-white rounded-3xl shadow-2xl p-6 h-96 w-full flex flex-col">
              <h3 className="text-lg font-fredoka text-darkblue mb-4 text-center">Feedback</h3>
              
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                {feedback ? (
                  <div className={`w-full rounded-xl p-4 border-2 ${
                    feedback.type === 'correct' ? 'bg-green-100 border-green-300' :
                    feedback.type === 'incorrect' ? 'bg-yellow-100 border-yellow-300' :
                    'bg-red-100 border-red-300'
                  }`}>
                    <div className="text-5xl mb-3">{feedback.emoji}</div>
                    <p className="text-lg font-semibold text-darkblue">{feedback.message}</p>
                  </div>
                ) : (
                  <>
                    <div className="text-5xl mb-3">🎯</div>
                    <p className="text-lg text-gray-600">Submit your answer!</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // End screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-skyblue to-turquoise flex items-center justify-center p-4" onKeyPress={handleKeyPress}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl text-center">
        <div className="mb-6">
          <Trophy className="w-24 h-24 text-sunny mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-fredoka text-darkblue mb-2">Game Over!</h1>
          <p className="text-lg text-gray-600">Great job practicing math!</p>
        </div>

        {/* Final Score Display */}
        <div className="bg-gradient-to-r from-mint to-turquoise rounded-2xl p-6 mb-6">
          <div className="text-white">
            <div className="text-lg font-semibold mb-2">Final Score</div>
            <div className="text-5xl font-fredoka">{currentScore}</div>
          </div>
        </div>

        {/* High Score Section */}
        <div className="mb-6">
          {isNewHighScore && (
            <div className="bg-gradient-to-r from-sunny to-pink rounded-2xl p-4 mb-4">
              <Star className="w-12 h-12 text-white mx-auto mb-2" />
              <div className="text-white text-xl font-fredoka">NEW HIGH SCORE!</div>
            </div>
          )}
          
          <div className="bg-lightgray rounded-2xl p-4">
            <div className="text-darkblue font-semibold mb-2">Your Best Score</div>
            <div className="text-2xl font-fredoka text-darkblue">{personalBest}</div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mb-8">
          <h3 className="text-xl font-fredoka text-darkblue mb-4">Top Scores</h3>
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-gray-500 text-center">No scores yet!</p>
            ) : (
              leaderboard.map((score, index) => (
                <div key={`${score.playerName}-${score.createdAt}`} className="flex justify-between items-center bg-lightgray rounded-xl p-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-coral text-white text-sm flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-darkblue">{score.playerName}</span>
                  </div>
                  <span className="text-coral font-bold">{score.score}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Play Again Button */}
        <button 
          onClick={resetGame}
          className="w-full bg-gradient-to-r from-coral to-pink text-white text-2xl font-fredoka py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-coral/50"
        >
          <RotateCcw className="inline-block w-6 h-6 mr-3" />
          Play Again!
        </button>
      </div>
    </div>
  );
}
