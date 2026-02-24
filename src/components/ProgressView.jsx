import { getTopSet, formatDate, formatDateShort } from '../utils'

export default function ProgressView({ workouts, bodyweights }) {
  // Best lifts: highest top-set weight per exercise, all time
  const bestByExercise = {}
  workouts.forEach(w => {
    w.exercises.forEach(ex => {
      const top = getTopSet(ex)
      if (!bestByExercise[ex.name] || top.weight > bestByExercise[ex.name].weight) {
        bestByExercise[ex.name] = { weight: top.weight, reps: top.reps, date: w.date }
      }
    })
  })

  const now = Date.now()
  const sortedBW = [...bodyweights].sort((a, b) => b.date.localeCompare(a.date))
  const liftEntries = Object.entries(bestByExercise).sort((a, b) => a[0].localeCompare(b[0]))

  // Sparkline data for bodyweight (last 12, oldest→newest)
  const bwForChart = sortedBW.slice(0, 12).reverse()
  const bwMin = bwForChart.length > 0 ? Math.min(...bwForChart.map(e => e.weight)) - 1 : 0
  const bwMax = bwForChart.length > 0 ? Math.max(...bwForChart.map(e => e.weight)) + 1 : 1
  const bwRange = bwMax - bwMin || 1

  return (
    <div>
      <div className="screen-header">
        <h1 className="screen-title">Progress</h1>
      </div>

      {/* Bodyweight section */}
      <div className="section-label">Bodyweight</div>

      {sortedBW.length === 0 ? (
        <div className="card">
          <span className="c-dim fs-13">No bodyweight entries yet. Add one in the Weight tab.</span>
        </div>
      ) : (
        <div className="card">
          {/* Mini sparkline */}
          {bwForChart.length > 1 && (
            <div className="bw-sparkline">
              {bwForChart.map((e, i) => (
                <div
                  key={e.id}
                  className="bw-bar"
                  style={{
                    height: `${Math.max(8, ((e.weight - bwMin) / bwRange) * 100)}%`,
                    opacity: 0.4 + (i / bwForChart.length) * 0.6,
                  }}
                />
              ))}
            </div>
          )}

          {/* Latest value prominent */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 28, fontWeight: 700 }}>{sortedBW[0].weight}</span>
            <span className="c-dim">kg</span>
            {sortedBW.length > 1 && (() => {
              const delta = sortedBW[0].weight - sortedBW[1].weight
              const cls = delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : 'delta-neu'
              const str = delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)
              return <span className={`delta ${cls}`}>{str} kg</span>
            })()}
            <span className="c-dim fs-12" style={{ marginLeft: 'auto' }}>{sortedBW[0].date}</span>
          </div>

          {/* Recent entries */}
          {sortedBW.slice(0, 8).map((entry, i) => {
            const next = sortedBW[i + 1]
            const delta = next ? entry.weight - next.weight : null
            const deltaStr = delta !== null
              ? (delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1))
              : null

            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 8,
                  paddingBottom: 8,
                  borderTop: '1px solid var(--border-soft)',
                }}
              >
                <span className="fs-13 c-dim">{entry.date}</span>
                <div className="row gap-6">
                  <span className="fw-600">{entry.weight} kg</span>
                  {deltaStr && (
                    <span className={`delta ${delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : 'delta-neu'}`}>
                      {deltaStr}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Best lifts */}
      <div className="section-label" style={{ marginTop: 8 }}>Best Lifts</div>

      {liftEntries.length === 0 ? (
        <div className="card">
          <span className="c-dim fs-13">Complete a workout to see your best lifts.</span>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {liftEntries.map(([name, { weight, reps, date }], i) => {
            const isRecent = (now - new Date(date).getTime()) < 14 * 86400000

            return (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 16px',
                  borderBottom: i < liftEntries.length - 1 ? '1px solid var(--border-soft)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
                  <div className="fs-12 c-dim">{formatDate(date)}</div>
                </div>
                <div className="row gap-8">
                  <span className="fw-700">{weight}kg&thinsp;&times;&thinsp;{reps}</span>
                  {isRecent && <span className="pr-badge">recent</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}
