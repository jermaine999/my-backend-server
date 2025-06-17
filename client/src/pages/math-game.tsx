import { useState, useEffect, useCallback } from 'react';
import { Calculator, Clock, Star, Trophy, Play, Check, RotateCcw } from 'lucide-react';

type GameState = 'start' | 'playing' | 'ended';

interface Problem {
  firstNumber: number;
  secondNumber: number;
  answer: number;
}

interface Score {
  name: string;
  score: number;
  date: string;
}

export default function MathGame() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [playerName, setPlayerName] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes
  const [currentScore, setCurrentScore] = useState(0);
  const [currentProblem, setCurrentProblem] = useState<Problem>({ firstNumber: 0, secondNumber: 0, answer: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{type: string, message: string, emoji: string} | null>(null);
  const [problemDifficulty, setProblemDifficulty] = useState(1);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [personalBest, setPersonalBest] = useState(0);
  const [leaderboard, setLeaderboard] = useState<Score[]>([]);

  // Load leaderboard on component mount
  useEffect(() => {
    loadLeaderboard();
  }, []);

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

  // Clear feedback after 2 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
        if (gameState === 'playing') {
          generateNewProblem();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [feedback, gameState]);

  const loadLeaderboard = () => {
    const scores = JSON.parse(localStorage.getItem('mathGameScores') || '[]') as Score[];
    setLeaderboard(scores.sort((a, b) => b.score - a.score).slice(0, 5));
  };

  const generateNewProblem = useCallback(() => {
    let firstNumber: number, secondNumber: number;
    
    // Increase difficulty based on score
    let difficulty = problemDifficulty;
    if (currentScore >= 100) {
      difficulty = 3; // double + double
    } else if (currentScore >= 40) {
      difficulty = 2; // double + single
    }
    
    setProblemDifficulty(difficulty);
    
    switch (difficulty) {
      case 1: // single + single
        firstNumber = Math.floor(Math.random() * 9) + 1;
        secondNumber = Math.floor(Math.random() * 9) + 1;
        break;
      case 2: // double + single
        firstNumber = Math.floor(Math.random() * 90) + 10;
        secondNumber = Math.floor(Math.random() * 9) + 1;
        break;
      case 3: // double + double
        firstNumber = Math.floor(Math.random() * 90) + 10;
        secondNumber = Math.floor(Math.random() * 90) + 10;
        break;
      default:
        firstNumber = Math.floor(Math.random() * 9) + 1;
        secondNumber = Math.floor(Math.random() * 9) + 1;
    }
    
    setCurrentProblem({
      firstNumber,
      secondNumber,
      answer: firstNumber + secondNumber
    });
  }, [currentScore, problemDifficulty]);

  const startGame = () => {
    if (!playerName.trim()) {
      alert('Please enter your name to start!');
      return;
    }
    
    setGameState('playing');
    setCurrentScore(0);
    setTimeRemaining(180);
    setProblemDifficulty(1);
    setFeedback(null);
    setUserAnswer('');
    generateNewProblem();
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
    } else {
      setCurrentScore(prev => prev + 1);
      setFeedback({
        type: 'incorrect',
        message: `Good try! The answer was ${currentProblem.answer}`,
        emoji: '💪'
      });
    }
    
    setUserAnswer('');
  };

  const endGame = () => {
    setGameState('ended');
    saveScore();
  };

  const saveScore = () => {
    const scores = JSON.parse(localStorage.getItem('mathGameScores') || '[]') as Score[];
    const playerScores = scores.filter(score => score.name === playerName);
    const best = playerScores.length > 0 ? Math.max(...playerScores.map(s => s.score)) : 0;
    
    setPersonalBest(Math.max(best, currentScore));
    setIsNewHighScore(currentScore > best);
    
    // Add new score
    const newScore: Score = {
      name: playerName,
      score: currentScore,
      date: new Date().toISOString()
    };
    
    scores.push(newScore);
    localStorage.setItem('mathGameScores', JSON.stringify(scores));
    loadLeaderboard();
  };

  const resetGame = () => {
    setGameState('start');
    setCurrentScore(0);
    setTimeRemaining(180);
    setProblemDifficulty(1);
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
        startGame();
      } else if (gameState === 'playing') {
        submitAnswer();
      } else if (gameState === 'ended') {
        resetGame();
      }
    }
  };

  if (gameState === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-skyblue to-turquoise flex items-center justify-center p-4" onKeyPress={handleKeyPress}>
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg text-center transform transition-all duration-500 hover:scale-105">
          <div className="mb-6">
            <Calculator className="w-24 h-24 text-coral mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-fredoka text-darkblue mb-2">Math Adventure!</h1>
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
            onClick={startGame}
            className="w-full bg-gradient-to-r from-coral to-pink text-white text-2xl font-fredoka py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-coral/50"
          >
            <Play className="inline-block w-6 h-6 mr-3" />
            Start Game!
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-skyblue to-turquoise p-4" onKeyPress={handleKeyPress}>
        {/* Timer and Score Header */}
        <div className="flex justify-between items-center mb-6 bg-white/20 backdrop-blur-sm rounded-2xl p-4">
          <div className="flex items-center space-x-4">
            <div className="bg-white rounded-xl p-3 shadow-lg">
              <Clock className="w-8 h-8 text-coral" />
            </div>
            <div>
              <div className="text-white text-sm font-semibold">Time Left</div>
              <div className="text-3xl font-fredoka text-white">{formatTime(timeRemaining)}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-white rounded-xl p-3 shadow-lg">
              <Star className="w-8 h-8 text-sunny" />
            </div>
            <div>
              <div className="text-white text-sm font-semibold">Score</div>
              <div className="text-3xl font-fredoka text-white">{currentScore}</div>
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
          {/* Math Problem Section */}
          <div className="flex-1">
            <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
              <h2 className="text-2xl font-fredoka text-darkblue mb-8">Solve this problem!</h2>
              
              {/* Math problem display with proper vertical alignment */}
              <div className="text-center mb-8">
                <div className="inline-block text-right">
                  <div className="text-6xl md:text-7xl font-bold text-darkblue mb-2">{currentProblem.firstNumber}</div>
                  <div className="flex items-center justify-end">
                    <span className="text-6xl md:text-7xl font-bold text-darkblue mr-2">+</span>
                    <span className="text-6xl md:text-7xl font-bold text-darkblue">{currentProblem.secondNumber}</span>
                  </div>
                  <div className="border-t-4 border-darkblue mt-4 mb-6 w-full"></div>
                </div>
              </div>

              {/* Answer Input */}
              <div className="mb-6">
                <input 
                  type="number" 
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Your answer..."
                  className="w-full max-w-xs mx-auto px-6 py-4 text-3xl text-center border-4 border-mint rounded-2xl focus:border-coral focus:outline-none focus:ring-4 focus:ring-coral/20 transition-all duration-300"
                  autoFocus
                />
              </div>

              {/* Submit Button */}
              <button 
                onClick={submitAnswer}
                className="bg-gradient-to-r from-mint to-turquoise text-white text-2xl font-fredoka py-4 px-12 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-mint/50"
              >
                <Check className="inline-block w-6 h-6 mr-3" />
                Submit Answer
              </button>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="lg:w-80">
            <div className="bg-white rounded-3xl shadow-2xl p-6 h-full">
              <h3 className="text-xl font-fredoka text-darkblue mb-4 text-center">Feedback</h3>
              
              <div className="text-center h-full flex flex-col justify-center">
                {feedback ? (
                  <div className={`rounded-xl p-4 border-2 ${
                    feedback.type === 'correct' ? 'bg-green-100 border-green-300' :
                    feedback.type === 'incorrect' ? 'bg-yellow-100 border-yellow-300' :
                    'bg-red-100 border-red-300'
                  }`}>
                    <div className="text-6xl mb-4">{feedback.emoji}</div>
                    <p className="text-lg font-semibold text-darkblue">{feedback.message}</p>
                  </div>
                ) : (
                  <>
                    <div className="text-6xl mb-4">🎯</div>
                    <p className="text-lg text-gray-600">Submit your answer to see feedback!</p>
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
                <div key={`${score.name}-${score.date}`} className="flex justify-between items-center bg-lightgray rounded-xl p-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-coral text-white text-sm flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-darkblue">{score.name}</span>
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
