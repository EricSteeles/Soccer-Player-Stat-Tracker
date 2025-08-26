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
      case 'Win': return 'text-green-600';
      case 'Loss': return 'text-red-600';
      case 'Tie': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getGameResult = (game) => {
    // Handle legacy games that might not have the new goal tracking data
    if (game.gameResult) {
      return game.gameResult;
    }
    // For older games without live tracking, show "No Result"
    return 'No Result';
  };

  const getGameScore = (game) => {
    // Handle legacy games
    if (game.ourGoals !== undefined && game.theirGoals !== undefined) {
      return `${game.ourGoals} - ${game.theirGoals}`;
    }
    // For older games without live tracking
    return 'No Score';
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
      // Find the actual index in the full savedGames array
      const actualIndex = savedGames.findIndex(g => g === game);
      
      if (onDeleteGame && actualIndex !== -1) {
        onDeleteGame(actualIndex);
      }
    }
  };

  const saveEdit = () => {
    if (onUpdateGame) {
      // Validate edited data
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
      
      // Recalculate derived values
      const updatedGame = {
        ...filteredGames[editingGame],
        ...editFormData,
        totalGoals: (editFormData.goalsLeft || 0) + (editFormData.goalsRight || 0),
        totalShots: (editFormData.shotsLeft || 0) + (editFormData.shotsRight || 0),
        goalConversionRate: ((editFormData.shotsLeft || 0) + (editFormData.shotsRight || 0)) > 0 ? 
          (((editFormData.goalsLeft || 0) + (editFormData.goalsRight || 0)) / 
           ((editFormData.shotsLeft || 0) + (editFormData.shotsRight || 0)) * 100).toFixed(1) + '%' : '0%',
        cornerConversionRate: (editFormData.cornersTaken || 0) > 0 ? 
          (((editFormData.cornerConversions || 0) / (editFormData.cornersTaken || 0)) * 100).toFixed(1) + '%' : '0%',
        gameResult: (editFormData.ourGoals || 0) > (editFormData.theirGoals || 0) ? 'Win' : 
                   (editFormData.ourGoals || 0) < (editFormData.theirGoals || 0) ? 'Loss' : 'Tie'
      };
      
      onUpdateGame(gameIndex, updatedGame);
    }
    setEditingGame(null);
    setEditFormData({});
  };

  const handleInputChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: field === 'date' || field === 'playerName' || field === 'opponent' ? value : Number(value)
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

      <div className="space-y-2">
        {filteredGames.map((game, index) => (
          <div key={index} className="border rounded-lg overflow-hidden">
            {/* Clickable Header */}
            <button
              onClick={() => toggleGame(index)}
              className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="font-semibold">
                    {game.date || 'No date'} vs {game.opponent || 'No opponent'}
                  </div>
                  <div className={`text-sm font-medium ${getResultColor(getGameResult(game))}`}>
                    {getGameScore(game)} ({getGameResult(game)})
                  </div>
                </div>
                <div className="text-gray-400">
                  {expandedGame === index ? '▼' : '▶'}
                </div>
              </div>
            </button>

            {/* Expanded Details */}
            {expandedGame === index && (
              <div className="p-4 bg-white border-t">
                {editingGame === index ? (
                  // Edit Mode
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
                  // View Mode
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                        <div>
                          <h4 className="font-semibold mb-2">Game Info</h4>
                          <p><strong>Player:</strong> {game.playerName || 'Not set'}</p>
                          <p><strong>Final Score:</strong> {getGameScore(game)}</p>
                          <p><strong>Result:</strong> <span className={getResultColor(getGameResult(game))}>{getGameResult(game)}</span></p>
                          <p><strong>Player Time:</strong> {game.playerMinutesPlayed}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Personal Stats</h4>
                          <p><strong>Personal Goals:</strong> {game.goalsLeft} L + {game.goalsRight} R = {game.totalGoals}</p>
                          <p><strong>Shots:</strong> {game.shotsLeft} L + {game.shotsRight} R = {game.totalShots}</p>
                          <p><strong>Assists:</strong> {game.assists}</p>
                          <p><strong>Pass Completions:</strong> {game.passCompletions}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => startEditing(index)}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(index)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Goal Timeline */}
                    {game.goalHistory && (game.goalHistory.our.length > 0 || game.goalHistory.their.length > 0) && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Goal Timeline</h4>
                        <div className="text-sm space-y-1">
                          {[...game.goalHistory.our.map(g => ({...g, type: 'us'})), 
                            ...game.goalHistory.their.map(g => ({...g, type: 'them'}))]
                            .sort((a, b) => a.timestamp - b.timestamp)
                            .map((goal, goalIndex) => (
                              <div key={goalIndex} className={`${goal.type === 'us' ? 'text-green-600' : 'text-red-600'}`}>
                                {goal.time} - {goal.type === 'us' ? 'Us' : 'Them'} (min {goal.minute})
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Stats */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div><strong>Corners:</strong> {game.cornersTaken}</div>
                      <div><strong>Corner Goals:</strong> {game.cornerConversions}</div>
                      <div><strong>Fouls:</strong> {game.fouls}</div>
                      <div><strong>Cards:</strong> {game.cards}</div>
                      <div><strong>GK Saves:</strong> {game.gkShotsSaved}</div>
                      <div><strong>GK Goals Against:</strong> {game.gkGoalsAgainst}</div>
                      <div><strong>Goal Conv.:</strong> {game.goalConversionRate}</div>
                      <div><strong>Corner Conv.:</strong> {game.cornerConversionRate}</div>
                    </div>
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