import React, { useState, useEffect, useRef } from "react";

export default function Timers({ halftimeMinutes, setHalftimeMinutes, onTimeChange }) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentHalf, setCurrentHalf] = useState(1); // Track which half we're in
  
  // Real-time (background-safe) timing
  const startTimeRef = useRef(null);
  const accumulatedRef = useRef(0);
  
  // Audio countdown tracking
  const lastSecondPlayedRef = useRef(null);

  // Calculate remaining time (countdown from halftimeMinutes)
  const totalHalftimeSeconds = halftimeMinutes * 60;
  const remainingSeconds = Math.max(0, totalHalftimeSeconds - seconds);
  const isTimeUp = remainingSeconds === 0;

  // Calculate total cumulative game time across both halves
  const totalGameSeconds = currentHalf === 1 ? 
    seconds : // First half: just elapsed seconds
    (totalHalftimeSeconds + seconds); // Second half: first half + current elapsed

  // Audio context management
  const audioContextRef = useRef(null);
  const [audioSupported, setAudioSupported] = useState(true);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);

  // Initialize audio context once
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        if (!window.AudioContext && !window.webkitAudioContext) {
          setAudioSupported(false);
          return null;
        }
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.warn('Failed to create AudioContext:', error);
        setAudioSupported(false);
        return null;
      }
    }
    return audioContextRef.current;
  };

  // Request audio permission for mobile
  const requestAudioPermission = async () => {
    if (!audioSupported) return false;
    
    const context = getAudioContext();
    if (!context) return false;

    try {
      if (context.state === 'suspended') {
        await context.resume();
      }
      setAudioPermissionGranted(true);
      return true;
    } catch (error) {
      console.warn('Audio permission denied:', error);
      return false;
    }
  };

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Audio functions with improved context management
  const playDing = async () => {
    if (!audioSupported) return;
    
    const context = getAudioContext();
    if (!context) return;

    try {
      if (!audioPermissionGranted) {
        const granted = await requestAudioPermission();
        if (!granted) return;
      }

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.setValueAtTime(800, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, context.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.3);
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  };

  const playCompletionSound = async () => {
    if (!audioSupported) return;
    
    const context = getAudioContext();
    if (!context) return;

    try {
      if (!audioPermissionGranted) {
        const granted = await requestAudioPermission();
        if (!granted) return;
      }

      const playTone = (frequency, startTime, duration) => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.setValueAtTime(frequency, startTime);
        gainNode.gain.setValueAtTime(0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      const now = context.currentTime;
      playTone(523, now, 0.5); // C
      playTone(659, now + 0.1, 0.5); // E
      playTone(784, now + 0.2, 0.5); // G
      playTone(1047, now + 0.3, 0.8); // High C
    } catch (error) {
      console.warn('Completion sound playback failed:', error);
    }
  };

  const playVoiceCountdown = (message) => {
    if (!audioSupported || !audioPermissionGranted) return;
    
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(message.toString());
        utterance.rate = 1.2;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.warn('Voice countdown failed:', error);
    }
  };

  // Audio countdown effect with voice
  useEffect(() => {
    if (isRunning && remainingSeconds <= 10 && remainingSeconds > 0) {
      if (lastSecondPlayedRef.current !== remainingSeconds) {
        playDing();
        playVoiceCountdown(remainingSeconds);
        lastSecondPlayedRef.current = remainingSeconds;
      }
    } else if (isTimeUp && isRunning && lastSecondPlayedRef.current !== 0) {
      playCompletionSound();
      if (currentHalf === 1) {
        playVoiceCountdown("First Half Over");
      } else {
        playVoiceCountdown("Full Time");
      }
      lastSecondPlayedRef.current = 0;
    }
  }, [remainingSeconds, isRunning, isTimeUp, currentHalf]);

  const startTimer = () => {
    if (!isRunning && !isTimeUp) {
      setIsRunning(true);
      startTimeRef.current = Date.now();
    }
  };

  const pauseTimer = () => {
    if (isRunning) {
      const additionalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const newTotal = accumulatedRef.current + additionalTime;
      accumulatedRef.current = newTotal;
      setSeconds(newTotal);
      setIsRunning(false);
    }
  };

  // Start second half
  const startSecondHalf = () => {
    setCurrentHalf(2);
    setSeconds(0);
    accumulatedRef.current = 0;
    startTimeRef.current = null;
    lastSecondPlayedRef.current = null;
    setIsRunning(false);
  };

  // Reset entire game
  const resetTimer = () => {
    setIsRunning(false);
    setSeconds(0);
    setCurrentHalf(1);
    accumulatedRef.current = 0;
    startTimeRef.current = null;
    lastSecondPlayedRef.current = null;
  };

  // Auto-pause when time is up
  useEffect(() => {
    if (isTimeUp && isRunning) {
      setIsRunning(false);
    }
  }, [isTimeUp, isRunning]);

  // Reset timer when halftime minutes changes with validation
  useEffect(() => {
    if (halftimeMinutes < 1 || halftimeMinutes > 90) {
      console.warn('Invalid halftime minutes:', halftimeMinutes);
      setHalftimeMinutes(30);
      return;
    }
    resetTimer();
  }, [halftimeMinutes, setHalftimeMinutes]);

  // Update parent with TOTAL game seconds (cumulative across both halves)
  useEffect(() => {
    if (onTimeChange) {
      onTimeChange(totalGameSeconds);
    }
  }, [totalGameSeconds, onTimeChange]);

  useEffect(() => {
    let interval = null;
    if (isRunning && !isTimeUp) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        const newTotal = accumulatedRef.current + elapsed;
        
        const cappedTotal = Math.min(newTotal, totalHalftimeSeconds);
        
        if (cappedTotal !== seconds) {
          setSeconds(cappedTotal);
        }
        
        if (cappedTotal >= totalHalftimeSeconds) {
          setIsRunning(false);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRunning, isTimeUp, totalHalftimeSeconds, seconds]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isGameComplete = currentHalf === 2 && isTimeUp;

  return (
    <div className={`bg-gray-100 p-4 rounded-lg shadow-md w-full ${isTimeUp ? 'bg-red-100 border-2 border-red-400' : ''}`}>
      {/* Top section - Halftime minutes selector */}
      <div className="h-10 mb-3 flex justify-center">
        <select
          value={halftimeMinutes}
          onChange={(e) => setHalftimeMinutes(Number(e.target.value))}
          className="border rounded px-2 py-1 h-8"
          disabled={isRunning || currentHalf === 2}
        >
          {[30, 35, 40, 45].map((min) => (
            <option key={min} value={min}>
              {min} min
            </option>
          ))}
        </select>
      </div>
      
      {/* Middle section - Time display */}
      <div className="h-[70px] mb-3 flex flex-col justify-center items-center">
        <div className={`text-2xl font-bold ${isTimeUp ? 'text-red-600' : ''}`}>
          {formatTime(remainingSeconds)}
        </div>
        <div className="text-sm text-gray-600 h-5 flex items-center">
          {isTimeUp ? 
            (currentHalf === 1 ? 'HALFTIME!' : 'FULL TIME!') : 
            `${formatTime(seconds)} elapsed`
          }
        </div>
        <div className="text-xs text-blue-600 font-semibold">
          {currentHalf === 1 ? 'First Half' : 'Second Half'} • Total: {formatTime(totalGameSeconds)}
        </div>
      </div>
      
      {/* Bottom section - Controls */}
      <div className="flex gap-2 justify-center px-2">
        {/* Show different buttons based on game state */}
        {currentHalf === 1 && !isTimeUp && (
          <>
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
          </>
        )}
        
        {currentHalf === 1 && isTimeUp && (
          <>
            <button
              onClick={startSecondHalf}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm flex-1"
            >
              Start 2nd Half
            </button>
            <button
              onClick={resetTimer}
              className="px-4 py-2 rounded bg-gray-600 text-white text-sm flex-1"
            >
              Reset Game
            </button>
          </>
        )}
        
        {currentHalf === 2 && !isTimeUp && (
          <>
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
              Reset Game
            </button>
          </>
        )}
        
        {isGameComplete && (
          <button
            onClick={resetTimer}
            className="px-4 py-2 rounded bg-gray-600 text-white text-sm w-full"
          >
            New Game
          </button>
        )}
      </div>
    </div>
  );
}
