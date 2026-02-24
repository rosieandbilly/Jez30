import { formatDate, tagClass, getTopSet } from '../utils'

export default function HistoryView({ workouts, onSelect }) {
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
          No workouts yet.<br />Tap Generate to start your first session.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="screen-header">
        <h1 className="screen-title">History</h1>
        <span className="c-dim fs-13">{workouts.length} sessions</span>
      </div>

      {workouts.map(workout => (
        <WorkoutCard key={workout.id} workout={workout} onSelect={onSelect} />
      ))}
    </div>
  )
}

function WorkoutCard({ workout, onSelect }) {
  // Show top sets for first 3 exercises as a summary line
  const summary = workout.exercises
    .slice(0, 3)
    .map(ex => {
      const top = getTopSet(ex)
      return `${ex.name.split(' ').pop()} ${top.weight}kg`
    })
    .join('  ·  ')

  return (
    <div className="card card-tap" onClick={() => onSelect(workout.id)}>
      <div className="row-sb" style={{ marginBottom: 8 }}>
        <span className={`tag ${tagClass(workout.template)}`}>
          {workout.template}
        </span>
        <span className="fs-13 c-dim">{formatDate(workout.date)}</span>
      </div>
      <div className="fs-13 c-dim">{summary}</div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)', display: 'flex', gap: 4, alignItems: 'center' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span style={{ color: 'var(--primary-light)', fontSize: 12 }}>View detail</span>
      </div>
    </div>
  )
}
