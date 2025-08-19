import { useState, useEffect, useRef } from "react";

function App() {
  const [playerName, setPlayerName] = useState("");
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState("");
  const [minutesPlayed, setMinutesPlayed] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const [stats, setStats] = useState({
    goalsLeft: 0,
    goalsRight: 0,
    shotsLeft: 0,
    shotsRight: 0,
    offenseSuccess: 0,
    offenseFail: 0,
    defenseSuccess: 0,
    defenseFail: 0,
  });

  const timerRef = useRef(null);

  // Timer for minutes played
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setMinutesPlayed((prev) => prev + 1);
      }, 60000); // increments every 60 sec
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  // Timer for game whistle
  useEffect(() => {
    if (gameTime > 0 && timerRunning) {
      const gameTimer = setTimeout(() => {
        setTimerRunning(false);
        alert("Game over!");
      }, gameTime * 60000);
      return () => clearTimeout(gameTimer);
    }
  }, [gameTime, timerRunning]);

  const handleStatChange = (stat, delta = 1) => {
    setStats((prev) => ({ ...prev, [stat]: prev[stat] + delta }));
  };

  const resetStats = () => {
    setStats({
      goalsLeft: 0,
      goalsRight: 0,
      shotsLeft: 0,
      shotsRight: 0,
      offenseSuccess: 0,
      offenseFail: 0,
      defenseSuccess: 0,
      defenseFail: 0,
    });
    setMinutesPlayed(0);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Soccer Stats Tracker
        </h1>

        {/* Game Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            placeholder="Player Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Opponent Team"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border p-2 rounded"
          />
        </div>

        {/* Timers */}
        <div className="flex gap-4 items-center mb-6">
          <div>
            <p className="font-semibold">Minutes Played: {minutesPlayed}</p>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="px-4 py-2 rounded bg-green-500 hover:bg-green-600 text-white mr-2"
            >
              {timerRunning ? "Stop" : "Start"}
            </button>
            <button
              onClick={() => setMinutesPlayed(0)}
              className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white"
            >
              Reset
            </button>
          </div>

          <div>
            <p className="font-semibold">Game Timer (Whistle):</p>
            <div className="flex gap-2 mt-1">
              {[30, 35, 40, 45].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setGameTime(t);
                    setTimerRunning(true);
                  }}
                  className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {t} min
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            ["Goals Left", "goalsLeft"],
            ["Goals Right", "goalsRight"],
            ["Shots Left", "shotsLeft"],
            ["Shots Right", "shotsRight"],
            ["Offense Success", "offenseSuccess"],
            ["Offense Fail", "offenseFail"],
            ["Defense Success", "defenseSuccess"],
            ["Defense Fail", "defenseFail"],
          ].map(([label, key]) => (
            <div
              key={key}
              className="bg-gray-50 p-3 rounded shadow flex flex-col items-center"
            >
              <p className="font-semibold mb-2">{label}</p>
              <p className="text-xl mb-2">{stats[key]}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatChange(key, 1)}
                  className="px-2 py-1 rounded bg-green-500 hover:bg-green-600 text-white"
                >
                  +
                </button>
                <button
                  onClick={() => handleStatChange(key, -1)}
                  className="px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white"
                >
                  -
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={resetStats}
            className="px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            Reset All Stats
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
