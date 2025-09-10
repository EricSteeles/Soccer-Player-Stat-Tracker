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
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">⚽ Soccer Stats</h1>
          <p className="text-gray-600">Enter your 4-digit PIN to access your game data across all devices</p>
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
              className="w-full p-4 border-2 border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength="4"
              autoComplete="off"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || pin.length !== 4}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {isSubmitting ? 'Loading...' : 'Access My Stats'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">How it works:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Choose any 4-digit PIN you'll remember</li>
            <li>• Use the same PIN on all your devices</li>
            <li>• Your games sync automatically across devices</li>
            <li>• No accounts or passwords needed</li>
          </ul>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Your PIN is stored securely and used only to sync your personal game data
          </p>
        </div>
      </div>
    </div>
  );
}