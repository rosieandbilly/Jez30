import { useState, useMemo } from 'react'
import { getTopSet, formatDate, getDateKey, fmtVol, calc1RM } from '../utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS = [
  { label: '7d',  days: 7   },
  { label: '30d', days: 30  },
  { label: '1yr', days: 365 },
  { label: 'All', days: Infinity },
]

function getCutoff(days) {
  if (!isFinite(days)) return '0000-00-00'
  const d = new Date()
  d.setDate(d.getDate() - days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function getExerciseNames(workouts) {
  const names = new Set()
  workouts.forEach(w => w.exercises.forEach(ex => names.add(ex.name)))
  return [...names].sort()
}

function getExerciseHistory(workouts, exerciseName) {
  const sessions = []
  workouts.forEach(w => {
    const ex = w.exercises.find(e => e.name === exerciseName)
    if (!ex || !ex.sets || ex.sets.length === 0) return
    const top = getTopSet(ex)
    if (!top) return
    const vol = ex.sets
      .filter(s => s.type !== 'warmup')
      .reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0)
    sessions.push({
      dateKey:   w.localDateKey || getDateKey(w.date),
      dateLabel: formatDate(w.date),
      workoutId: w.id,
      topWeight: Number(top.weight) || 0,
      topReps:   Number(top.reps)   || 0,
      volume:    vol,
      sets:      ex.sets,
    })
  })
  return sessions.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

// ─── SVG Line Graph ───────────────────────────────────────────────────────────

function LineGraph({ sessions, bestWeight }) {
  if (sessions.length < 2) {
    // Show single point
    if (sessions.length === 1) {
      return (
        <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-dim)', fontSize: 13 }}>
          Only one session — need 2+ to draw a line.
        </div>
      )
    }
    return null
  }

  const W = 300, H = 130
  const PAD = { top: 12, right: 12, bottom: 32, left: 34 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const weights = sessions.map(s => s.topWeight)
  const rawMin  = Math.min(...weights)
  const rawMax  = Math.max(...weights)
  // Add a little padding so points don't sit exactly on the edge
  const padding = Math.max((rawMax - rawMin) * 0.15, 2.5)
  const yMin    = rawMin - padding
  const yMax    = rawMax + padding
  const yRange  = yMax - yMin || 1

  const n = sessions.length
  function sx(i) { return PAD.left + (i / (n - 1)) * chartW }
  function sy(w) { return PAD.top + chartH - ((w - yMin) / yRange) * chartH }

  const polyPts = sessions.map((s, i) => `${sx(i)},${sy(s.topWeight)}`).join(' ')
  // Area fill polygon: close below the line
  const areaPts = `${sx(0)},${PAD.top + chartH} ${polyPts} ${sx(n - 1)},${PAD.top + chartH}`

  // Y-axis grid lines at 3 levels
  const yTicks = [rawMin, (rawMin + rawMax) / 2, rawMax]

  // X labels: show up to 5 evenly spaced, always including last
  const xIndices = []
  const maxLabels = Math.min(5, n)
  for (let i = 0; i < maxLabels; i++) {
    xIndices.push(Math.round(i * (n - 1) / (maxLabels - 1)) || 0)
  }
  const xIndexSet = new Set(xIndices)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      {/* Grid lines */}
      {yTicks.map((tick, i) => (
        <line
          key={i}
          x1={PAD.left} y1={sy(tick)}
          x2={W - PAD.right} y2={sy(tick)}
          stroke="rgba(74,144,217,0.18)"
          strokeWidth="0.8"
          strokeDasharray="4,4"
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((tick, i) => (
        <text
          key={i}
          x={PAD.left - 4}
          y={sy(tick) + 3.5}
          fontSize="7.5"
          fill="var(--text-dim)"
          textAnchor="end"
        >
          {Math.round(tick)}
        </text>
      ))}

      {/* Area fill */}
      <polygon points={areaPts} fill="rgba(74,144,217,0.08)" />

      {/* Line */}
      <polyline
        points={polyPts}
        fill="none"
        stroke="#4A90D9"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data dots */}
      {sessions.map((s, i) => {
        const isBest = s.topWeight === bestWeight
        return (
          <circle
            key={i}
            cx={sx(i)}
            cy={sy(s.topWeight)}
            r={isBest ? 4.5 : 3}
            fill={isBest ? '#F59E0B' : '#4A90D9'}
            stroke={isBest ? '#F59E0B' : 'var(--surface)'}
            strokeWidth="1.5"
          />
        )
      })}

      {/* X-axis date labels */}
      {sessions.map((s, i) => {
        if (!xIndexSet.has(i)) return null
        return (
          <text
            key={i}
            x={sx(i)}
            y={H - 4}
            fontSize="7"
            fill="var(--text-dim)"
            textAnchor="middle"
          >
            {s.dateKey.slice(5)}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Exercise Progress Detail ─────────────────────────────────────────────────

function ExerciseProgressDetail({ exerciseName, workouts, onBack }) {
  const [periodIdx, setPeriodIdx] = useState(3) // default: All

  const { days }  = PERIODS[periodIdx]
  const cutoff    = getCutoff(days)

  const allHistory = useMemo(
    () => getExerciseHistory(workouts, exerciseName),
    [workouts, exerciseName]
  )

  const filtered = useMemo(
    () => allHistory.filter(s => s.dateKey >= cutoff),
    [allHistory, cutoff]
  )

  const bestWeight = filtered.length > 0 ? Math.max(...filtered.map(s => s.topWeight)) : 0
  const bestEntry  = filtered.find(s => s.topWeight === bestWeight) || null
  const estRM      = bestEntry ? calc1RM(bestEntry.topWeight, bestEntry.topReps) : 0
  const repPR      = filtered
    .filter(s => s.topWeight === bestWeight)
    .reduce((max, s) => Math.max(max, s.topReps), 0)
  const volPR = filtered.length > 0 ? Math.max(...filtered.map(s => s.volume)) : 0

  const totalSessions = filtered.length
  const avgVol        = filtered.length > 0
    ? filtered.reduce((s, h) => s + h.volume, 0) / filtered.length
    : 0

  const recentSessions = [...filtered].reverse().slice(0, 12)

  return (
    <div>
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
          {/* 4-tile PR grid */}
          <div className="pr-grid">
            <div className="metric-tile">
              <div className="metric-value">{bestWeight}</div>
              <div className="metric-label">Best kg</div>
            </div>
            <div className="metric-tile">
              <div className="metric-value">{estRM}</div>
              <div className="metric-label">Est. 1RM</div>
            </div>
            <div className="metric-tile">
              <div className="metric-value">{repPR}</div>
              <div className="metric-label">Rep PR <span style={{ fontSize: 9, opacity: 0.7 }}>at best wt</span></div>
            </div>
            <div className="metric-tile">
              <div className="metric-value">{fmtVol(volPR)}</div>
              <div className="metric-label">Vol PR kg</div>
            </div>
          </div>

          {/* Sessions summary */}
          <div className="stat-row" style={{ paddingTop: 0, paddingBottom: 14 }}>
            <div className="stat-card">
              <div className="stat-value">{totalSessions}</div>
              <div className="stat-label">Sessions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{fmtVol(avgVol)}</div>
              <div className="stat-label">Avg Vol kg</div>
            </div>
          </div>

          {/* Line graph */}
          {filtered.length > 0 && (
            <div className="card">
              <div className="card-title">Top Set Weight (kg)</div>
              <LineGraph sessions={filtered} bestWeight={bestWeight} />
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
                    <div className="fs-12 c-dim" style={{ marginTop: 2 }}>{s.dateLabel}</div>
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

export default function ProgressView({ workouts }) {
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [exSearch, setExSearch]                 = useState('')

  if (selectedExercise) {
    return (
      <ExerciseProgressDetail
        exerciseName={selectedExercise}
        workouts={workouts}
        onBack={() => setSelectedExercise(null)}
      />
    )
  }

  const allExerciseNames = getExerciseNames(workouts)
  const exerciseNames    = exSearch.trim()
    ? allExerciseNames.filter(n => n.toLowerCase().includes(exSearch.trim().toLowerCase()))
    : allExerciseNames

  const bestByEx = useMemo(() => {
    const map = {}
    workouts.forEach(w => {
      w.exercises.forEach(ex => {
        if (!ex.sets || ex.sets.length === 0) return
        const top = getTopSet(ex)
        if (!top) return
        const w_ = Number(top.weight) || 0
        if (!map[ex.name] || w_ > map[ex.name]) map[ex.name] = w_
      })
    })
    return map
  }, [workouts])

  return (
    <div>
      <div className="screen-header">
        <h1 className="screen-title">Progress</h1>
      </div>

      {/* ── Exercise list ── */}
      <div className="section-label" style={{ marginTop: 4 }}>Exercises</div>

      {allExerciseNames.length > 0 && (
        <div className="progress-search">
          <input
            type="search"
            className="input"
            placeholder="Search exercises…"
            value={exSearch}
            onChange={e => setExSearch(e.target.value)}
          />
        </div>
      )}

      {allExerciseNames.length === 0 ? (
        <div className="card">
          <span className="c-dim fs-13">Complete a workout to see exercise progress.</span>
        </div>
      ) : exerciseNames.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <span className="c-dim fs-13">No exercises match "{exSearch}".</span>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {exerciseNames.map(name => (
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
