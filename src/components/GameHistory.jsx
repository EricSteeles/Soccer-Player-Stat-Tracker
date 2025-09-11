import React, { useState } from "react";

export default function GameHistory({ savedGames, onUpdateGame, onDeleteGame }) {
  const [expandedGame, setExpandedGame] = useState(null);
  const [editingGame, setEditingGame] = useState(null);
  const [filterOpponent, setFilterOpponent] = useState('');
  const [editFormData, setEditFormData] = useState({});

  // Get unique opponents for filter dropdown
  const opponents = [...new Set(savedGames.map(game => game.opponent).filter(Boolean))];

  // Filter games by opponent
  const filteredGames = filterOpponent 
    ? savedGames.filter(game => game.opponent === filterOpponent)
    : savedGames;

  const toggleGame = (index) => {
    setExpandedGame(expandedGame === index ? null : index);
  };

  const getResultColor = (result) => {
    switch(result) {
      case 'Win': return 'text-green-600 bg-green-50 border-green-200';
      case 'Loss': return 'text-red-600 bg-red-50 border-red-200';
      case 'Tie': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getGameResult = (game) => {
    if (game.gameResult) {
      return game.gameResult;
    }
    return 'No Result';
  };

  const getGameScore = (game) => {
    if (game.ourGoals !== undefined && game.theirGoals !== undefined) {
      return `${game.ourGoals} - ${game.theirGoals}`;
    }
    return 'No Score';
  };

  // Helper function to check if a stat category has any values > 0
  const hasStats = (game, fields) => {
    return fields.some(field => (game[field] || 0) > 0);
  };

  // Helper functions for time conversion
  const parseTimeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return (minutes * 60) + (seconds || 0);
  };

  const formatSecondsToTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const startEditing = (gameIndex) => {
    const game = filteredGames[gameIndex];
    setEditingGame(gameIndex);
    setEditFormData({
      date: game.date || '',
      playerName: game.playerName || '',
      opponent: game.opponent || '',
      ourGoals: game.ourGoals || 0,
      theirGoals: game.theirGoals || 0,
      goalsLeft: game.goalsLeft || 0,
      goalsRight: game.goalsRight || 0,
      shotsLeft: game.shotsLeft || 0,
      shotsRight: game.shotsRight || 0,
      assists: game.assists || 0,
      passCompletions: game.passCompletions || 0,
      cornersTaken: game.cornersTaken || 0,
      cornerConversions: game.cornerConversions || 0,
      fouls: game.fouls || 0,
      cards: game.cards || 0,
      gkShotsSaved: game.gkShotsSaved || 0,
      gkGoalsAgainst: game.gkGoalsAgainst || 0,
      playerMinutesPlayed: game.playerMinutesPlayed || '0:00',
      gameNotes: game.gameNotes || '',
      goalHistory: {
        our: game.goalHistory?.our ? [...game.goalHistory.our] : [],
        their: game.goalHistory?.their ? [...game.goalHistory.their] : []
      }
    });
  };

  const cancelEditing = () => {
    setEditingGame(null);
    setEditFormData({});
  };

  const handleDelete = (gameIndex) => {
    const game = filteredGames[gameIndex];
    const confirmMessage = `Delete game: ${game.date || 'No date'} vs ${game.opponent || 'No opponent'}?`;
    
    if (window.confirm(confirmMessage)) {
      const actualIndex = savedGames.findIndex(g => g === game);
      if (onDeleteGame && actualIndex !== -1) {
        onDeleteGame(actualIndex);
      }
    }
  };

  // Goal editing functions
  const addOurGoal = () => {
    const newGoal = {
      time: '0:00',
      minute: 0,
      timestamp: Date.now()
    };
    setEditFormData(prev => ({
      ...prev,
      goalHistory: {
        ...prev.goalHistory,
        our: [...prev.goalHistory.our, newGoal]
      },
      ourGoals: prev.goalHistory.our.length + 1
    }));
  };

  const addTheirGoal = () => {
    const newGoal = {
      time: '0:00',
      minute: 0,
      timestamp: Date.now()
    };
    setEditFormData(prev => ({
      ...prev,
      goalHistory: {
        ...prev.goalHistory,
        their: [...prev.goalHistory.their, newGoal]
      },
      theirGoals: prev.goalHistory.their.length + 1
    }));
  };

  const removeOurGoal = (index) => {
    setEditFormData(prev => {
      const newOurGoals = prev.goalHistory.our.filter((_, i) => i !== index);
      return {
        ...prev,
        goalHistory: {
          ...prev.goalHistory,
          our: newOurGoals
        },
        ourGoals: newOurGoals.length
      };
    });
  };

  const removeTheirGoal = (index) => {
    setEditFormData(prev => {
      const newTheirGoals = prev.goalHistory.their.filter((_, i) => i !== index);
      return {
        ...prev,
        goalHistory: {
          ...prev.goalHistory,
          their: newTheirGoals
        },
        theirGoals: newTheirGoals.length
      };
    });
  };

  const updateGoalTime = (team, goalIndex, newTime) => {
    const minutes = parseTimeToSeconds(newTime) / 60;
    setEditFormData(prev => ({
      ...prev,
      goalHistory: {
        ...prev.goalHistory,
        [team]: prev.goalHistory[team].map((goal, index) => 
          index === goalIndex 
            ? { ...goal, time: newTime, minute: Math.floor(minutes) }
            : goal
        )
      }
    }));
  };

  const saveEdit = () => {
    if (onUpdateGame) {
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
        
        return warnings;
      };

      const warnings = validateStats(editFormData);
      if (warnings.length > 0) {
        const message = 'Data validation warnings:\n' + warnings.join('\n') + '\n\nSave anyway?';
        if (!window.confirm(message)) {
          return;
        }
      }

      const gameIndex = savedGames.findIndex(g => g === filteredGames[editingGame]);
      const playerSeconds = parseTimeToSeconds(editFormData.playerMinutesPlayed);
      
      const updatedGame = {
        ...filteredGames[editingGame],
        ...editFormData,
        ourGoals: editFormData.goalHistory.our.length,
        theirGoals: editFormData.goalHistory.their.length,
        playerMinutesPlayed: editFormData.playerMinutesPlayed,
        playerSecondsPlayed: playerSeconds,
        totalGoals: (editFormData.goalsLeft || 0) + (editFormData.goalsRight || 0),
        totalShots: (editFormData.shotsLeft || 0) + (editFormData.shotsRight || 0),
        goalConversionRate: ((editFormData.shotsLeft || 0) + (editFormData.shotsRight || 0)) > 0 ? 
          (((editFormData.goalsLeft || 0) + (editFormData.goalsRight || 0)) / 
           ((editFormData.shotsLeft || 0) + (editFormData.shotsRight || 0)) * 100).toFixed(1) + '%' : '0%',
        cornerConversionRate: (editFormData.cornersTaken || 0) > 0 ? 
          (((editFormData.cornerConversions || 0) / (editFormData.cornersTaken || 0)) * 100).toFixed(1) + '%' : '0%',
        gameResult: editFormData.goalHistory.our.length > editFormData.goalHistory.their.length ? 'Win' : 
                   editFormData.goalHistory.our.length < editFormData.goalHistory.their.length ? 'Loss' : 'Tie'
      };
      
      onUpdateGame(gameIndex, updatedGame);
    }
    setEditingGame(null);
    setEditFormData({});
  };

  const handleInputChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: field === 'date' || field === 'playerName' || field === 'opponent' || field === 'playerMinutesPlayed' || field === 'gameNotes' 
        ? value 
        : Number(value)
    }));
  };

  if (savedGames.length === 0) {
    return (
      <div>
        <h2 className="text-center text-xl font-bold mb-2">Game History</h2>
        <p className="text-center text-gray-500 italic">No games saved yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Game History ({filteredGames.length} games)</h2>
        {opponents.length > 0 && (
          <select
            value={filterOpponent}
            onChange={(e) => setFilterOpponent(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">All Opponents</option>
            {opponents.map(opponent => (
              <option key={opponent} value={opponent}>{opponent}</option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-3">
        {filteredGames.map((game, index) => (
          <div key={index} className="border rounded-lg overflow-hidden bg-white shadow-sm">
            {/* Clickable Header */}
            <button
              onClick={() => toggleGame(index)}
              className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {game.playerName || 'Player'} vs {game.opponent || 'Opponent'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {game.date || 'No date'} • {game.playerMinutesPlayed || '0:00'} played
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getResultColor(getGameResult(game))}`}>
                    {getGameScore(game)} ({getGameResult(game)})
                  </div>
                  <div className="text-gray-400">
                    {expandedGame === index ? '▼' : '▶'}
                  </div>
                </div>
              </div>
            </button>

            {/* Expanded Details */}
            {expandedGame === index && (
              <div className="p-6 bg-white border-t">
                {editingGame === index ? (
                  // Edit Mode (keeping existing edit functionality)
                  <div className="space-y-3">
                    <h4 className="font-semibold mb-3">Edit Game</h4>
                    
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <input
                          type="date"
                          value={editFormData.date}
                          onChange={(e) => handleInputChange('date', e.target.value)}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Player Name</label>
                        <input
                          type="text"
                          value={editFormData.playerName}
                          onChange={(e) => handleInputChange('playerName', e.target.value)}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Opponent</label>
                        <input
                          type="text"
                          value={editFormData.opponent}
                          onChange={(e) => handleInputChange('opponent', e.target.value)}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                    </div>

                    {/* Player Time */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Player Time Played (MM:SS)</label>
                      <input
                        type="text"
                        value={editFormData.playerMinutesPlayed}
                        onChange={(e) => handleInputChange('playerMinutesPlayed', e.target.value)}
                        placeholder="25:30"
                        pattern="[0-9]{1,2}:[0-9]{2}"
                        className="w-full p-2 border rounded"
                      />
                      <div className="text-xs text-gray-500 mt-1">Format: MM:SS (e.g., 25:30 for 25 minutes 30 seconds)</div>
                    </div>

                    {/* Goal Timeline Editing */}
                    <div>
                      <h5 className="font-medium mb-2">Goal Timeline</h5>
                      
                      {/* Our Goals */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium">Our Goals ({editFormData.goalHistory.our.length})</label>
                          <button
                            type="button"
                            onClick={addOurGoal}
                            className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                          >
                            Add Goal
                          </button>
                        </div>
                        {editFormData.goalHistory.our.map((goal, goalIndex) => (
                          <div key={goalIndex} className="flex gap-2 mb-2 items-center">
                            <input
                              type="text"
                              value={goal.time}
                              onChange={(e) => updateGoalTime('our', goalIndex, e.target.value)}
                              placeholder="25:30"
                              pattern="[0-9]{1,2}:[0-9]{2}"
                              className="flex-1 p-1 border rounded text-sm"
                            />
                            <span className="text-xs text-gray-500">min {goal.minute}</span>
                            <button
                              type="button"
                              onClick={() => removeOurGoal(goalIndex)}
                              className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Their Goals */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium">Their Goals ({editFormData.goalHistory.their.length})</label>
                          <button
                            type="button"
                            onClick={addTheirGoal}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                          >
                            Add Goal
                          </button>
                        </div>
                        {editFormData.goalHistory.their.map((goal, goalIndex) => (
                          <div key={goalIndex} className="flex gap-2 mb-2 items-center">
                            <input
                              type="text"
                              value={goal.time}
                              onChange={(e) => updateGoalTime('their', goalIndex, e.target.value)}
                              placeholder="25:30"
                              pattern="[0-9]{1,2}:[0-9]{2}"
                              className="flex-1 p-1 border rounded text-sm"
                            />
                            <span className="text-xs text-gray-500">min {goal.minute}</span>
                            <button
                              type="button"
                              onClick={() => removeTheirGoal(goalIndex)}
                              className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Game Score */}
                    <div>
                      <h5 className="font-medium mb-2">Game Score</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Our Goals</label>
                          <input
                            type="number"
                            min="0"
                            value={editFormData.ourGoals}
                            onChange={(e) => handleInputChange('ourGoals', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Their Goals</label>
                          <input
                            type="number"
                            min="0"
                            value={editFormData.theirGoals}
                            onChange={(e) => handleInputChange('theirGoals', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Personal Stats */}
                    <div>
                      <h5 className="font-medium mb-2">Personal Stats</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Goals Left</label>
                          <input
                            type="number"
                            min="0"
                            value={editFormData.goalsLeft}
                            onChange={(e) => handleInputChange('goalsLeft', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Goals Right</label>
                          <input
                            type="number"
                            min="0"
                            value={editFormData.goalsRight}
                            onChange={(e) => handleInputChange('goalsRight', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Shots Left</label>
                          <input
                            type="number"
                            min="0"
                            value={editFormData.shotsLeft}
                            onChange={(e) => handleInputChange('shotsLeft', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Shots Right</label>
                          <input
                            type="number"
                            min="0"
                            value={editFormData.shotsRight}
                            onChange={(e) => handleInputChange('shotsRight', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Assists</label>
                          <input
                            type="number"
                            min="0"
                            value={editFormData.assists}
                            onChange={(e) => handleInputChange('assists', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Pass Completions</label>
                          <input
                            type="number"
                            min="0"
                            value={editFormData.passCompletions}
                            onChange={(e) => handleInputChange('passCompletions', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Corners Taken</label>
                          <input
                            type="number"
                            min="0"
                            value={editFormData.cornersTaken}
                            onChange={(e) => handleInputChange('cornersTaken', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Corner Conversions</label>
                          <input
                            type="number"
                            min="0"
                            value={editFormData.cornerConversions}
                            onChange={(e) => handleInputChange('cornerConversions', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Fouls</label>
                          <input
                            type="number"
                            min="0"
                            value={editFormData.fouls}
                            onChange={(e) => handleInputChange('fouls', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Cards</label>
                          <input
                            type="number"
                            min="0"
                            value={editFormData.cards}
                            onChange={(e) => handleInputChange('cards', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">GK Saves</label>
                          <input
                            type="number"
                            min="0"
                            value={editFormData.gkShotsSaved}
                            onChange={(e) => handleInputChange('gkShotsSaved', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">GK Goals Against</label>
                          <input
                            type="number"
                            min="0"
                            value={editFormData.gkGoalsAgainst}
                            onChange={(e) => handleInputChange('gkGoalsAgainst', e.target.value)}
                            className="w-full p-2 border rounded"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Game Notes */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Game Notes/Comments</label>
                      <textarea
                        value={editFormData.gameNotes}
                        onChange={(e) => handleInputChange('gameNotes', e.target.value)}
                        placeholder="Add notes about the game, memorable plays, conditions, etc."
                        className="w-full p-2 border rounded resize-none"
                        rows="3"
                        maxLength={500}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {(editFormData.gameNotes || '').length}/500 characters
                      </div>
                    </div>

                    {/* Save/Cancel Buttons */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={saveEdit}
                        className="bg-green-600 text-white px-4 py-2 rounded"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="bg-gray-500 text-white px-4 py-2 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // IMPROVED VIEW MODE
                  <div className="space-y-6">
                    {/* Game Summary Card - Hero Section */}
                    <div className={`p-4 rounded-lg border-2 ${getResultColor(getGameResult(game))}`}>
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-2">
                          {getGameScore(game)}
                        </div>
                        <div className="text-lg font-semibold mb-1">
                          {getGameResult(game)}
                        </div>
                        <div className="text-sm opacity-75">
                          {game.date || 'No date'} • {game.playerMinutesPlayed || '0:00'} played
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => startEditing(index)}
                        className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
                      >
                        Edit Game
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="bg-red-500 text-white px-4 py-2 rounded text-sm"
                      >
                        Delete Game
                      </button>
                    </div>

                    {/* Goal Timeline - Prominent Display */}
                    {game.goalHistory && (game.goalHistory.our.length > 0 || game.goalHistory.their.length > 0) && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-3 text-center text-blue-900">Goal Timeline</h4>
                        <div className="space-y-2">
                          {[...game.goalHistory.our.map(g => ({...g, type: 'us'})), 
                            ...game.goalHistory.their.map(g => ({...g, type: 'them'}))]
                            .sort((a, b) => a.timestamp - b.timestamp)
                            .map((goal, goalIndex) => (
                              <div key={goalIndex} className={`flex justify-between items-center p-2 rounded ${
                                goal.type === 'us' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                <span className="font-medium">
                                  {goal.type === 'us' ? '⚽ Us' : '⚽ Them'}
                                </span>
                                <span className="font-mono text-sm">
                                  {goal.time} (min {goal.minute})
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Conditional Stats Sections - Only show if stats exist */}
                    <div className="grid gap-4">
                      
                      {/* Scoring Stats */}
                      {hasStats(game, ['goalsLeft', 'goalsRight', 'shotsLeft', 'shotsRight']) && (
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-3 text-orange-900">Scoring</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {(game.totalGoals || 0) > 0 && (
                              <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                  {game.totalGoals}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Personal Goals ({game.goalsLeft}L + {game.goalsRight}R)
                                </div>
                              </div>
                            )}
                            {(game.totalShots || 0) > 0 && (
                              <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                  {game.totalShots}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Shots ({game.shotsLeft}L + {game.shotsRight}R)
                                </div>
                                {game.goalConversionRate && game.goalConversionRate !== '0%' && (
                                  <div className="text-xs text-orange-700 font-medium">
                                    {game.goalConversionRate} conversion
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Playmaking Stats */}
                      {hasStats(game, ['assists', 'passCompletions', 'cornersTaken', 'cornerConversions']) && (
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-3 text-purple-900">Playmaking</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                            {(game.assists || 0) > 0 && (
                              <div>
                                <div className="text-xl font-bold text-purple-600">{game.assists}</div>
                                <div className="text-sm text-gray-600">Assists</div>
                              </div>
                            )}
                            {(game.passCompletions || 0) > 0 && (
                              <div>
                                <div className="text-xl font-bold text-purple-600">{game.passCompletions}</div>
                                <div className="text-sm text-gray-600">Pass Completions</div>
                              </div>
                            )}
                            {(game.cornersTaken || 0) > 0 && (
                              <div>
                                <div className="text-xl font-bold text-purple-600">{game.cornersTaken}</div>
                                <div className="text-sm text-gray-600">
                                  Corners Taken
                                  {(game.cornerConversions || 0) > 0 && (
                                    <div className="text-xs text-purple-700">
                                      {game.cornerConversions} converted ({game.cornerConversionRate})
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Discipline Stats */}
                      {hasStats(game, ['fouls', 'cards']) && (
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-3 text-yellow-900">Discipline</h4>
                          <div className="grid grid-cols-2 gap-4 text-center">
                            {(game.fouls || 0) > 0 && (
                              <div>
                                <div className="text-xl font-bold text-yellow-600">{game.fouls}</div>
                                <div className="text-sm text-gray-600">Fouls</div>
                              </div>
                            )}
                            {(game.cards || 0) > 0 && (
                              <div>
                                <div className="text-xl font-bold text-yellow-600">{game.cards}</div>
                                <div className="text-sm text-gray-600">Cards</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Goalkeeping Stats */}
                      {hasStats(game, ['gkShotsSaved', 'gkGoalsAgainst']) && (
                        <div className="bg-cyan-50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-3 text-cyan-900">Goalkeeping</h4>
                          <div className="grid grid-cols-2 gap-4 text-center">
                            {(game.gkShotsSaved || 0) > 0 && (
                              <div>
                                <div className="text-xl font-bold text-cyan-600">{game.gkShotsSaved}</div>
                                <div className="text-sm text-gray-600">Shots Saved</div>
                              </div>
                            )}
                            {(game.gkGoalsAgainst || 0) > 0 && (
                              <div>
                                <div className="text-xl font-bold text-cyan-600">{game.gkGoalsAgainst}</div>
                                <div className="text-sm text-gray-600">Goals Against</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Game Notes */}
                    {game.gameNotes && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2 text-gray-900">Game Notes</h4>
                        <div className="text-gray-700 leading-relaxed">
                          {game.gameNotes}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}