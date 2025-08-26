import React, { useState, useEffect, useRef } from "react";

export default function PlayerTimer({ onTimeChange }) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  
  const startTimeRef = useRef(null); // timestamp when timer starts
  const accumulatedRef = useRef(0);  // total paused time carried forward

  const startTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      startTimeRef.current = Date.now(); // mark when starting
    }
  };

  const pauseTimer = () => {
    if (isRunning) {
      setIsRunning(false);
      // add time since last start to accumulated
      const additionalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const newTotal = accumulatedRef.current + additionalTime;
      accumulatedRef.current = newTotal;
      setSeconds(newTotal);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSeconds(0);
    accumulatedRef.current = 0;
    startTimeRef.current = null;
  };

  // Update parent whenever seconds changes
  useEffect(() => {
    if (onTimeChange) {
      onTimeChange(seconds);
    }
  }, [seconds, onTimeChange]);

  useEffect(() => {
    let interval = null;
    if (isRunning) {
      // Use more frequent checks for better precision
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        const newTotal = accumulatedRef.current + elapsed;
        
        // Only update if value actually changed to reduce re-renders
        if (newTotal !== seconds) {
          setSeconds(newTotal);
        }
      }, 100); // More frequent checks but only update when value changes
    }
    return () => clearInterval(interval);
  }, [isRunning, seconds]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow-md w-full">
      {/* Fixed height sections matching halftime timer exactly */}
      
      {/* Top section - 40px height (empty space to match dropdown) */}
      <div className="h-10 mb-3"></div>
      
      {/* Middle section - 70px height (same as halftime) */}
      <div className="h-[70px] mb-3 flex flex-col justify-center items-center">
        <div className="text-2xl font-bold">
          {formatTime(seconds)}
        </div>
        <div className="text-sm text-gray-600 h-5 flex items-center">
          Player time
        </div>
      </div>
      
      {/* Bottom section - start/stop toggle + reset */}
      <div className="flex gap-2 justify-center px-2">
        <button
          onClick={isRunning ? pauseTimer : startTimer}
          className={`px-4 py-2 rounded text-white text-sm flex-1 ${
            isRunning ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {isRunning ? 'Stop' : 'Start'}
        </button>
        <button
          onClick={resetTimer}
          className="px-4 py-2 rounded bg-gray-600 text-white text-sm flex-1"
        >
          Reset
        </button>
      </div>
    </div>
  );
}