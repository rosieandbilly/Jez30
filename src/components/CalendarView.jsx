import { useState, useMemo } from 'react'
import { getCalendarGrid, groupByDate, calcTotalVolume, fmtVol } from '../utils'
import WorkoutIcon from './WorkoutIcon'

const DOW_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export default function CalendarView({ workouts, onSelectWorkout }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [selectedKey, setSelectedKey] = useState(null)

  // Map of date key → workouts for fast lookup
  const workoutsByDate = useMemo(() => groupByDate(workouts), [workouts])

  // Calendar grid cells
  const cells = useMemo(() => getCalendarGrid(year, month), [year, month])

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedKey(null)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedKey(null)
  }

  function handleDayTap(cell) {
    if (!cell.isCurrentMonth) return
    setSelectedKey(prev => prev === cell.key ? null : cell.key)
  }

  const selectedWorkouts = selectedKey ? (workoutsByDate[selectedKey] || []) : []

  const selectedDateLabel = selectedKey
    ? new Date(selectedKey + 'T12:00:00').toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : null

  return (
    <div>
      <div className="screen-header">
        <h1 className="screen-title">Calendar</h1>
      </div>

      {/* Calendar card */}
      <div className="card">
        {/* Month navigation */}
        <div className="cal-month-nav">
          <button className="cal-nav-btn" onClick={prevMonth} aria-label="Previous month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="cal-month-title">{monthLabel}</span>
          <button className="cal-nav-btn" onClick={nextMonth} aria-label="Next month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="cal-grid">
          {DOW_HEADERS.map(d => (
            <div key={d} className="cal-dow">{d}</div>
          ))}

          {/* Day cells */}
          {cells.map(cell => {
            const hasWorkout = cell.isCurrentMonth && !!workoutsByDate[cell.key]
            const isSelected = selectedKey === cell.key

            return (
              <button
                key={cell.key}
                className={[
                  'cal-day',
                  !cell.isCurrentMonth ? 'other-month' : '',
                  cell.isToday ? 'today' : '',
                  isSelected ? 'selected' : '',
                  hasWorkout ? 'has-workout' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => handleDayTap(cell)}
                aria-label={cell.key}
              >
                <span className="cal-day-num">{cell.day}</span>
                {hasWorkout && <span className="cal-dot" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedKey && (
        <div className="card">
          <div className="cal-detail-date">{selectedDateLabel}</div>

          {selectedWorkouts.length === 0 ? (
            <div className="cal-no-workout">No workout logged</div>
          ) : (
            selectedWorkouts.map(w => (
              <CalWorkoutRow key={w.id} workout={w} onSelect={onSelectWorkout} />
            ))
          )}
        </div>
      )}

      <div style={{ height: 8 }} />
    </div>
  )
}

function CalWorkoutRow({ workout, onSelect }) {
  const vol = calcTotalVolume(workout)
  const sets = workout.exercises.reduce(
    (s, ex) => s + ex.sets.filter(s => s.type !== 'warmup').length, 0
  )

  return (
    <div className="cal-workout-row" onClick={() => onSelect(workout.id)}>
      <WorkoutIcon template={workout.template} size={40} />
      <div className="cal-workout-info">
        <div className="cal-workout-name">{workout.template}</div>
        <div className="cal-workout-meta">
          {workout.exercises.length} exercises · {sets} sets · {fmtVol(vol)} kg vol
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  )
}
