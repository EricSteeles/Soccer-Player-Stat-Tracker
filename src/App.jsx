import React from "react";
import Timers from "./components/Timers";

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-6">Soccer Stat Tracker</h1>
      <Timers />
    </div>
  );
}

export default App;

