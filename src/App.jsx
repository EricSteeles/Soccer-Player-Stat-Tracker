import React, { useState, useEffect } from "react";
import GameStats from "./components/GameStats";
import PinEntry from "./components/PinEntry";
import ErrorBoundary from "./components/ErrorBoundary";
import { gameService } from "./firebase/database";

function App() {
  const [userPin, setUserPin] = useState(null);
  const [isCheckingPin, setIsCheckingPin] = useState(true);

  useEffect(() => {
    // Check if user already has a PIN set
    const hasPin = gameService.hasPin();
    if (hasPin) {
      setUserPin(gameService.getCurrentPin());
    }
    setIsCheckingPin(false);
  }, []);

  const handlePinSubmit = (pin) => {
    gameService.setPin(pin);
    setUserPin(pin);
  };

  if (isCheckingPin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100">
        {userPin ? (
          <GameStats userPin={userPin} />
        ) : (
          <PinEntry onPinSubmit={handlePinSubmit} />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;