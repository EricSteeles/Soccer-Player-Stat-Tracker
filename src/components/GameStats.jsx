import React, { useState, useEffect } from "react";
import GameTimer from "./Timers"; // Halftime Minutes
import PlayerTimer from "./PlayerTimer"; // Player Minutes
import GameHistory from "./GameHistory"; // Game History Component
import { CSVLink } from "react-csv";
import { gameService, DatabaseError } from "../firebase/database";

export default function GameStats({ userPin, onSwitchPlayer }) {
  // Game info
  const [date, setDate] = useState(() => {
    try {
      const now = new Date();
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

  // Timer states
  const [halftimeMinutes, setHalftimeMinutes] = useState(30);
  const [halftimeSeconds, setHalftimeSeconds] = useState(0);
  const [playerMinutes, setPlayerMinutes] = useState(0);

  // Goal tracking
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const MAX_GOALS_PER_GAME = 20;

  const [ourGoals, setOurGoals] = useState([]);
  const [theirGoals, setTheirGoals] = useState([]);

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
  
  // Offensive 1v1 stats
  const [offensive1v1Attempts, setOffensive1v1Attempts] = useState(0);
  const [offensive1v1Won, setOffensive1v1Won] = useState(0);
  
  // Defensive 1v1 stats
  const [defensive1v1Attempts, setDefensive1v1Attempts] = useState(0);
  const [defensive1v1Won, setDefensive1v1Won] = useState(0);
  
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
  
  // Defensive stats
  const [defensiveTackles, setDefensiveTackles] = useState(0);
  const [defensiveFailures, setDefensiveFailures] = useState(0);
  const [defensiveDisruption, setDefensiveDisruption] = useState(0);
  const [defensiveDistribution, setDefensiveDistribution] = useState(0);

  // Game notes field
  const [gameNotes, setGameNotes] = useState("");

  // Saved games and Firebase state
  const [savedGames, setSavedGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus(true);
      gameService.goOnline();
      loadGamesFromFirebase();
    };
    
    const handleOffline = () => {
      setNetworkStatus(false);
      gameService.goOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load games from Firebase
  const loadGamesFromFirebase = async () => {
    try {
      setSyncStatus('syncing');
      const games = await gameService.loadGames();
      
      const compatibleGames = games.map(game => ({
        ...game,
        date: game.date || '',
        createdAt: game.createdAt ? new Date(game.createdAt).toISOString() : new Date().toISOString()
      }));
      
      setSavedGames(compatibleGames);
      setLastSyncTime(new Date());
      setSyncStatus('synced');
    } catch (error) {
      console.error('Failed to load games:', error);
      setSyncStatus('error');
      
      try {
        const fallback = localStorage.getItem(`soccerStatsSavedGames_${userPin}`);
        if (fallback) {
          const fallbackGames = JSON.parse(fallback);
          setSavedGames(fallbackGames);
          console.info('Loaded games from localStorage fallback');
        }
      } catch (fallbackError) {
        console.error('Fallback loading failed:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (userPin) {
      loadGamesFromFirebase();
    }
  }, [userPin]);

  // Fallback save to localStorage
  const saveToLocalStorage = (games) => {
    try {
      localStorage.setItem(`soccerStatsSavedGames_${userPin}`, JSON.stringify(games));
      localStorage.setItem('soccerStatsLastSync', new Date().toISOString());
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  };

  // Get unique player names and opponents from saved games
  const getUniquePlayerNames = () => {
    const names = savedGames.map(game => game.playerName).filter(name => name && name.trim() !== '');
    return [...new Set(names)].sort();
  };

  const getUniqueOpponents = () => {
    const opponents = savedGames.map(game => game.opponent).filter(opponent => opponent && opponent.trim() !== '');
    return [...new Set(opponents)].sort();
  };

  // Helpers with validation
  const increment = (setter, value) => setter(value + 1);
  const decrement = (setter, value) => setter(value > 0 ? value - 1 : 0);

  // Input sanitization helper
  const sanitizeInput = (input) => {
    if (!input || typeof input !== 'string') return input;
    
    const dangerous = /^[=+\-@]/;
    if (dangerous.test(input.trim())) {
      return `'${input}`;
    }
    
    return input.replace(/[\x00-\x1F\x7F]/g, '');
  };

  // Data validation helper
  const validateStats = (stats) => {
    const warnings = [];
    
    if ((stats.goalsLeft || 0) > (stats.shotsLeft || 0)) {
      warnings.push('Left foot goals exceed shots');
    }
    if ((stats.goalsRight || 0) > (stats.shotsRight || 0)) {
      warnings.push('Right foot goals exceed shots');
    }
    if ((stats.cornerConversions || 0) > (stats.cornersTaken || 0)) {
      warnings.push('Corner conversions exceed corners taken');
    }
    if ((stats.offensive1v1Won || 0) > (stats.offensive1v1Attempts || 0)) {
      warnings.push('Offensive 1v1 won exceed attempts');
    }
    if ((stats.defensive1v1Won || 0) > (stats.defensive1v1Attempts || 0)) {
      warnings.push('Defensive 1v1 won exceed attempts');
    }
    if ((stats.freeKicksMade || 0) > (stats.freeKicksTaken || 0)) {
      warnings.push('Free kicks made exceed attempts');
    }
    if ((stats.defensiveFailures || 0) > (stats.defensiveTackles || 0)) {
      warnings.push('Defensive failures exceed tackles');
    }
    if ((stats.defensiveDistribution || 0) > (stats.defensiveDisruption || 0)) {
      warnings.push('Defensive distribution exceed disruption');
    }
    
    return warnings;
  };

  // Format seconds to MM:SS
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const saveGame = async () => {
    const currentStats = {
      goalsLeft, goalsRight, shotsLeft, shotsRight,
      cornersTaken, cornerConversions, offensive1v1Attempts, offensive1v1Won,
      defensive1v1Attempts, defensive1v1Won, freeKicksTaken, freeKicksMade,
      defensiveTackles, defensiveFailures, defensiveDisruption, defensiveDistribution
    };
    
    const warnings = validateStats(currentStats);
    if (warnings.length > 0) {
      const message = 'Data validation warnings:\n' + warnings.join('\n') + '\n\nSave anyway?';
      if (!window.confirm(message)) {
        return;
      }
    }

    setIsSaving(true);
    setSyncStatus('syncing');

    try {
      const halftimeRemaining = Math.max(0, (halftimeMinutes * 60) - halftimeSeconds);
      const ourGoalCount = ourGoals.length;
      const theirGoalCount = theirGoals.length;
      
      let gameResult;
      if (ourGoalCount > theirGoalCount) {
        gameResult = 'Win';
      } else if (ourGoalCount < theirGoalCount) {
        gameResult = 'Loss';
      } else {
        gameResult = 'Tie';
      }
      
      const newGame = {
        date: sanitizeInput(date),
        playerName: sanitizeInput(playerName),
        opponent: sanitizeInput(opponent),
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
        goalsLeft, goalsRight, shotsLeft, shotsRight, assists, passCompletions,
        cornersTaken, cornerConversions, 
        // 1v1 stats
        offensive1v1Attempts, offensive1v1Won,
        defensive1v1Attempts, defensive1v1Won,
        // Existing stats
        fouls, cards, gkShotsSaved, gkGoalsAgainst,
        freeKicksTaken, freeKicksMade,
        // Defensive stats
        defensiveTackles, defensiveFailures, defensiveDisruption, defensiveDistribution,
        // Game notes
        gameNotes: sanitizeInput(gameNotes),
        // Calculated stats
        totalGoals: goalsLeft + goalsRight,
        totalShots: shotsLeft + shotsRight,
        goalConversionRate: (shotsLeft + shotsRight) > 0 ? ((goalsLeft + goalsRight) / (shotsLeft + shotsRight) * 100).toFixed(1) + '%' : '0%',
        cornerConversionRate: cornersTaken > 0 ? ((cornerConversions / cornersTaken) * 100).toFixed(1) + '%' : '0%',
        // Calculated percentages
        offensive1v1Rate: offensive1v1Attempts > 0 ? ((offensive1v1Won / offensive1v1Attempts) * 100).toFixed(1) + '%' : '0%',
        defensive1v1Rate: defensive1v1Attempts > 0 ? ((defensive1v1Won / defensive1v1Attempts) * 100).toFixed(1) + '%' : '0%',
        freeKickConversionRate: freeKicksTaken > 0 ? ((freeKicksMade / freeKicksTaken) * 100).toFixed(1) + '%' : '0%',
        defensiveTackleRate: defensiveTackles > 0 ? (((defensiveTackles - defensiveFailures) / defensiveTackles) * 100).toFixed(1) + '%' : '0%',
        defensiveDistributionRate: defensiveDisruption > 0 ? ((defensiveDistribution / defensiveDisruption) * 100).toFixed(1) + '%' : '0%',
      };

      // Save to Firebase
      const savedGame = await gameService.saveGame(newGame);
      
      const updatedGames = [savedGame, ...savedGames];
      setSavedGames(updatedGames);
      
      saveToLocalStorage(updatedGames);
      
      setLastSyncTime(new Date());
      setSyncStatus('synced');
      
      // Reset stats
      setGoalsLeft(0); setGoalsRight(0); setShotsLeft(0); setShotsRight(0);
      setAssists(0); setPassCompletions(0); setCornersTaken(0); setCornerConversions(0);
      setOffensive1v1Attempts(0); setOffensive1v1Won(0);
      setDefensive1v1Attempts(0); setDefensive1v1Won(0);
      setFouls(0); setCards(0); setGkShotsSaved(0); setGkGoalsAgainst(0);
      setFreeKicksTaken(0); setFreeKicksMade(0);
      setDefensiveTackles(0); setDefensiveFailures(0);
      setDefensiveDisruption(0); setDefensiveDistribution(0);
      setOurGoals([]); setTheirGoals([]); setGameNotes("");
      
    } catch (error) {
      console.error('Failed to save game:', error);
      setSyncStatus('error');
      
      if (error instanceof DatabaseError) {
        alert(`Save failed: ${error.message}. Your data has been saved locally and will sync when connection is restored.`);
      } else {
        alert('Failed to save game to cloud. Data saved locally and will sync later.');
      }
      
      // Save locally as fallback with all stats...
      const halftimeRemaining = Math.max(0, (halftimeMinutes * 60) - halftimeSeconds);
      const ourGoalCount = ourGoals.length;
      const theirGoalCount = theirGoals.length;
      
      let gameResult;
      if (ourGoalCount > theirGoalCount) {
        gameResult = 'Win';
      } else if (ourGoalCount < theirGoalCount) {
        gameResult = 'Loss';
      } else {
        gameResult = 'Tie';
      }
      
      const newGame = {
        id: `local_${Date.now()}`,
        date: sanitizeInput(date),
        playerName: sanitizeInput(playerName),
        opponent: sanitizeInput(opponent),
        gameType,
        ourGoals: ourGoalCount,
        theirGoals: theirGoalCount,
        gameResult,
        goalHistory: { our: ourGoals, their: theirGoals },
        halftimeMinutes,
        halftimeElapsed: formatTime(halftimeSeconds),
        halftimeRemaining: formatTime(halftimeRemaining),
        halftimeComplete: halftimeSeconds >= (halftimeMinutes * 60),
        playerMinutesPlayed: formatTime(playerMinutes),
        playerSecondsPlayed: playerMinutes,
        goalsLeft, goalsRight, shotsLeft, shotsRight, assists, passCompletions,
        cornersTaken, cornerConversions,
        offensive1v1Attempts, offensive1v1Won,
        defensive1v1Attempts, defensive1v1Won,
        fouls, cards, gkShotsSaved, gkGoalsAgainst,
        freeKicksTaken, freeKicksMade,
        defensiveTackles, defensiveFailures, defensiveDisruption, defensiveDistribution,
        gameNotes: sanitizeInput(gameNotes),
        totalGoals: goalsLeft + goalsRight,
        totalShots: shotsLeft + shotsRight,
        goalConversionRate: (shotsLeft + shotsRight) > 0 ? ((goalsLeft + goalsRight) / (shotsLeft + shotsRight) * 100).toFixed(1) + '%' : '0%',
        cornerConversionRate: cornersTaken > 0 ? ((cornerConversions / cornersTaken) * 100).toFixed(1) + '%' : '0%',
        offensive1v1Rate: offensive1v1Attempts > 0 ? ((offensive1v1Won / offensive1v1Attempts) * 100).toFixed(1) + '%' : '0%',
        defensive1v1Rate: defensive1v1Attempts > 0 ? ((defensive1v1Won / defensive1v1Attempts) * 100).toFixed(1) + '%' : '0%',
        freeKickConversionRate: freeKicksTaken > 0 ? ((freeKicksMade / freeKicksTaken) * 100).toFixed(1) + '%' : '0%',
        defensiveTackleRate: defensiveTackles > 0 ? (((defensiveTackles - defensiveFailures) / defensiveTackles) * 100).toFixed(1) + '%' : '0%',
        defensiveDistributionRate: defensiveDisruption > 0 ? ((defensiveDistribution / defensiveDisruption) * 100).toFixed(1) + '%' : '0%',
        createdAt: new Date().toISOString()
      };
      
      const updatedGames = [newGame, ...savedGames];
      setSavedGames(updatedGames);
      saveToLocalStorage(updatedGames);
      
      // Reset stats anyway
      setGoalsLeft(0); setGoalsRight(0); setShotsLeft(0); setShotsRight(0);
      setAssists(0); setPassCompletions(0); setCornersTaken(0); setCornerConversions(0);
      setOffensive1v1Attempts(0); setOffensive1v1Won(0);
      setDefensive1v1Attempts(0); setDefensive1v1Won(0);
      setFouls(0); setCards(0); setGkShotsSaved(0); setGkGoalsAgainst(0);
      setFreeKicksTaken(0); setFreeKicksMade(0);
      setDefensiveTackles(0); setDefensiveFailures(0);
      setDefensiveDisruption(0); setDefensiveDistribution(0);
      setOurGoals([]); setTheirGoals([]); setGameNotes("");
    } finally {
      setIsSaving(false);
    }
  };

  const clearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all saved games? This cannot be undone.')) {
      try {
        setSyncStatus('syncing');
        await gameService.clearAllGames();
        setSavedGames([]);
        localStorage.removeItem(`soccerStatsSavedGames_${userPin}`);
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      } catch (error) {
        console.error('Failed to clear games:', error);
        setSyncStatus('error');
        alert('Failed to clear all games from cloud. Please try again.');
      }
    }
  };

  // Handle game updates from GameHistory component
  const handleGameUpdate = async (gameIndex, updatedGame) => {
    try {
      const game = savedGames[gameIndex];
      if (game.id && !game.id.startsWith('local_')) {
        await gameService.updateGame(game.id, updatedGame);
      }
      
      const newSavedGames = [...savedGames];
      newSavedGames[gameIndex] = { ...updatedGame, id: game.id };
      setSavedGames(newSavedGames);
      saveToLocalStorage(newSavedGames);
      
    } catch (error) {
      console.error('Failed to update game:', error);
      alert('Failed to update game. Changes saved locally.');
      
      const newSavedGames = [...savedGames];
      newSavedGames[gameIndex] = updatedGame;
      setSavedGames(newSavedGames);
      saveToLocalStorage(newSavedGames);
    }
  };

  // Handle game deletion from GameHistory component
  const handleGameDelete = async (gameIndex) => {
    try {
      const game = savedGames[gameIndex];
      if (game.id && !game.id.startsWith('local_')) {
        await gameService.deleteGame(game.id);
      }
      
      const newSavedGames = savedGames.filter((_, index) => index !== gameIndex);
      setSavedGames(newSavedGames);
      saveToLocalStorage(newSavedGames);
      
    } catch (error) {
      console.error('Failed to delete game:', error);
      alert('Failed to delete game from cloud. Removed locally.');
      
      const newSavedGames = savedGames.filter((_, index) => index !== gameIndex);
      setSavedGames(newSavedGames);
      saveToLocalStorage(newSavedGames);
    }
  };

  // Enhanced export functionality
  const generateEnhancedCSV = () => {
    if (savedGames.length === 0) return [];

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
          'Offensive 1v1 Attempts': game.offensive1v1Attempts || 0,
          'Offensive 1v1 Won': game.offensive1v1Won || 0,
          'Offensive 1v1 Success Rate': game.offensive1v1Rate || '0%',
          'Defensive 1v1 Attempts': game.defensive1v1Attempts || 0,
          'Defensive 1v1 Won': game.defensive1v1Won || 0,
          'Defensive 1v1 Success Rate': game.defensive1v1Rate || '0%',
          'Free Kicks Taken': game.freeKicksTaken || 0,
          'Free Kicks Made': game.freeKicksMade || 0,
          'Free Kick Conversion Rate': game.freeKickConversionRate || '0%',
          'Defensive Tackles': game.defensiveTackles || 0,
          'Defensive Failures': game.defensiveFailures || 0,
          'Defensive Tackle Success Rate': game.defensiveTackleRate || '0%',
          'Defensive Disruption': game.defensiveDisruption || 0,
          'Defensive Distribution': game.defensiveDistribution || 0,
          'Defensive Distribution Rate': game.defensiveDistributionRate || '0%',
          'Fouls': game.fouls || 0,
          'Cards (Red/Yellow)': game.cards || 0,
          'GK Shots Saved': game.gkShotsSaved || 0,
          'GK Goals Against': game.gkGoalsAgainst || 0,
          'Player Minutes Played': game.playerMinutesPlayed || '0:00',
          'Halftime Duration': `${game.halftimeMinutes || 0} min`,
          'Halftime Completed': game.halftimeComplete ? 'Yes' : 'No',
          'Goal Timeline': sanitizeInput(goalTimeline),
          'Game Notes': sanitizeInput(game.gameNotes) || 'No notes',
          'Sync Status': game.id?.startsWith('local_') ? 'Local Only' : 'Synced',
          'User PIN': userPin
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
    const localOnlyGames = savedGames.filter(g => g.id?.startsWith('local_')).length;
    
    const summaryRow = {
      'Game #': 'SUMMARY',
      'Date': `${totalGames} Total Games`,
      'Player Name': `Last Sync: ${lastSyncTime ? lastSyncTime.toLocaleString() : 'Never'}`,
      'Opponent': `Record: ${wins}W-${losses}L-${ties}T`,
      'Result': `Win Rate: ${winPercentage}`,
      'Final Score (Us-Them)': `Local Only: ${localOnlyGames} games`,
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
      'Offensive 1v1 Attempts': savedGames.reduce((sum, game) => sum + (game.offensive1v1Attempts || 0), 0),
      'Offensive 1v1 Won': savedGames.reduce((sum, game) => sum + (game.offensive1v1Won || 0), 0),
      'Offensive 1v1 Success Rate': '',
      'Defensive 1v1 Attempts': savedGames.reduce((sum, game) => sum + (game.defensive1v1Attempts || 0), 0),
      'Defensive 1v1 Won': savedGames.reduce((sum, game) => sum + (game.defensive1v1Won || 0), 0),
      'Defensive 1v1 Success Rate': '',
      'Free Kicks Taken': savedGames.reduce((sum, game) => sum + (game.freeKicksTaken || 0), 0),
      'Free Kicks Made': savedGames.reduce((sum, game) => sum + (game.freeKicksMade || 0), 0),
      'Free Kick Conversion Rate': '',
      'Defensive Tackles': savedGames.reduce((sum, game) => sum + (game.defensiveTackles || 0), 0),
      'Defensive Failures': savedGames.reduce((sum, game) => sum + (game.defensiveFailures || 0), 0),
      'Defensive Tackle Success Rate': '',
      'Defensive Disruption': savedGames.reduce((sum, game) => sum + (game.defensiveDisruption || 0), 0),
      'Defensive Distribution': savedGames.reduce((sum, game) => sum + (game.defensiveDistribution || 0), 0),
      'Defensive Distribution Rate': '',
      'Fouls': savedGames.reduce((sum, game) => sum + (game.fouls || 0), 0),
      'Cards (Red/Yellow)': savedGames.reduce((sum, game) => sum + (game.cards || 0), 0),
      'GK Shots Saved': savedGames.reduce((sum, game) => sum + (game.gkShotsSaved || 0), 0),
      'GK Goals Against': savedGames.reduce((sum, game) => sum + (game.gkGoalsAgainst || 0), 0),
      'Player Minutes Played': '',
      'Halftime Duration': '',
      'Halftime Completed': '',
      'Goal Timeline': '',
      'Game Notes': '',
      'Sync Status': networkStatus ? 'Online' : 'Offline',
      'User PIN': userPin
    };

    return [summaryRow, ...chunks];
  };

  // Handle switch player request
  const handleSwitchPlayer = () => {
    if (window.confirm('Switch to a different player? Any unsaved data will be lost.')) {
      onSwitchPlayer();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-bold mb-2">Loading Soccer Stat Tracker...</div>
          <div className="text-gray-600">Syncing your game data for PIN: {userPin}</div>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* UPDATED Header with Switch Player button */}
      <div className="text-center mb-4">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-2xl font-bold flex-1">Soccer Stat Tracker</h1>
          <button
            onClick={handleSwitchPlayer}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm ml-2"
            title="Switch to a different player"
          >
            Switch Player
          </button>
        </div>
        
        <div className="flex items-center justify-center space-x-2 text-sm mb-2">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">PIN: {userPin}</span>
        </div>
        
        <div className="flex items-center justify-center space-x-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${
            syncStatus === 'synced' ? 'bg-green-500' : 
            syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' : 
            syncStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
          }`}></div>
          <span className={`${
            syncStatus === 'synced' ? 'text-green-600' : 
            syncStatus === 'syncing' ? 'text-yellow-600' : 
            syncStatus === 'error' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {syncStatus === 'synced' ? `Synced ${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : ''}` : 
             syncStatus === 'syncing' ? 'Syncing...' : 
             syncStatus === 'error' ? 'Sync Error' : 'Offline'}
          </span>
          <span className={`text-xs ${networkStatus ? 'text-green-500' : 'text-red-500'}`}>
            {networkStatus ? '🌐' : '📵'}
          </span>
        </div>
      </div>

      {/* Game info */}
      <div className="space-y-3 mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Date"
        />
        
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

      {/* Timers */}
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

      {/* Stats - Updated with new categories */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[
          { label: "Goals Left Foot", value: goalsLeft, setter: setGoalsLeft },
          { label: "Goals Right Foot", value: goalsRight, setter: setGoalsRight },
          { label: "Shots Left Foot", value: shotsLeft, setter: setShotsLeft },
          { label: "Shots Right Foot", value: shotsRight, setter: setShotsRight },
          { label: "Assists", value: assists, setter: setAssists },
          { label: "Pass Completions", value: passCompletions, setter: setPassCompletions },
          { label: "Corners Taken", value: cornersTaken, setter: setCornersTaken },
          { label: "Corner Conversions", value: cornerConversions, setter: setCornerConversions },
          { label: "Offensive 1v1 Attempts", value: offensive1v1Attempts, setter: setOffensive1v1Attempts },
          { label: "Offensive 1v1 Won", value: offensive1v1Won, setter: setOffensive1v1Won },
          { label: "Defensive 1v1 Attempts", value: defensive1v1Attempts, setter: setDefensive1v1Attempts },
          { label: "Defensive 1v1 Won", value: defensive1v1Won, setter: setDefensive1v1Won },
          { label: "Free Kicks Taken", value: freeKicksTaken, setter: setFreeKicksTaken },
          { label: "Free Kicks Made", value: freeKicksMade, setter: setFreeKicksMade },
          { label: "Defensive Tackles", value: defensiveTackles, setter: setDefensiveTackles },
          { label: "Defensive Failures", value: defensiveFailures, setter: setDefensiveFailures },
          { label: "Defensive Disruption", value: defensiveDisruption, setter: setDefensiveDisruption },
          { label: "Defensive Distribution", value: defensiveDistribution, setter: setDefensiveDistribution },
          { label: "Fouls", value: fouls, setter: setFouls },
          { label: "Red/Yellow Cards", value: cards, setter: setCards },
          { label: "GK - Shots Saved", value: gkShotsSaved, setter: setGkShotsSaved },
          { label: "GK - Goals Against", value: gkGoalsAgainst, setter: setGkGoalsAgainst },
        ].map((stat, index) => (
          <div key={index} className="flex flex-col items-center">
            <label className="mb-1 font-medium text-center text-sm" id={`stat-${index}-label`}>
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

      {/* Game Notes Field */}
      <div className="mb-4">
        <label htmlFor="gameNotes" className="block text-sm font-medium mb-2">Game Notes/Comments</label>
        <textarea
          id="gameNotes"
          value={gameNotes}
          onChange={(e) => setGameNotes(sanitizeInput(e.target.value))}
          placeholder="Add notes about the game, memorable plays, conditions, etc."
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          rows="3"
          maxLength={500}
        />
        <div className="text-xs text-gray-500 mt-1">
          {gameNotes.length}/500 characters
        </div>
      </div>

      {/* Goal Tracking */}
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
            className={`px-6 py-2 rounded-lg text-white ${
              isSaving 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={saveGame}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Game'}
          </button>
        </div>

        {savedGames.length > 0 && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold mb-3 text-center">Export Options</h3>
            
            <div className="flex justify-center gap-2 flex-wrap mb-3">
              <CSVLink
                data={generateEnhancedCSV()}
                filename={`soccer_stats_pin${userPin}_${new Date().toISOString().split('T')[0]}.csv`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Export CSV
              </CSVLink>
            </div>

            <div className="flex justify-center gap-2 flex-wrap">
              <CSVLink
                data={savedGames}
                filename={`soccer_stats_raw_pin${userPin}_${new Date().toISOString().split('T')[0]}.csv`}
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
      <GameHistory 
        savedGames={savedGames} 
        onUpdateGame={handleGameUpdate} 
        onDeleteGame={handleGameDelete} 
      />
    </div>
  );
}