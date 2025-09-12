// Version 2.1 - Final corrected version with visible field and favicon
import React, { useState } from 'react';

export default function PinEntry({ onPinSubmit }) {
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must contain only numbers');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    // Simulate brief loading for better UX
    setTimeout(() => {
      onPinSubmit(pin);
      setIsSubmitting(false);
    }, 500);
  };

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="relative rounded-lg shadow-2xl p-8 w-full max-w-md overflow-hidden">
        {/* Soccer field background - Made much more visible */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><pattern id="grass" patternUnits="userSpaceOnUse" width="20" height="20"><rect width="20" height="20" fill="%2322c55e"/><rect width="20" height="20" fill="%2316a34a" opacity="0.8"/></pattern></defs><rect width="800" height="600" fill="url(%23grass)"/><g fill="none" stroke="white" stroke-width="4" opacity="0.9"><rect x="50" y="50" width="700" height="500"/><line x1="400" y1="50" x2="400" y2="550"/><circle cx="400" cy="300" r="80"/><circle cx="400" cy="300" r="3" fill="white"/><rect x="50" y="200" width="100" height="200"/><rect x="650" y="200" width="100" height="200"/><rect x="50" y="250" width="50" height="100"/><rect x="700" y="250" width="50" height="100"/><path d="M 150 200 A 80 80 0 0 0 150 400"/><path d="M 650 200 A 80 80 0 0 1 650 400"/><circle cx="150" cy="300" r="3" fill="white"/><circle cx="650" cy="300" r="3" fill="white"/><path d="M 50 100 A 20 20 0 0 1 70 80 L 730 80 A 20 20 0 0 1 750 100"/><path d="M 50 500 A 20 20 0 0 0 70 520 L 730 520 A 20 20 0 0 0 750 500"/></g></svg>')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.25
          }}
        ></div>
        
        {/* Semi-transparent overlay for readability - reduced opacity to show field more */}
        <div className="absolute inset-0 bg-white bg-opacity-75"></div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="text-center mb-8">
            {/* Soccer ball using your favicon */}
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-2">
                <img 
                  src="/Favicon.png" 
                  alt="Soccer ball" 
                  className="w-full h-full drop-shadow-sm" 
                />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Soccer Stat Tracker</h1>
            <p className="text-gray-700 text-lg mb-2 font-semibold">
              Track comprehensive soccer statistics and game performance
            </p>
            <p className="text-gray-600 text-sm">
              Enter your 4-digit PIN to access your detailed stats, game history, and analytics across all devices
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                Your Personal PIN
              </label>
              <input
                id="pin"
                type="text"
                value={pin}
                onChange={handleInputChange}
                placeholder="1234"
                className="w-full p-4 border-2 border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white bg-opacity-95"
                maxLength="4"
                autoComplete="off"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || pin.length !== 4}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-green-700 transition-colors shadow-lg"
            >
              {isSubmitting ? 'Loading Stats...' : 'Access My Stats'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-green-50 bg-opacity-95 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-900 mb-3">What You Can Track:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
              <div>• Goals & shots by foot</div>
              <div>• Assists & passes</div>
              <div>• 1v1 situations</div>
              <div>• Corner kicks</div>
              <div>• Defensive stats</div>
              <div>• Game timelines</div>
              <div>• Win/loss records</div>
              <div>• Export to CSV</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 bg-opacity-95 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Multiple Players:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Each PIN tracks a different player's stats</li>
              <li>• Perfect for parents with multiple kids</li>
              <li>• Use PIN 1234 for one child, 5678 for another</li>
              <li>• All data syncs across your devices automatically</li>
              <li>• No accounts or passwords needed</li>
            </ul>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600">
              Your PIN and game data are stored securely and used only for syncing your personal statistics
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
