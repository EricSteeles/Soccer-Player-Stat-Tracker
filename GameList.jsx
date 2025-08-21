export default function GameList({ games, editGame }) {
  return (
    <div className="p-4 space-y-2">
      <h3 className="font-bold text-lg">Saved Games</h3>
      {games.map((game) => (
        <div key={game.id} className="p-2 bg-gray-100 rounded flex justify-between items-center">
          <div>
            <p><strong>{game.playerName}</strong> vs {game.opponent}</p>
            <p>Goals: {game.goals}, Shots: {game.shots}, Off 1v1: {game.offense1v1}, Def 1v1: {game.defense1v1}</p>
          </div>
          <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={() => editGame(game)}>Edit</button>
        </div>
      ))}
    </div>
  );
}
