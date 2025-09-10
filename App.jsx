import React from "react";
import GameStats from "./components/GameStats";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 p-4">
        <GameStats />
      </div>
    </ErrorBoundary>
  );
}

export default App;