import React, { useState, useEffect } from "react";
import GameTimer from "./Timers"; // Halftime Minutes
import PlayerTimer from "./PlayerTimer"; // Player Minutes
import GameHistory from "./GameHistory"; // Game History Component
import { CSVLink } from "react-csv";

// IndexedDB storage functions
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SoccerStatsDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('games')) {
        db.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

const saveToIndexedDB = async (games) => {
  try {
    const db = await initDB();
    const transaction = db.transaction(['games'], 'readwrite');
    const store = transaction.objectStore('games');
    await store.clear();
    await store.add({ id: 1, games: games });
    return true;
  } catch (error) {
    console.error('IndexedDB save failed:', error);
    // Fallback to localStorage
    try {
      localStorage.setItem('soccerStatsSavedGames', JSON.stringify(games));
      return true;
    } catch (localError) {
      console.error('Both IndexedDB and localStorage failed:', localError);
      return false;
    }
  }
};

const loadFromIndexedDB = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction(['games'], 'readonly');
    const store = transaction.objectStore('games');
    const result = await new Promise((resolve, reject) => {
      const request = store.get(1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return result?.games || [];
  } catch (error) {
    console.error('IndexedDB load failed, trying localStorage:', error);
    try {
      const saved = localStorage.getItem('soccerStatsSavedGames');
      return saved ? JSON.parse(saved) : [];
    } catch (localError) {
      console.error('Both IndexedDB and localStorage failed:', localError);
      return [];
    }
  }
};

export default function GameStats() {
  // Game info
  const [date, setDate] = useState(() => {
    // Auto-populate with today's date in Pacific Time in YYYY-MM-DD format
    try {
      const now = new Date();
      // Use a more reliable method
      const formatter = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Los_Angeles'});
      return formatter.format(now);
    } catch (error) {
      console.warn('Pacific time conversion failed, using local date:', error);
      return new Date().toISOString().split('T')[0];
    }
  });
  const [playerName, setPlayerName] = useState("");
  const [opponent, setOpponent] = useState("");
  const [gameType, setGameType] = useState("League");

  // Timer states (receive from child components via callbacks)
  const [halftimeMinutes, setHalftimeMinutes] = useState(30);
  const [halftimeSeconds, setHalftimeSeconds] = useState(0);
  const [playerMinutes, setPlayerMinutes] = useState(0);

  // Goal tracking functions with race condition protection and memory management
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const MAX_GOALS_PER_GAME = 20; // Reasonable limit to prevent memory issues

  // Real-time goal tracking
  const [ourGoals, setOurGoals] = useState([]);  // Array of {time, minute} objects
  const [theirGoals, setTheirGoals] = useState([]);  // Array of {time, minute} objects

  // Callback functions to receive timer updates
  const handleHalftimeUpdate = (seconds) => {
    setHalftimeSeconds(seconds);
  };

  const handlePlayerTimeUpdate = (seconds) => {
    setPlayerMinutes(seconds);
  };

  const addOurGoal = async () => {
    if (isAddingGoal || ourGoals.length >= MAX_GOALS_PER_GAME) return;
    
    setIsAddingGoal(true);
    const goalTime = formatTime(halftimeSeconds);
    const goalMinute = Math.floor(halftimeSeconds / 60);
    
    setOurGoals(prevGoals => [...prevGoals, { 
      time: goalTime, 
      minute: goalMinute, 
      timestamp: Date.now() 
    }]);
    
    // Brief delay to prevent accidental double-clicks
    setTimeout(() => setIsAddingGoal(false), 500);
  };

  const addTheirGoal = async () => {
    if (isAddingGoal || theirGoals.length >= MAX_GOALS_PER_GAME) return;
    
    setIsAddingGoal(true);
    const goalTime = formatTime(halftimeSeconds);
    const goalMinute = Math.floor(halftimeSeconds / 60);
    
    setTheirGoals(prevGoals => [...prevGoals, { 
      time: goalTime, 
      minute: goalMinute, 
      timestamp: Date.now() 
    }]);
    
    setTimeout(() => setIsAddingGoal(false), 500);
  };

  const removeLastOurGoal = () => {
    if (isAddingGoal) return;
    setOurGoals(prevGoals => prevGoals.slice(0, -1));
  };

  const removeLastTheirGoal = () => {
    if (isAddingGoal) return;
    setTheirGoals(prevGoals => prevGoals.slice(0, -1));
  };

  // Stats
  const [goalsLeft, setGoalsLeft] = useState(0);
  const [goalsRight, setGoalsRight] = useState(0);
  const [shotsLeft, setShotsLeft] = useState(0);
  const [shotsRight, setShotsRight] = useState(0);
  const [assists, setAssists] = useState(0);
  const [passCompletions, setPassCompletions] = useState(0);
  const [cornersTaken, setCornersTaken] = useState(0);
  const [cornerConversions, setCornerConversions] = useState(0);
  const [fouls, setFouls] = useState(0);
  const [cards, setCards] = useState(0);
  const [gkShotsSaved, setGkShotsSaved] = useState(0);
  const [gkGoalsAgainst, setGkGoalsAgainst] = useState(0);
  const [shotsOnFrameLeft, setShotsOnFrameLeft] = useState(0);
  const [shotsOnFrameRight, setShotsOnFrameRight] = useState(0);
  const [shotsOffFrameLeft, setShotsOffFrameLeft] = useState(0);
  const [shotsOffFrameRight, setShotsOffFrameRight] = useState(0);
  const [headersMade, setHeadersMade] = useState(0);
  const [headerGoals, setHeaderGoals] = useState(0);
  const [pksTaken, setPksTaken] = useState(0);
  const [pksMade, setPksMade] = useState(0);
  const [freeKicksTaken, setFreeKicksTaken] = useState(0);
  const [freeKicksMade, setFreeKicksMade] = useState(0);

  // Saved games
  const [savedGames, setSavedGames] = useState([]);

  // Get unique player names and opponents from saved games for dropdowns
  const getUniquePlayerNames = () => {
    const names = savedGames.map(game => game.playerName).filter(name => name && name.trim() !== '');
    return [...new Set(names)].sort();
  };

  const getUniqueOpponents = () => {
    const opponents = savedGames.map(game => game.opponent).filter(opponent => opponent && opponent.trim() !== '');
    return [...new Set(opponents)].sort();
  };

  // Load saved games from localStorage on component mount
 // Load saved games from IndexedDB on component mount
// Load saved games from IndexedDB on component mount
useEffect(() => {
  const loadGames = async () => {
    try {
      const games = await loadFromIndexedDB();
      if (Array.isArray(games) && games.length > 0) {
        setSavedGames(games);
      }
    } catch (error) {
      console.error('Error loading saved games:', error);
    }
  };
  
  loadGames();
}, []);

  // Save to localStorage whenever savedGames changes
 useEffect(() => {
  if (savedGames.length > 0) {
    const saveGames = async () => {
      const success = await saveToIndexedDB(savedGames);
      if (!success) {
        alert('Failed to save game data. Please export your data as backup.');
      }
    };
    
    saveGames();
  }
}, [savedGames]);

  // Helpers with validation
  const increment = (setter, value) => setter(value + 1);
  const decrement = (setter, value) => setter(value > 0 ? value - 1 : 0);

  // Input sanitization helper
  const sanitizeInput = (input) => {
    if (!input || typeof input !== 'string') return input;
    
    // Remove or escape potentially dangerous characters for CSV injection
    const dangerous = /^[=+\-@]/;
    if (dangerous.test(input.trim())) {
      return `'${input}`; // Prefix with single quote to prevent Excel formula execution
    }
    
    // Remove any control characters
    return input.replace(/[\x00-\x1F\x7F]/g, '');
  };

  // Data validation helper
  const validateStats = (stats) => {
    const warnings = [];
    
    // Goals cannot exceed shots
    if ((stats.goalsLeft || 0) > (stats.shotsLeft || 0)) {
      warnings.push('Left foot goals exceed shots');
    }
    if ((stats.goalsRight || 0) > (stats.shotsRight || 0)) {
      warnings.push('Right foot goals exceed shots');
    }
    
    // Corner conversions cannot exceed corners taken
    if ((stats.cornerConversions || 0) > (stats.cornersTaken || 0)) {
      warnings.push('Corner conversions exceed corners taken');
    }
    
    // GK goals against should be reasonable
    if ((stats.gkGoalsAgainst || 0) > 20) {
      warnings.push('Unusually high goals against (over 20)');
    }
    
    // Very high shot counts might be errors
    if ((stats.shotsLeft || 0) + (stats.shotsRight || 0) > 50) {
      warnings.push('Unusually high shot count (over 50)');
    }
    
    return warnings;
  };

  // Format seconds to MM:SS
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const saveGame = () => {
    // Validate data before saving
    const currentStats = {
      goalsLeft, goalsRight, shotsLeft, shotsRight,
      cornersTaken, cornerConversions, gkGoalsAgainst
    };
    
    const warnings = validateStats(currentStats);
    if (warnings.length > 0) {
      const message = 'Data validation warnings:\n' + warnings.join('\n') + '\n\nSave anyway?';
      if (!window.confirm(message)) {
        return;
      }
    }

    const halftimeRemaining = Math.max(0, (halftimeMinutes * 60) - halftimeSeconds);
    const ourGoalCount = ourGoals.length;
    const theirGoalCount = theirGoals.length;
    
    // Determine game result
    let gameResult;
    if (ourGoalCount > theirGoalCount) {
      gameResult = 'Win';
    } else if (ourGoalCount < theirGoalCount) {
      gameResult = 'Loss';
    } else {
      gameResult = 'Tie';
    }
    
    const newGame = {
      date,
      playerName,
      opponent,
      gameType,
      // Game result data
      ourGoals: ourGoalCount,
      theirGoals: theirGoalCount,
      gameResult,
      goalHistory: {
        our: ourGoals,
        their: theirGoals
      },
      // Timer data
      halftimeMinutes,
      halftimeElapsed: formatTime(halftimeSeconds),
      halftimeRemaining: formatTime(halftimeRemaining),
      halftimeComplete: halftimeSeconds >= (halftimeMinutes * 60),
      playerMinutesPlayed: formatTime(playerMinutes),
      playerSecondsPlayed: playerMinutes,
      // Stats
      goalsLeft,
      goalsRight,
      shotsLeft,
      shotsRight,
      assists,
      passCompletions,
      cornersTaken,
      cornerConversions,
      fouls,
      cards,
      gkShotsSaved,
      gkGoalsAgainst,
      // Calculated stats
      totalGoals: goalsLeft + goalsRight,
      totalShots: shotsLeft + shotsRight,
      goalConversionRate: (shotsLeft + shotsRight) > 0 ? ((goalsLeft + goalsRight) / (shotsLeft + shotsRight) * 100).toFixed(1) + '%' : '0%',
      cornerConversionRate: cornersTaken > 0 ? ((cornerConversions / cornersTaken) * 100).toFixed(1) + '%' : '0%',
    };
    setSavedGames([newGame, ...savedGames]);

    // Reset stats (leave game info/timers alone)
    setGoalsLeft(0);
    setGoalsRight(0);
    setShotsLeft(0);
    setShotsRight(0);
    setAssists(0);
    setPassCompletions(0);
    setCornersTaken(0);
    setCornerConversions(0);
    setFouls(0);
    setCards(0);
    setGkShotsSaved(0);
    setGkGoalsAgainst(0);
    // Reset goal tracking
    setOurGoals([]);
    setTheirGoals([]);
  };

const clearAllData = async () => {
  if (window.confirm('Are you sure you want to clear all saved games? This cannot be undone.')) {
    setSavedGames([]);
    // Clear from both IndexedDB and localStorage
    try {
      const db = await initDB();
      const transaction = db.transaction(['games'], 'readwrite');
      transaction.objectStore('games').clear();
    } catch (error) {
      localStorage.removeItem('soccerStatsSavedGames');
    }
  }
};

// Handle game updates from GameHistory component
const handleGameUpdate = (gameIndex, updatedGame) => {
  const newSavedGames = [...savedGames];
  newSavedGames[gameIndex] = updatedGame;
  setSavedGames(newSavedGames);
};

// Handle game deletion from GameHistory component
const handleGameDelete = (gameIndex) => {
  const newSavedGames = savedGames.filter((_, index) => index !== gameIndex);
  setSavedGames(newSavedGames);
};
  // Enhanced export functionality
  const [exportOptions, setExportOptions] = useState({
    startDate: '',
    endDate: '',
    selectedOpponent: '',
    exportType: 'all'
  });
  const [showExportModal, setShowExportModal] = useState(false);

  // Generate full data backup for import/export
  const generateFullBackup = () => {
    const backup = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      exportType: "full_backup",
      metadata: {
        totalGames: savedGames.length,
        dateRange: savedGames.length > 0 ? {
          earliest: savedGames[savedGames.length - 1]?.date,
          latest: savedGames[0]?.date
        } : null,
        players: getUniquePlayerNames(),
        opponents: getUniqueOpponents()
      },
      savedGames: savedGames,
      settings: {
        // Future: user preferences, default timer settings, etc.
      }
    };
    return backup;
  };

  // Download JSON file
  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export full backup
  const exportFullBackup = () => {
    const backup = generateFullBackup();
    const filename = `soccer-backup-${new Date().toISOString().split('T')[0]}.json`;
    downloadJSON(backup, filename);
  };

  // Filter games based on export options
  const getFilteredGames = () => {
    let filtered = [...savedGames];

    // Filter by date range
    if (exportOptions.startDate) {
      filtered = filtered.filter(game => game.date >= exportOptions.startDate);
    }
    if (exportOptions.endDate) {
      filtered = filtered.filter(game => game.date <= exportOptions.endDate);
    }

    // Filter by opponent
    if (exportOptions.selectedOpponent) {
      filtered = filtered.filter(game => game.opponent === exportOptions.selectedOpponent);
    }

    return filtered;
  };

  // Export filtered data
  const exportFilteredData = () => {
    const filteredGames = getFilteredGames();
    
    if (filteredGames.length === 0) {
      alert('No games match the selected criteria.');
      return;
    }

    const backup = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      exportType: "filtered",
      filters: exportOptions,
      metadata: {
        totalGames: filteredGames.length,
        originalTotal: savedGames.length
      },
      savedGames: filteredGames
    };

    const filename = `soccer-filtered-${new Date().toISOString().split('T')[0]}.json`;
    downloadJSON(backup, filename);
    setShowExportModal(false);
  };

  // Generate detailed report
  const generateDetailedReport = () => {
    const games = getFilteredGames();
    if (games.length === 0) {
      alert('No games match the selected criteria.');
      return;
    }

    const wins = games.filter(g => g.gameResult === 'Win').length;
    const losses = games.filter(g => g.gameResult === 'Loss').length;
    const ties = games.filter(g => g.gameResult === 'Tie').length;

    const report = {
      reportDate: new Date().toISOString(),
      summary: {
        totalGames: games.length,
        record: `${wins}W-${losses}L-${ties}T`,
        winPercentage: games.length > 0 ? ((wins / games.length) * 100).toFixed(1) + '%' : '0%'
      },
      totals: {
        goalsScored: games.reduce((sum, game) => sum + (game.ourGoals || 0), 0),
        goalsAgainst: games.reduce((sum, game) => sum + (game.theirGoals || 0), 0),
        personalGoals: games.reduce((sum, game) => sum + (game.totalGoals || 0), 0),
        assists: games.reduce((sum, game) => sum + (game.assists || 0), 0),
        shots: games.reduce((sum, game) => sum + (game.totalShots || 0), 0),
        corners: games.reduce((sum, game) => sum + (game.cornersTaken || 0), 0),
        cornerGoals: games.reduce((sum, game) => sum + (game.cornerConversions || 0), 0)
      },
      averages: {
        goalsPerGame: games.length > 0 ? (games.reduce((sum, game) => sum + (game.ourGoals || 0), 0) / games.length).toFixed(1) : '0',
        personalGoalsPerGame: games.length > 0 ? (games.reduce((sum, game) => sum + (game.totalGoals || 0), 0) / games.length).toFixed(1) : '0',
        assistsPerGame: games.length > 0 ? (games.reduce((sum, game) => sum + (game.assists || 0), 0) / games.length).toFixed(1) : '0'
      },
      games: games
    };

    const filename = `soccer-report-${new Date().toISOString().split('T')[0]}.json`;
    downloadJSON(report, filename);
    setShowExportModal(false);
  };

  // Enhanced CSV generation - Fixed with proper function declaration
  const generateEnhancedCSV = () => {
    if (savedGames.length === 0) return [];

    // Process games in smaller chunks to prevent memory issues
    const chunkSize = 50;
    const chunks = [];
    
    for (let i = 0; i < savedGames.length; i += chunkSize) {
      const chunk = savedGames.slice(i, i + chunkSize);
      const processedChunk = chunk.map((game, index) => {
        const actualIndex = i + index;
        const goalTimeline = game.goalHistory ? 
          [...(game.goalHistory.our || []).map(g => `${g.time} Us`), 
           ...(game.goalHistory.their || []).map(g => `${g.time} Them`)]
          .sort()
          .join('; ') : 'No goals recorded';

        return {
          'Game #': savedGames.length - actualIndex,
          'Date': sanitizeInput(game.date) || 'Not set',
          'Player Name': sanitizeInput(game.playerName) || 'Not set',
          'Opponent': sanitizeInput(game.opponent) || 'Not set',
          'Result': game.gameResult || 'Unknown',
          'Final Score (Us-Them)': `${game.ourGoals || 0}-${game.theirGoals || 0}`,
          'Goals Scored (Team)': game.ourGoals || 0,
          'Goals Against (Team)': game.theirGoals || 0,
          'Personal Goals Left Foot': game.goalsLeft || 0,
          'Personal Goals Right Foot': game.goalsRight || 0,
          'Total Personal Goals': game.totalGoals || 0,
          'Shots Left Foot': game.shotsLeft || 0,
          'Shots Right Foot': game.shotsRight || 0,
          'Total Shots': game.totalShots || 0,
          'Goal Conversion Rate': game.goalConversionRate || '0%',
          'Assists': game.assists || 0,
          'Pass Completions': game.passCompletions || 0,
          'Corners Taken': game.cornersTaken || 0,
          'Corner Conversions': game.cornerConversions || 0,
          'Corner Conversion Rate': game.cornerConversionRate || '0%',
          'Fouls': game.fouls || 0,
          'Cards (Red/Yellow)': game.cards || 0,
          'GK Shots Saved': game.gkShotsSaved || 0,
          'GK Goals Against': game.gkGoalsAgainst || 0,
          'Player Minutes Played': game.playerMinutesPlayed || '0:00',
          'Halftime Duration': `${game.halftimeMinutes || 0} min`,
          'Halftime Completed': game.halftimeComplete ? 'Yes' : 'No',
          'Goal Timeline': sanitizeInput(goalTimeline)
        };
      });
      chunks.push(...processedChunk);
    }

    // Add summary row
    const totalGames = savedGames.length;
    const wins = savedGames.filter(g => g.gameResult === 'Win').length;
    const losses = savedGames.filter(g => g.gameResult === 'Loss').length;
    const ties = savedGames.filter(g => g.gameResult === 'Tie').length;
    const winPercentage = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) + '%' : '0%';
    
    const summaryRow = {
      'Game #': 'SUMMARY',
      'Date': `${totalGames} Total Games`,
      'Player Name': '',
      'Opponent': `Record: ${wins}W-${losses}L-${ties}T`,
      'Result': `Win Rate: ${winPercentage}`,
      'Final Score (Us-Them)': '',
      'Goals Scored (Team)': savedGames.reduce((sum, game) => sum + (game.ourGoals || 0), 0),
      'Goals Against (Team)': savedGames.reduce((sum, game) => sum + (game.theirGoals || 0), 0),
      'Personal Goals Left Foot': savedGames.reduce((sum, game) => sum + (game.goalsLeft || 0), 0),
      'Personal Goals Right Foot': savedGames.reduce((sum, game) => sum + (game.goalsRight || 0), 0),
      'Total Personal Goals': savedGames.reduce((sum, game) => sum + (game.totalGoals || 0), 0),
      'Shots Left Foot': savedGames.reduce((sum, game) => sum + (game.shotsLeft || 0), 0),
      'Shots Right Foot': savedGames.reduce((sum, game) => sum + (game.shotsRight || 0), 0),
      'Total Shots': savedGames.reduce((sum, game) => sum + (game.totalShots || 0), 0),
      'Goal Conversion Rate': '',
      'Assists': savedGames.reduce((sum, game) => sum + (game.assists || 0), 0),
      'Pass Completions': savedGames.reduce((sum, game) => sum + (game.passCompletions || 0), 0),
      'Corners Taken': savedGames.reduce((sum, game) => sum + (game.cornersTaken || 0), 0),
      'Corner Conversions': savedGames.reduce((sum, game) => sum + (game.cornerConversions || 0), 0),
      'Corner Conversion Rate': '',
      'Fouls': savedGames.reduce((sum, game) => sum + (game.fouls || 0), 0),
      'Cards (Red/Yellow)': savedGames.reduce((sum, game) => sum + (game.cards || 0), 0),
      'GK Shots Saved': savedGames.reduce((sum, game) => sum + (game.gkShotsSaved || 0), 0),
      'GK Goals Against': savedGames.reduce((sum, game) => sum + (game.gkGoalsAgainst || 0), 0),
      'Player Minutes Played': '',
      'Halftime Duration': '',
      'Halftime Completed': '',
      'Goal Timeline': ''
    };

    return [summaryRow, ...chunks];
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <h1 className="text-center text-2xl font-bold mb-4">Soccer Stat Tracker</h1>

      {/* Game info */}
      <div className="space-y-3 mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Date"
        />
        
        {/* Player Name with datalist */}
        <div className="relative">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(sanitizeInput(e.target.value))}
            list="playerNames"
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Player Name"
            maxLength={50}
          />
          <datalist id="playerNames">
            {getUniquePlayerNames().map((name, index) => (
              <option key={index} value={name} />
            ))}
          </datalist>
        </div>
        
        {/* Opponent with datalist */}
        <div className="relative">
          <input
            type="text"
            value={opponent}
            onChange={(e) => setOpponent(sanitizeInput(e.target.value))}
            list="opponents"
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Opponent"
            maxLength={50}
          />
          <datalist id="opponents">
            {getUniqueOpponents().map((opp, index) => (
              <option key={index} value={opp} />
            ))}
          </datalist>
        </div>

        {/* Game Type dropdown */}
<div className="relative">
  <select
    value={gameType}
    onChange={(e) => setGameType(e.target.value)}
    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
  >
    <option value="League">League</option>
    <option value="Tournament">Tournament</option>
    <option value="Showcase">Showcase</option>
    <option value="Scrimmage">Scrimmage</option>
  </select>
</div>
      </div>

      {/* Timers - using CSS Grid for perfect alignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="border p-3 rounded-lg flex flex-col items-center">
          <label className="mb-2 font-semibold">Halftime Minutes</label>
          <GameTimer 
            halftimeMinutes={halftimeMinutes}
            setHalftimeMinutes={setHalftimeMinutes}
            onTimeChange={handleHalftimeUpdate}
          />
        </div>

        <div className="border p-3 rounded-lg flex flex-col items-center">
          <label className="mb-2 font-semibold">Player Minutes</label>
          <PlayerTimer 
            onTimeChange={handlePlayerTimeUpdate}
          />
        </div>
      </div>

      {/* Stats two-column layout with accessibility */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[
  { label: "Goals Left Foot", value: goalsLeft, setter: setGoalsLeft },
  { label: "Goals Right Foot", value: goalsRight, setter: setGoalsRight },
  { label: "Shots On Frame Left", value: shotsOnFrameLeft, setter: setShotsOnFrameLeft },
  { label: "Shots On Frame Right", value: shotsOnFrameRight, setter: setShotsOnFrameRight },
  { label: "Shots Off Frame Left", value: shotsOffFrameLeft, setter: setShotsOffFrameLeft },
  { label: "Shots Off Frame Right", value: shotsOffFrameRight, setter: setShotsOffFrameRight },
  { label: "Assists", value: assists, setter: setAssists },
  { label: "Pass Completions", value: passCompletions, setter: setPassCompletions },
  { label: "Corners Taken", value: cornersTaken, setter: setCornersTaken },
  { label: "Corner Conversions", value: cornerConversions, setter: setCornerConversions },
  { label: "Headers Made", value: headersMade, setter: setHeadersMade },
  { label: "Header Goals", value: headerGoals, setter: setHeaderGoals },
  { label: "PKs Taken", value: pksTaken, setter: setPksTaken },
  { label: "PKs Made", value: pksMade, setter: setPksMade },
  { label: "Free Kicks Taken", value: freeKicksTaken, setter: setFreeKicksTaken },
  { label: "Free Kicks Made", value: freeKicksMade, setter: setFreeKicksMade },
  { label: "Fouls", value: fouls, setter: setFouls },
  { label: "Red/Yellow Cards", value: cards, setter: setCards },
  { label: "GK - Shots Saved", value: gkShotsSaved, setter: setGkShotsSaved },
  { label: "GK - Goals Against", value: gkGoalsAgainst, setter: setGkGoalsAgainst },
        ].map((stat, index) => (
          <div key={index} className="flex flex-col items-center">
            <label className="mb-1 font-medium text-center" id={`stat-${index}-label`}>
              {stat.label}
            </label>
            <div className="flex items-center justify-center" role="group" aria-labelledby={`stat-${index}-label`}>
              <button
                className="bg-red-500 text-white px-3 py-1 rounded mr-2 focus:outline-none focus:ring-2 focus:ring-red-300"
                onClick={() => decrement(stat.setter, stat.value)}
                aria-label={`Decrease ${stat.label}`}
                tabIndex={0}
              >
                -
              </button>
              <span 
                className="mx-2 text-lg font-semibold min-w-[2ch] text-center" 
                aria-live="polite"
                aria-label={`${stat.label}: ${stat.value}`}
              >
                {stat.value}
              </span>
              <button
                className="bg-green-500 text-white px-3 py-1 rounded ml-2 focus:outline-none focus:ring-2 focus:ring-green-300"
                onClick={() => increment(stat.setter, stat.value)}
                aria-label={`Increase ${stat.label}`}
                tabIndex={0}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Goal Tracking with accessibility */}
      <div className="mb-4 border rounded-lg p-4 bg-blue-50" role="region" aria-labelledby="live-score-heading">
        <h3 id="live-score-heading" className="text-lg font-semibold mb-3 text-center">Live Score</h3>
        <div className="flex justify-between items-center mb-3" role="status" aria-live="polite">
          <div className="text-center">
            <div className="text-2xl font-bold" aria-label={`Our goals: ${ourGoals.length}`}>
              {ourGoals.length}
            </div>
            <div className="text-sm text-gray-600">Us</div>
          </div>
          <div className="text-xl font-semibold" aria-hidden="true">-</div>
          <div className="text-center">
            <div className="text-2xl font-bold" aria-label={`Their goals: ${theirGoals.length}`}>
              {theirGoals.length}
            </div>
            <div className="text-sm text-gray-600">Them</div>
          </div>
        </div>
        
        <div className="flex gap-2 mb-3" role="group" aria-labelledby="goal-buttons-label">
          <span id="goal-buttons-label" className="sr-only">Goal tracking buttons</span>
          <button
            onClick={addOurGoal}
            disabled={isAddingGoal || ourGoals.length >= MAX_GOALS_PER_GAME}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex-1 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-300"
            aria-label="Add goal for our team"
            title={ourGoals.length >= MAX_GOALS_PER_GAME ? `Maximum ${MAX_GOALS_PER_GAME} goals reached` : "Add goal for our team"}
          >
            Goal Us
          </button>
          <button
            onClick={addTheirGoal}
            disabled={isAddingGoal || theirGoals.length >= MAX_GOALS_PER_GAME}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex-1 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-300"
            aria-label="Add goal for their team"
            title={theirGoals.length >= MAX_GOALS_PER_GAME ? `Maximum ${MAX_GOALS_PER_GAME} goals reached` : "Add goal for their team"}
          >
            Goal Them
          </button>
        </div>
        
        {(ourGoals.length > 0 || theirGoals.length > 0) && (
          <div className="flex gap-2" role="group" aria-labelledby="undo-buttons-label">
            <span id="undo-buttons-label" className="sr-only">Undo goal buttons</span>
            {ourGoals.length > 0 && (
              <button
                onClick={removeLastOurGoal}
                className="bg-gray-500 text-white px-3 py-1 rounded text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label="Remove last goal for our team"
              >
                Undo Our Goal
              </button>
            )}
            {theirGoals.length > 0 && (
              <button
                onClick={removeLastTheirGoal}
                className="bg-gray-500 text-white px-3 py-1 rounded text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label="Remove last goal for their team"
              >
                Undo Their Goal
              </button>
            )}
          </div>
        )}
        
        {/* Goal Timeline with accessibility */}
        {(ourGoals.length > 0 || theirGoals.length > 0) && (
          <div className="mt-3 text-sm" role="region" aria-labelledby="goal-timeline-heading">
            <div id="goal-timeline-heading" className="font-semibold mb-1">Goal Timeline:</div>
            <ul className="list-none" aria-label="Chronological list of goals scored">
              {[...ourGoals.map(g => ({...g, type: 'us'})), ...theirGoals.map(g => ({...g, type: 'them'}))]
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((goal, index) => (
                  <li key={index} className={`text-xs ${goal.type === 'us' ? 'text-green-600' : 'text-red-600'}`}>
                    {goal.time} - {goal.type === 'us' ? 'Us' : 'Them'} (min {goal.minute})
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>

      {/* Save Game / Export / Clear */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-center gap-2 flex-wrap">
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded-lg"
            onClick={saveGame}
          >
            Save Game
          </button>
        </div>

        {savedGames.length > 0 && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold mb-3 text-center">Export Options</h3>
            
            {/* Quick Export Buttons */}
            <div className="flex justify-center gap-2 flex-wrap mb-3">
              <button
                onClick={exportFullBackup}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
                title="Download complete backup file"
              >
                Full Backup
              </button>
              
              <CSVLink
                data={generateEnhancedCSV()}
                filename={`soccer_stats_${new Date().toISOString().split('T')[0]}.csv`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Export CSV
              </CSVLink>

              <button
                onClick={() => setShowExportModal(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Custom Export
              </button>
            </div>

            {/* Additional Options */}
            <div className="flex justify-center gap-2 flex-wrap">
              <CSVLink
                data={savedGames}
                filename={`soccer_stats_raw_${new Date().toISOString().split('T')[0]}.csv`}
                className="bg-gray-600 text-white px-3 py-2 rounded-lg text-xs"
              >
                Raw Data
              </CSVLink>
              
              <button
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
                onClick={clearAllData}
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Custom Export Options</h3>
            
            {/* Date Range */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date (optional)</label>
                <input
                  type="date"
                  value={exportOptions.startDate}
                  onChange={(e) => setExportOptions({...exportOptions, startDate: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">End Date (optional)</label>
                <input
                  type="date"
                  value={exportOptions.endDate}
                  onChange={(e) => setExportOptions({...exportOptions, endDate: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            {/* Opponent Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Opponent (optional)</label>
              <select
                value={exportOptions.selectedOpponent}
                onChange={(e) => setExportOptions({...exportOptions, selectedOpponent: e.target.value})}
                className="w-full p-2 border rounded"
              >
                <option value="">All Opponents</option>
                {getUniqueOpponents().map(opponent => (
                  <option key={opponent} value={opponent}>{opponent}</option>
                ))}
              </select>
            </div>

            {/* Preview */}
            <div className="mb-4 p-3 bg-gray-100 rounded">
              <p className="text-sm text-gray-700">
                <strong>Preview:</strong> {getFilteredGames().length} games match your criteria
              </p>
            </div>

            {/* Export Buttons */}
            <div className="space-y-2">
              <button
                onClick={exportFilteredData}
                className="w-full bg-blue-600 text-white py-2 rounded-lg"
                disabled={getFilteredGames().length === 0}
              >
                Export Filtered Games (JSON)
              </button>
              
              <button
                onClick={generateDetailedReport}
                className="w-full bg-green-600 text-white py-2 rounded-lg"
                disabled={getFilteredGames().length === 0}
              >
                Generate Report (JSON)
              </button>
              
              <button
                onClick={() => setShowExportModal(false)}
                className="w-full bg-gray-500 text-white py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

  {/* Live Dashboard */}
{savedGames.length > 0 && (
  <div className="mb-6 border rounded-lg p-4 bg-green-50">
    <h2 className="text-lg font-bold mb-3 text-center">Season Dashboard</h2>
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{savedGames.length}</div>
        <div className="text-sm text-gray-600">Games Played</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold">
          <span className="text-green-600">{savedGames.filter(g => g.gameResult === 'Win').length}W</span>
          <span className="mx-1">-</span>
          <span className="text-red-600">{savedGames.filter(g => g.gameResult === 'Loss').length}L</span>
          <span className="mx-1">-</span>
          <span className="text-gray-600">{savedGames.filter(g => g.gameResult === 'Tie').length}T</span>
        </div>
        <div className="text-sm text-gray-600">Record</div>
      </div>
    </div>
    
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
      <div>
        <div className="text-xl font-bold text-orange-600">
          {savedGames.reduce((sum, game) => sum + (game.ourGoals || 0), 0)}
        </div>
        <div className="text-xs text-gray-600">Goals Scored</div>
      </div>
      <div>
        <div className="text-xl font-bold text-purple-600">
          {savedGames.reduce((sum, game) => sum + (game.assists || 0), 0)}
        </div>
        <div className="text-xs text-gray-600">Assists</div>
      </div>
      <div>
        <div className="text-xl font-bold text-indigo-600">
          {savedGames.reduce((sum, game) => sum + (game.totalShots || 0), 0)}
        </div>
        <div className="text-xs text-gray-600">Shots Taken</div>
      </div>
      <div>
        <div className="text-xl font-bold text-teal-600">
          {savedGames.reduce((sum, game) => sum + (game.cornerConversions || 0), 0)}
        </div>
        <div className="text-xs text-gray-600">Corner Goals</div>
      </div>
    </div>

    {/* Game Type Breakdown */}
    <div className="p-3 bg-blue-50 rounded">
      <h3 className="font-semibold mb-3 text-center text-sm">By Game Type</h3>
      <div className="space-y-2">
        {['League', 'Tournament', 'Showcase', 'Scrimmage'].map(type => {
          const typeGames = savedGames.filter(g => g.gameType === type);
          if (typeGames.length === 0) return null;
          
          const typeWins = typeGames.filter(g => g.gameResult === 'Win').length;
          const typeLosses = typeGames.filter(g => g.gameResult === 'Loss').length;
          const typeTies = typeGames.filter(g => g.gameResult === 'Tie').length;
          
          return (
            <div key={type} className="flex justify-between items-center text-sm">
              <span className="font-medium">{type}:</span>
              <span className="text-xs">
                {typeGames.length} games ({typeWins}W-{typeLosses}L-{typeTies}T)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
)}
      {/* Game History */}
      <GameHistory savedGames={savedGames} onUpdateGame={handleGameUpdate} onDeleteGame={handleGameDelete} />
    </div>
  );
}