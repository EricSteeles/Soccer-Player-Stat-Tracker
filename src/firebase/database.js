// src/firebase/database.js
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  where,
  onSnapshot,
  enableNetwork,
  disableNetwork,
  waitForPendingWrites
} from 'firebase/firestore';
import { db } from './config';

// Collection name for game data
const GAMES_COLLECTION = 'soccerGames';

// Enhanced error handling
class DatabaseError extends Error {
  constructor(message, code = 'unknown', originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.originalError = originalError;
  }
}

// Retry mechanism for network operations
const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries || error.code === 'permission-denied') {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
};

// Data validation and sanitization
const validateGameData = (gameData) => {
  const required = ['date', 'playerName'];
  const missing = required.filter(field => !gameData[field]);
  
  if (missing.length > 0) {
    throw new DatabaseError(`Missing required fields: ${missing.join(', ')}`);
  }

  // Sanitize and validate numeric fields
  const sanitized = { ...gameData };
  const numericFields = [
    'goalsLeft', 'goalsRight', 'shotsLeft', 'shotsRight', 
    'assists', 'passCompletions', 'cornersTaken', 'cornerConversions',
    'offensive1v1Attempts', 'offensive1v1Won', 'defensive1v1Attempts', 'defensive1v1Won',
    'fouls', 'cards', 'gkShotsSaved', 'gkGoalsAgainst', 'ourGoals', 'theirGoals',
    'freeKicksTaken', 'freeKicksMade', 'defensiveTackles', 'defensiveFailures',
    'defensiveDisruption', 'defensiveDistribution'
  ];

  numericFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      const value = Number(sanitized[field]);
      if (isNaN(value) || value < 0) {
        sanitized[field] = 0;
      } else {
        sanitized[field] = Math.floor(value); // Ensure integers
      }
    }
  });

  // Add metadata
  sanitized.lastModified = new Date();
  sanitized.version = '1.0';

  return sanitized;
};

// Get user PIN for cross-device sync
const getUserPin = () => {
  return localStorage.getItem('soccerApp_userPin') || null;
};

// Set user PIN
const setUserPin = (pin) => {
  localStorage.setItem('soccerApp_userPin', pin);
};

// Clear user PIN (for logout/switch player)
const clearUserPin = () => {
  localStorage.removeItem('soccerApp_userPin');
};

// Database operations
export const gameService = {
  // Check if user has a PIN set
  hasPin() {
    return getUserPin() !== null;
  },

  // Set the user's PIN
  setPin(pin) {
    setUserPin(pin);
  },

  // Get current PIN (for display purposes)
  getCurrentPin() {
    return getUserPin();
  },

  // Clear current PIN (logout/switch player)
  clearPin() {
    clearUserPin();
  },

  // Save a new game
  async saveGame(gameData) {
    const userPin = getUserPin();
    if (!userPin) {
      throw new DatabaseError('No user PIN set');
    }

    try {
      const validated = validateGameData(gameData);
      validated.userPin = userPin;
      validated.createdAt = new Date();
      
      return await withRetry(async () => {
        const docRef = await addDoc(collection(db, GAMES_COLLECTION), validated);
        return {
          id: docRef.id,
          ...validated
        };
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to save game: ${error.message}`,
        error.code,
        error
      );
    }
  },

  // Load all games for this user PIN
  async loadGames() {
    const userPin = getUserPin();
    if (!userPin) {
      throw new DatabaseError('No user PIN set');
    }

    try {
      return await withRetry(async () => {
        const q = query(
          collection(db, GAMES_COLLECTION),
          where('userPin', '==', userPin),
          orderBy('createdAt', 'desc'),
          limit(1000) // Reasonable limit
        );
        
        const querySnapshot = await getDocs(q);
        const games = [];
        
        querySnapshot.forEach((doc) => {
          games.push({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore timestamps back to strings for compatibility
            createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
            lastModified: doc.data().lastModified?.toDate?.() || doc.data().lastModified
          });
        });
        
        return games;
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to load games: ${error.message}`,
        error.code,
        error
      );
    }
  },

  // Update an existing game
  async updateGame(gameId, gameData) {
    const userPin = getUserPin();
    if (!userPin) {
      throw new DatabaseError('No user PIN set');
    }

    try {
      const validated = validateGameData(gameData);
      validated.lastModified = new Date();
      validated.userPin = userPin; // Ensure PIN consistency
      
      return await withRetry(async () => {
        const gameRef = doc(db, GAMES_COLLECTION, gameId);
        await updateDoc(gameRef, validated);
        return {
          id: gameId,
          ...validated
        };
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to update game: ${error.message}`,
        error.code,
        error
      );
    }
  },

  // Delete a game
  async deleteGame(gameId) {
    try {
      return await withRetry(async () => {
        const gameRef = doc(db, GAMES_COLLECTION, gameId);
        await deleteDoc(gameRef);
        return true;
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete game: ${error.message}`,
        error.code,
        error
      );
    }
  },

  // Bulk operations for import/export
  async bulkSaveGames(games) {
    const results = {
      success: [],
      failed: []
    };

    for (const game of games) {
      try {
        const result = await this.saveGame(game);
        results.success.push(result);
      } catch (error) {
        results.failed.push({ game, error: error.message });
      }
    }

    return results;
  },

  // Clear all games for this user
  async clearAllGames() {
    try {
      const games = await this.loadGames();
      const deletePromises = games.map(game => this.deleteGame(game.id));
      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      throw new DatabaseError(
        `Failed to clear all games: ${error.message}`,
        error.code,
        error
      );
    }
  },

  // Real-time listener for games (optional feature)
  onGamesChange(callback) {
    const userPin = getUserPin();
    if (!userPin) {
      callback(null, new DatabaseError('No user PIN set'));
      return;
    }

    try {
      const q = query(
        collection(db, GAMES_COLLECTION),
        where('userPin', '==', userPin),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, 
        (querySnapshot) => {
          const games = [];
          querySnapshot.forEach((doc) => {
            games.push({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
              lastModified: doc.data().lastModified?.toDate?.() || doc.data().lastModified
            });
          });
          callback(games);
        },
        (error) => {
          console.error('Real-time listener error:', error);
          callback(null, new DatabaseError('Real-time sync failed', error.code, error));
        }
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to set up real-time listener: ${error.message}`,
        error.code,
        error
      );
    }
  },

  // Network status management
  async goOnline() {
    try {
      await enableNetwork(db);
      return true;
    } catch (error) {
      console.warn('Failed to go online:', error);
      return false;
    }
  },

  async goOffline() {
    try {
      await disableNetwork(db);
      return true;
    } catch (error) {
      console.warn('Failed to go offline:', error);
      return false;
    }
  },

  // Wait for pending writes (useful before app close)
  async syncPendingWrites() {
    try {
      await waitForPendingWrites(db);
      return true;
    } catch (error) {
      console.warn('Failed to sync pending writes:', error);
      return false;
    }
  }
};

// Export database error class for error handling
export { DatabaseError };