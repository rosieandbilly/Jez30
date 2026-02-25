import { useState, useMemo } from 'react'
import { formatDate, tagClass, getTopSet, getDateKey, buildActivityChart } from '../utils'
import WorkoutIcon from './WorkoutIcon'

const PERIODS = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1yr', days: 365 },
]

function getCutoffKey(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

export default function HistoryView({ workouts, onSelect }) {
  const [periodIdx, setPeriodIdx] = useState(1) // default 30d

  const { days } = PERIODS[periodIdx]
  const cutoff = getCutoffKey(days)

  // Workouts within the selected period
  const filtered = useMemo(
    () => workouts.filter(w => getDateKey(w.date) >= cutoff),
    [workouts, cutoff]
  )

  // Stats for the period
  const daysActive = useMemo(
    () => new Set(filtered.map(w => getDateKey(w.date))).size,
    [filtered]
  )
  const totalSets = useMemo(
    () => filtered.reduce(
      (sum, w) => sum + w.exercises.reduce(
        (s, ex) => s + ex.sets.filter(s => s.type !== 'warmup').length, 0
      ), 0
    ),
    [filtered]
  )

  // Top exercises (by frequency) for the period, with template info
  const topExercises = useMemo(() => {
    const counts = {}
    const templates = {}
    filtered.forEach(w => {
      w.exercises.forEach(ex => {
        counts[ex.name] = (counts[ex.name] || 0) + 1
        if (!templates[ex.name]) templates[ex.name] = w.template
      })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, template: templates[name] }))
  }, [filtered])

  // Chart data for the period
  const chartData = useMemo(
    () => buildActivityChart(workouts, days),
    [workouts, days]
  )

  if (workouts.length === 0) {
    return (
      <div>
        <div className="screen-header">
          <h1 className="screen-title">History</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          No workouts yet.<br />Tap Create to start your first session.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="screen-header">
        <h1 className="screen-title">History</h1>
        <span className="fs-13 c-dim">{workouts.length} sessions</span>
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

      {/* Stats row */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-value">{daysActive}</div>
          <div className="stat-label">Days Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{filtered.length}</div>
          <div className="stat-label">Workouts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalSets}</div>
          <div className="stat-label">Sets</div>
        </div>
      </div>

      {/* Activity chart */}
      {chartData.length > 0 && (
        <div className="card">
          <div className="card-title">Activity</div>
          <ActivityChart data={chartData} />
        </div>
      )}

      {/* Top exercises */}
      {topExercises.length > 0 && (
        <>
          <div className="section-label">Top Exercises</div>
          {topExercises.map(ex => (
            <TopExerciseRow key={ex.name} {...ex} />
          ))}
        </>
      )}

      {/* All workouts */}
      <div className="section-label" style={{ marginTop: 16 }}>All Workouts</div>
      {workouts.map(workout => (
        <WorkoutCard key={workout.id} workout={workout} onSelect={onSelect} />
      ))}
    </div>
  )
}

/* ── Sub-components ── */

function ActivityChart({ data }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="bar-chart">
      {data.map((item, i) => (
        <div key={i} className="bar-col">
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ height: item.count > 0 ? `${Math.max(6, (item.count / max) * 100)}%` : '0%' }}
            />
          </div>
          <span className="bar-label">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function TopExerciseRow({ name, count, template }) {
  return (
    <div className="top-ex-row">
      <WorkoutIcon template={template || 'Push'} size={36} />
      <div className="top-ex-info">
        <div className="top-ex-name">{name}</div>
        <div className="top-ex-count">{count} session{count !== 1 ? 's' : ''}</div>
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginRight: 4 }}>
        {count}×
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  )
}

function WorkoutCard({ workout, onSelect }) {
  const summary = workout.exercises
    .slice(0, 3)
    .map(ex => {
      const top = getTopSet(ex)
      return `${ex.name.split(' ').pop()} ${top.weight}kg`
    })
    .join('  ·  ')

  return (
    <div className="card card-tap" onClick={() => onSelect(workout.id)}>
      <div className="workout-row-content">
        <WorkoutIcon template={workout.template} size={42} />
        <div className="workout-info">
          <div className="workout-template">
            <span className={`tag ${tagClass(workout.template)}`}
              style={{ marginRight: 6 }}>
              {workout.template}
            </span>
          </div>
          <div className="workout-summary">{summary}</div>
        </div>
        <div className="workout-time">
          <div>{formatDate(workout.date)}</div>
          <div style={{ marginTop: 4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
