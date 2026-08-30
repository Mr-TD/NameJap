export default function Stats({ stats }) {
  if (!stats) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  const cards = [
    { icon: "🔢", value: stats.total.toLocaleString(), label: "Total Count" },
    { icon: "📅", value: stats.days_logged, label: "Days Logged" },
    { icon: "📊", value: stats.average, label: "Daily Average" },
    { icon: "🏆", value: stats.max_count.toLocaleString(), label: "Best Day" },
    { icon: "🔥", value: stats.current_streak, label: "Current Streak" },
    {
      icon: "📆",
      value: stats.max_date
        ? new Date(stats.max_date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })
        : "—",
      label: "Best Day Date",
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card, i) => (
        <div key={i} className="glass-card stat-card">
          <div className="stat-card__icon">{card.icon}</div>
          <div className="stat-card__value">{card.value}</div>
          <div className="stat-card__label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
