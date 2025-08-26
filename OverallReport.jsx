export default function OverallReport({ games }) {
  const exportCSV = () => {
    const header = ["Title","Player","Date","Opponent","GoalsR","GoalsL","ShotsR","ShotsL","Assists","GoalsSaved","GoalsMissed","Offense1v1","Defense1v1","PlayerMinutes","GameMinutes"];
    const rows = games.map(g => [
      g.title, g.playerName, g.date, g.opponent,
      g.goalsRight, g.goalsLeft, g.shotsRight, g.shotsLeft,
      g.assists, g.goalsSaved, g.goalsMissed, g.offense1v1, g.defense1v1,
      g.playerMinutes, g.gameMinutes
    ]);
    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "soccer_stats.csv";
    link.click();
  };

  return (
    <div className="p-4 bg-white rounded shadow mt-4">
      <h3 className="font-bold mb-2">All Games Played Report</h3>
      <button onClick={exportCSV} className="mt-2 px-4 py-2 bg-green-500 text-white rounded w-full">Export CSV</button>
    </div>
  );
}
