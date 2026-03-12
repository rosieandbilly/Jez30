export default function WeeklyRecapCard({ recap, onDismiss }) {
  if (!recap) return null

  const bw = recap.insights.bodyweightTrend
  const bwLine = bw
    ? `${bw.arrow} ${bw.delta >= 0 ? '+' : ''}${bw.delta.toFixed(2)} kg (7-day avg)`
    : null

  return (
    <div className="recapCard">
      <div className="recapHeader">
        <span className="recapTitle">📖 Gym Story</span>
        <button className="recapDismissBtn" onClick={onDismiss} aria-label="Dismiss">✕</button>
      </div>

      <p className="recapMain">
        You trained <strong>{recap.daysTrained}</strong> day{recap.daysTrained !== 1 ? 's' : ''} this week.
        Top move: <strong>{recap.topMove}</strong>.
        Biggest jump: <strong>{recap.biggestJump}</strong>.
      </p>

      <div className="recapInsights">
        <div className="recapInsightRow">
          <span className="recapInsightLabel">Most consistent day</span>
          <span className="recapInsightValue">{recap.insights.mostConsistentDay}</span>
        </div>
        {recap.insights.ghostedExercise !== '—' && (
          <div className="recapInsightRow">
            <span className="recapInsightLabel">You ghosted</span>
            <span className="recapInsightValue">{recap.insights.ghostedExercise}</span>
          </div>
        )}
        {bwLine && (
          <div className="recapInsightRow">
            <span className="recapInsightLabel">Bodyweight trend</span>
            <span className="recapInsightValue">{bwLine}</span>
          </div>
        )}
      </div>

      <div className="recapFooter">{recap.footer}</div>
    </div>
  )
}
