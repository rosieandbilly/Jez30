import { useState, useMemo } from 'react'
import { getTopSet, formatDate, getDateKey, fmtVol } from '../utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const PERIODS = [
  { label: '7d',  days: 7   },
  { label: '30d', days: 30  },
  { label: '90d', days: 90  },
  { label: '1yr', days: 365 },
  { label: 'All', days: Infinity },
]

function getCutoff(days) {
  if (!isFinite(days)) return '0000-00-00'
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

/** All unique exercise names across all logged workouts, sorted A-Z */
function getExerciseNames(workouts) {
  const names = new Set()
  workouts.forEach(w => w.exercises.forEach(ex => names.add(ex.name)))
  return [...names].sort()
}

/** Per-exercise history: one entry per workout session that includes the exercise */
function getExerciseHistory(workouts, exerciseName) {
  const sessions = []
  workouts.forEach(w => {
    const ex = w.exercises.find(e => e.name === exerciseName)
    if (!ex) return
    const top = getTopSet(ex)
    const vol = ex.sets
      .filter(s => s.type !== 'warmup')
      .reduce((sum, s) => sum + s.weight * s.reps, 0)
    sessions.push({
      dateKey:   getDateKey(w.date),
      dateLabel: formatDate(w.date),
      workoutId: w.id,
      topWeight: top.weight,
      topReps:   top.reps,
      volume:    vol,
      sets:      ex.sets,
    })
  })
  // Oldest first for charts, newest first for lists
  return sessions.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

// ─── Exercise Progress Detail ─────────────────────────────────────────────────

function ExerciseProgressDetail({ exerciseName, workouts, onBack }) {
  const [periodIdx, setPeriodIdx] = useState(2) // default 90d

  const { days } = PERIODS[periodIdx]
  const cutoff   = getCutoff(days)

  const allHistory = useMemo(
    () => getExerciseHistory(workouts, exerciseName),
    [workouts, exerciseName]
  )

  const filtered = useMemo(
    () => allHistory.filter(s => s.dateKey >= cutoff),
    [allHistory, cutoff]
  )

  const bestWeight    = filtered.length > 0 ? Math.max(...filtered.map(s => s.topWeight)) : 0
  const totalSessions = filtered.length
  const avgVol        = filtered.length > 0
    ? filtered.reduce((s, h) => s + h.volume, 0) / filtered.length
    : 0

  // Chart: up to 16 most-recent sessions in period
  const chartSessions = filtered.slice(-16)
  const chartMax      = Math.max(...chartSessions.map(s => s.topWeight), 1)

  // Recent sessions (newest first)
  const recentSessions = [...filtered].reverse().slice(0, 12)

  return (
    <div>
      {/* Header */}
      <div className="screen-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Progress
        </button>
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{exerciseName}</div>
      </div>

      {/* Period filter */}
      <div className="seg-control">
        {PERIODS.map((p, i) => (
          <button
            key={p.label}
            className={`seg-btn${i === periodIdx ? ' active' : ''}`}
            onClick={() => setPeriodIdx(i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <span className="c-dim fs-13">No sessions in this period.</span>
        </div>
      ) : (
        <>
          {/* Metric tiles */}
          <div className="metric-row">
            <div className="metric-tile">
              <div className="metric-value">{bestWeight}</div>
              <div className="metric-label">Best kg</div>
            </div>
            <div className="metric-tile">
              <div className="metric-value">{totalSessions}</div>
              <div className="metric-label">Sessions</div>
            </div>
            <div className="metric-tile">
              <div className="metric-value">{fmtVol(avgVol)}</div>
              <div className="metric-label">Avg Vol kg</div>
            </div>
          </div>

          {/* Top-set weight chart */}
          {chartSessions.length > 1 && (
            <div className="card">
              <div className="card-title">Top Set Weight (kg)</div>
              <div className="bar-chart">
                {chartSessions.map((s, i) => (
                  <div key={i} className="bar-col">
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          height: `${Math.max(4, (s.topWeight / chartMax) * 100)}%`,
                          background: s.topWeight === bestWeight
                            ? 'var(--primary)'
                            : 'rgba(0,122,255,0.45)',
                        }}
                      />
                    </div>
                    <span className="bar-label">{s.dateKey.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent sessions list */}
          <div className="section-label">Sessions</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {recentSessions.map((s, i) => {
              const isBest = s.topWeight === bestWeight
              return (
                <div
                  key={`${s.dateKey}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 16px',
                    borderBottom: i < recentSessions.length - 1
                      ? '1px solid var(--border-soft)'
                      : 'none',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>
                        {s.topWeight}kg&thinsp;&times;&thinsp;{s.topReps}
                      </span>
                      {isBest && <span className="pr-badge">best</span>}
                    </div>
                    <div className="fs-12 c-dim" style={{ marginTop: 2 }}>
                      {s.dateLabel}
                    </div>
                  </div>
                  <div className="c-dim fs-12">{fmtVol(s.volume)} kg vol</div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}

// ─── Main Progress View ───────────────────────────────────────────────────────

export default function ProgressView({ workouts, bodyweights }) {
  const [selectedExercise, setSelectedExercise] = useState(null)

  // Exercise drill-down
  if (selectedExercise) {
    return (
      <ExerciseProgressDetail
        exerciseName={selectedExercise}
        workouts={workouts}
        onBack={() => setSelectedExercise(null)}
      />
    )
  }

  // ── Bodyweight summary ──────────────────────────────────────────────────────
  const sortedBW   = [...bodyweights].sort((a, b) => b.date.localeCompare(a.date))
  const bwForChart = sortedBW.slice(0, 12).reverse()
  const bwMin      = bwForChart.length > 0 ? Math.min(...bwForChart.map(e => e.weight)) - 1 : 0
  const bwMax      = bwForChart.length > 0 ? Math.max(...bwForChart.map(e => e.weight)) + 1 : 1
  const bwRange    = bwMax - bwMin || 1

  // ── Exercise list ───────────────────────────────────────────────────────────
  const exerciseNames = getExerciseNames(workouts)

  const bestByEx = useMemo(() => {
    const map = {}
    workouts.forEach(w => {
      w.exercises.forEach(ex => {
        const top = getTopSet(ex)
        if (!map[ex.name] || top.weight > map[ex.name]) {
          map[ex.name] = top.weight
        }
      })
    })
    return map
  }, [workouts])

  return (
    <div>
      <div className="screen-header">
        <h1 className="screen-title">Progress</h1>
      </div>

      {/* ── Bodyweight ── */}
      <div className="section-label">Bodyweight</div>

      {sortedBW.length === 0 ? (
        <div className="card">
          <span className="c-dim fs-13">No bodyweight entries yet. Add one in the Weight tab.</span>
        </div>
      ) : (
        <div className="card">
          {/* Sparkline */}
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

          {/* Latest prominent */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 700 }}>{sortedBW[0].weight}</span>
            <span className="c-dim">kg</span>
            {sortedBW.length > 1 && (() => {
              const delta = sortedBW[0].weight - sortedBW[1].weight
              const cls   = delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : 'delta-neu'
              const str   = delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)
              return <span className={`delta ${cls}`}>{str} kg</span>
            })()}
            <span className="c-dim fs-12" style={{ marginLeft: 'auto' }}>{sortedBW[0].date}</span>
          </div>

          {/* Recent BW rows */}
          {sortedBW.slice(0, 6).map((entry, i) => {
            const next     = sortedBW[i + 1]
            const delta    = next ? entry.weight - next.weight : null
            const deltaStr = delta !== null
              ? (delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1))
              : null
            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 8, paddingBottom: 8, borderTop: '1px solid var(--border-soft)',
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

      {/* ── Exercise list (drill-down) ── */}
      <div className="section-label" style={{ marginTop: 8 }}>Exercises</div>

      {exerciseNames.length === 0 ? (
        <div className="card">
          <span className="c-dim fs-13">Complete a workout to see exercise progress.</span>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {exerciseNames.map((name, i) => (
            <div
              key={name}
              className="prog-ex-row"
              onClick={() => setSelectedExercise(name)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                  {bestByEx[name]}kg
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}
