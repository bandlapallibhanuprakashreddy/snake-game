import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Trophy, RefreshCw, Gamepad2 } from 'lucide-react';

// --- Types & Constants ---
type Point = { x: number; y: number };
const GRID_SIZE = 20;
const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION: Point = { x: 0, y: -1 }; // Moving up

const TRACKS = [
  {
    id: 1,
    title: "Naatu Naatu (RRR)",
    artist: "M.M. Keeravani, Rahul Sipligunj",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    id: 2,
    title: "Butta Bomma (AVPL)",
    artist: "Armaan Malik, Thaman S",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    id: 3,
    title: "Samajavaragamana (AVPL)",
    artist: "Sid Sriram, Thaman S",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  }
];

// --- Helper Functions ---
const generateFood = (snake: Point[]): Point => {
  let newFood: Point;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    // Ensure food doesn't spawn on the snake
    const onSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    if (!onSnake) break;
  }
  return newFood;
};

export default function App() {
  // --- Game State ---
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Use a ref to track the latest direction to prevent rapid double-keypress self-collisions
  const directionRef = useRef(INITIAL_DIRECTION);

  // --- Music State ---
  const [tracks, setTracks] = useState(TRACKS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  useEffect(() => {
    // Fetch real Telugu songs from iTunes API
    fetch('https://itunes.apple.com/search?term=telugu+hit+songs&limit=15&media=music')
      .then(res => res.json())
      .then(data => {
        if (data.results && data.results.length > 0) {
          const realTracks = data.results
            .filter((t: any) => t.previewUrl)
            .map((t: any, idx: number) => ({
              id: idx + 1,
              title: t.trackName,
              artist: t.artistName,
              url: t.previewUrl
            }));
          if (realTracks.length > 0) {
            setTracks(realTracks);
            setCurrentTrackIndex(0);
          }
        }
      })
      .catch(err => console.error("Failed to fetch real songs", err));
  }, []);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [visualizerData, setVisualizerData] = useState<number[]>(Array(16).fill(10));
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Game Logic ---
  const moveSnake = useCallback(() => {
    if (gameOver || !gameStarted) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const currentDir = directionRef.current;
      const newHead = {
        x: head.x + currentDir.x,
        y: head.y + currentDir.y,
      };

      // Check wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        setGameOver(true);
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => s + 10);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop(); // Remove tail if no food eaten
      }

      return newSnake;
    });
  }, [gameOver, gameStarted, food]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent default scrolling for arrow keys and space
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }

    if (gameOver) return;

    if (!gameStarted && e.key === ' ') {
      setGameStarted(true);
      return;
    }

    const currentDir = directionRef.current;
    
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
        if (currentDir.y !== 1) directionRef.current = { x: 0, y: -1 };
        break;
      case 'ArrowDown':
      case 's':
        if (currentDir.y !== -1) directionRef.current = { x: 0, y: 1 };
        break;
      case 'ArrowLeft':
      case 'a':
        if (currentDir.x !== 1) directionRef.current = { x: -1, y: 0 };
        break;
      case 'ArrowRight':
      case 'd':
        if (currentDir.x !== -1) directionRef.current = { x: 1, y: 0 };
        break;
    }
    setDirection(directionRef.current);
  }, [gameOver, gameStarted]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const intervalId = setInterval(moveSnake, 150); // Game speed
    return () => clearInterval(intervalId);
  }, [moveSnake]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setFood(generateFood(INITIAL_SNAKE));
  };

  // --- Music Logic ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play error:", e));
    } else if (!isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrackIndex]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setVisualizerData(Array.from({length: 16}, () => Math.max(10, Math.random() * 100)));
      }, 100);
    } else {
      setVisualizerData(Array(16).fill(10));
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  };

  const handleTrackEnd = () => {
    nextTrack();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans flex flex-col items-center justify-center p-4 overflow-hidden relative">
      
      {/* Background Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="z-10 w-full max-w-5xl flex flex-col lg:flex-row gap-8 items-center justify-center">
        
        {/* Game Section */}
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <header className="text-center space-y-1 mb-2">
            <h1 className="text-4xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-cyan-400 animate-pulse drop-shadow-[0_0_10px_rgba(217,70,239,0.5)]">
              Neon Snake
            </h1>
            <p className="text-cyan-400/80 font-mono text-xs tracking-widest uppercase">
              Cybernetic Protocol
            </p>
          </header>

          {/* Score Board */}
          <div className="w-full flex justify-between items-center bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-fuchsia-400" />
              <span className="font-mono text-xl font-bold text-fuchsia-400">{score}</span>
            </div>
            <div className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
              Use Arrow Keys
            </div>
          </div>

          {/* Game Area */}
          <div className="relative w-full aspect-square bg-neutral-900 border-2 border-cyan-500/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            
            {/* Grid Background */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)',
                backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`
              }}
            ></div>

            {/* Snake & Food */}
            {gameStarted && (
              <div className="absolute inset-0">
                {/* Food */}
                <div 
                  className="absolute bg-fuchsia-500 rounded-full shadow-[0_0_10px_#d946ef] animate-pulse"
                  style={{
                    left: `${(food.x / GRID_SIZE) * 100}%`,
                    top: `${(food.y / GRID_SIZE) * 100}%`,
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`,
                    transform: 'scale(0.8)'
                  }}
                ></div>

                {/* Snake */}
                {snake.map((segment, index) => {
                  const isHead = index === 0;
                  return (
                    <div
                      key={`${segment.x}-${segment.y}-${index}`}
                      className={`absolute rounded-sm ${
                        isHead 
                          ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee] z-10' 
                          : 'bg-cyan-600 shadow-[0_0_5px_#0891b2] opacity-80'
                      }`}
                      style={{
                        left: `${(segment.x / GRID_SIZE) * 100}%`,
                        top: `${(segment.y / GRID_SIZE) * 100}%`,
                        width: `${100 / GRID_SIZE}%`,
                        height: `${100 / GRID_SIZE}%`,
                        transform: isHead ? 'scale(1.05)' : 'scale(0.95)'
                      }}
                    ></div>
                  );
                })}
              </div>
            )}

            {/* Overlays */}
            {!gameStarted && !gameOver && (
              <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                <Gamepad2 className="w-16 h-16 text-cyan-400 mb-4 animate-bounce" />
                <button 
                  onClick={() => setGameStarted(true)}
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold uppercase tracking-widest rounded-full transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.8)] hover:scale-105"
                >
                  Start Game
                </button>
                <p className="mt-4 text-neutral-400 font-mono text-xs">Press SPACE to start</p>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center z-30">
                <h2 className="text-4xl font-black text-fuchsia-500 mb-2 drop-shadow-[0_0_10px_rgba(217,70,239,0.8)] uppercase tracking-widest">Game Over</h2>
                <p className="text-neutral-300 font-mono mb-6">Final Score: <span className="text-cyan-400 font-bold">{score}</span></p>
                <button 
                  onClick={resetGame}
                  className="flex items-center gap-2 px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold uppercase tracking-widest rounded-full transition-all shadow-[0_0_20px_rgba(217,70,239,0.5)] hover:shadow-[0_0_30px_rgba(217,70,239,0.8)] hover:scale-105"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Music Player Section */}
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="relative bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
            
            <div className="text-center space-y-1">
              <div className="inline-block px-3 py-1 bg-neutral-950 border border-neutral-800 rounded-full mb-3">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full bg-cyan-500 ${isPlaying ? 'animate-ping' : ''}`}></span>
                  Radio Active
                </span>
              </div>
              <h3 className="text-xl font-bold text-white truncate px-2 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                {tracks[currentTrackIndex]?.title || "Loading..."}
              </h3>
              <p className="text-sm text-fuchsia-400/80 font-mono truncate">
                {tracks[currentTrackIndex]?.artist || "..."}
              </p>
            </div>

            {/* Audio Element (Hidden) */}
            <audio
              ref={audioRef}
              src={tracks[currentTrackIndex]?.url}
              onEnded={handleTrackEnd}
              preload="auto"
            />

            {/* Visualizer */}
            <div className="h-16 flex items-end justify-center gap-1.5 px-4 bg-neutral-950/50 rounded-xl p-2 border border-neutral-800/50">
              {visualizerData.map((height, i) => (
                <div 
                  key={i} 
                  className="w-2 bg-gradient-to-t from-cyan-500 to-fuchsia-500 rounded-t-sm"
                  style={{
                    height: `${height}%`,
                    transition: 'height 0.1s ease',
                    opacity: isPlaying ? 0.9 : 0.2
                  }}
                ></div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-5 mt-2">
              <div className="flex items-center justify-center gap-6">
                <button 
                  onClick={prevTrack}
                  className="p-3 text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800 rounded-full transition-all"
                >
                  <SkipBack className="w-6 h-6" />
                </button>
                
                <button 
                  onClick={togglePlay}
                  className="p-4 bg-gradient-to-br from-cyan-500 to-fuchsia-600 text-white rounded-full shadow-[0_0_20px_rgba(217,70,239,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition-all"
                >
                  {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </button>
                
                <button 
                  onClick={nextTrack}
                  className="p-3 text-neutral-400 hover:text-fuchsia-400 hover:bg-neutral-800 rounded-full transition-all"
                >
                  <SkipForward className="w-6 h-6" />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3 px-2">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-neutral-500 hover:text-cyan-400 transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="text-center text-neutral-500 text-xs font-mono">
            <p>Collect the fuchsia data packets.</p>
            <p>Don't crash into the walls or yourself.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
