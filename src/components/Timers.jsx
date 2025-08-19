import React, { useState, useEffect } from "react";

function Timers() {
  // Game Timer State
  const [gameTime, setGameTime] = useState(0);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameDuration, setGameDuration] = useState(45 * 60); // default 45 minutes

  // Player Minutes State
  const [playerTime, setPlayerTime] = useState(0);
  const [playerRunning, setPlayerRunning] = useState(false);

  // Game Timer useEffect
  useEffect(() => {
    let interval;
    if (gameRunning && gameTime > 0) {
      interval = setInterval(() => {
        setGameTime((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameRunning, gameTime]);

  // Player Timer useEffect
  useEffect(() => {
    let interval;
    if (playerRunning) {
      interval = setInterval(() => {
        setPlayerTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [playerRunning]);

  // Start game
  const startGame = () => {
    setGameTime(gameDuration);
    setGameRunning(true);
  };

  // Format seconds -> mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Game Timer */}
      <div className="bg-white shadow-md rounded-2xl p-4">
        <h2 className="text-xl font-semibold mb-2">Game Timer</h2>
        <div className="flex items-center justify-between">
          <span className="text-3xl font-mono">{formatTime(gameTime)}</span>
          <select
            value={gameDuration}
            onChange={(e) => setGameDuration(Number(e.target.value))}
            className="border rounded p-1"
          >
            <option value={15 * 60}>15 min</option>
            <option value={30 * 60}>30 min</option>
            <option value={45 * 60}>45 min</option>
            <option value={90 * 60}>90 min</option>
          </select>
        </div>
        <div className="flex space-x-2 mt-3">
          <button
            onClick={startGame}
            className="bg-green-500 text-white px-3 py-1 rounded"
          >
            Start
          </button>
          <button
            onClick={() => setGameRunning(false)}
            className="bg-yellow-500 text-white px-3 py-1 rounded"
          >
            Pause
          </button>
          <button
            onClick={() => {
              setGameRunning(false);
              setGameTime(0);
            }}
            className="bg-red-500 text-white px-3 py-1 rounded"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Player Minutes */}
      <div className="bg-white shadow-md rounded-2xl p-4">
        <h2 className="text-xl font-semibold mb-2">Player Minutes</h2>
        <div className="flex items-center justify-between">
          <span className="text-3xl font-mono">{formatTime(playerTime)}</span>
        </div>
        <div className="flex space-x-2 mt-3">
          <button
            onClick={() => setPlayerRunning(true)}
            className="bg-green-500 text-white px-3 py-1 rounded"
          >
            Start
          </button>
          <button
            onClick={() => setPlayerRunning(false)}
            className="bg-yellow-500 text-white px-3 py-1 rounded"
          >
            Pause
          </button>
          <button
            onClick={() => {
              setPlayerRunning(false);
              setPlayerTime(0);
            }}
            className="bg-red-500 text-white px-3 py-1 rounded"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default Timers;
