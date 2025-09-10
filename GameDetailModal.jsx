import React, { useState } from "react";

export default function GameDetailModal({ game, onClose, onUpdate }) {
  const [editableGame, setEditableGame] = useState({ ...game });

  if (!game) return null;

  const handleChange = (key, value) => {
    setEditableGame({ ...editableGame, [key]: value });
  };

  const handleSave = () => {
    onUpdate(editableGame);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-4 rounded w-11/12 max-w-md overflow-auto">
        <h2 className="text-xl font-bold mb-2">
          Edit: {game.date} vs {game.opponent}
        </h2>

        {Object.keys(editableGame).map((field) => (
          <div key={field} className="mb-2">
            <label className="block font-semibold capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
            <input
              type={field.toLowerCase().includes("date") ? "date" : "number"}
              value={editableGame[field]}
              onChange={(e) =>
                handleChange(
                  field,
                  field.toLowerCase().includes("date") ? e.target.value : Number(e.target.value)
                )
              }
              className="border p-1 rounded w-full"
            />
          </div>
        ))}

        <button
          onClick={handleSave}
          className="mt-2 bg-blue-500 text-white px-3 py-1 rounded w-full"
        >
          Save Changes
        </button>

        <button
          onClick={onClose}
          className="mt-2 bg-red-500 text-white px-3 py-1 rounded w-full"
        >
          Close
        </button>
      </div>
    </div>
  );
}

