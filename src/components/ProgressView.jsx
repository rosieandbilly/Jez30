import { getTopSet, formatDate } from '../utils'

export default function ProgressView({ workouts, bodyweights }) {
  // Best lifts: all-time highest top-set weight per exercise
  const bestByExercise = {}
  workouts.forEach(w => {
    w.exercises.forEach(ex => {
      const top = getTopSet(ex)
      if (!bestByExercise[ex.name] || top.weight > bestByExercise[ex.name].weight) {
        bestByExercise[ex.name] = { weight: top.weight, reps: top.reps, date: w.date }
      }
    })
  })

  // Recent best: was the best set achieved in the last 14 days?
  const now = Date.now()
  const sortedBW = [...bodyweights].sort((a, b) => b.date.localeCompare(a.date))

  // Group best lifts by template category for nicer display
  const liftEntries = Object.entries(bestByExercise).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div>
      <div className="screen-header">
        <h1 className="screen-title">Progress</h1>
      </div>

      {/* Bodyweight trend */}
      <div className="section-label">Bodyweight Trend</div>

      {sortedBW.length === 0 ? (
        <div className="px-12 c-dim fs-13" style={{ padding: '8px 16px' }}>
          No bodyweight entries yet. Add one in the Weight tab.
        </div>
      ) : (
        sortedBW.slice(0, 12).map((entry, i) => {
          const next = sortedBW[i + 1]
          const delta = next ? (entry.weight - next.weight) : null
          const deltaStr = delta !== null
            ? (delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1))
            : null

          return (
            <div className="list-item" key={entry.id}>
              <span className="fs-13 c-dim">{entry.date}</span>
              <div className="row gap-8">
                <span className="fw-700">{entry.weight} kg</span>
                {deltaStr && (
                  <span className={`delta ${delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : 'delta-neu'}`}>
                    {deltaStr}
                  </span>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* Best lifts */}
      <div className="section-label" style={{ marginTop: 20 }}>Best Lifts (All Time)</div>

      {liftEntries.length === 0 ? (
        <div style={{ padding: '8px 16px', color: 'var(--text-dim)', fontSize: 13 }}>
          Complete a workout to see your best lifts.
        </div>
      ) : (
        liftEntries.map(([name, { weight, reps, date }]) => {
          const isRecent = (now - new Date(date).getTime()) < 14 * 86400000

          return (
            <div className="list-item" key={name}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div>
                <div className="fs-12 c-dim">{formatDate(date)}</div>
              </div>
              <div className="row gap-8">
                <span className="fw-700">{weight}kg&thinsp;&times;&thinsp;{reps}</span>
                {isRecent && <span className="pr-badge">recent</span>}
              </div>
            </div>
          )
        })
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}
