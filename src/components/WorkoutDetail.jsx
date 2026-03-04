import { useState } from 'react'
import {
  formatDate, formatDateShort, tagClass, getTopSet,
  findPrevWorkout, find3WeeksAgo, calcTotalVolume, fmtVol,
  round2_5, todayLocalKey,
} from '../utils'

// ─── Exercise picker for edit mode ────────────────────────────────────────────

function ExercisePickerModal({ exercises, existingNames, onAdd, onClose }) {
  const [search, setSearch] = useState('')
  const filtered = exercises.filter(ex =>
    !existingNames.has(ex.name) &&
    (!search || ex.name.toLowerCase().includes(search.toLowerCase()))
  )
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">Add Exercise</div>
        <input
          className="input"
          type="search"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 10 }}
          autoFocus
        />
        {filtered.length === 0 ? (
          <div className="c-dim fs-13" style={{ padding: '10px 0', textAlign: 'center' }}>
            {exercises.length === 0 ? 'No exercises in library.' : 'No matches.'}
          </div>
        ) : (
          <div className="picker-list" style={{ maxHeight: 300, overflowY: 'auto' }}>
            {filtered.map(ex => (
              <div
                key={ex.id}
                className="ex-checkbox-row"
                onClick={() => onAdd(ex.name)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{ex.bodyArea}</div>
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Workout Edit View ────────────────────────────────────────────────────────

function WorkoutEditView({ workout, exercises, onSave, onCancel }) {
  const today = todayLocalKey()
  const [workoutDate, setWorkoutDate] = useState(
    workout.localDateKey || workout.date.split('T')[0]
  )
  const [exList, setExList] = useState(() =>
    workout.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({ ...s, weight: String(s.weight), reps: String(s.reps) })),
    }))
  )
  const [saveError, setSaveError]       = useState('')
  const [showCancel, setShowCancel]     = useState(false)
  const [showExPicker, setShowExPicker] = useState(false)
  const [dirty, setDirty]               = useState(false)

  function mark() { setDirty(true); setSaveError('') }

  function updateSet(exIdx, setIdx, field, value) {
    setExList(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }),
    }))
    mark()
  }

  function stepSet(exIdx, setIdx, field, delta) {
    setExList(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => {
        if (j !== setIdx) return s
        const cur = parseFloat(s[field]) || 0
        const next = field === 'weight'
          ? Math.max(0, round2_5(cur + delta))
          : Math.max(1, Math.round(cur + delta))
        return { ...s, [field]: String(next) }
      }),
    }))
    mark()
  }

  function addSet(exIdx) {
    setExList(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      const last = ex.sets[ex.sets.length - 1] || { weight: '20', reps: '8', type: 'working' }
      return { ...ex, sets: [...ex.sets, { weight: last.weight, reps: last.reps, type: 'working' }] }
    }))
    mark()
  }

  function removeSet(exIdx, setIdx) {
    setExList(prev => prev.map((ex, i) => {
      if (i !== exIdx || ex.sets.length <= 1) return ex
      return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
    }))
    mark()
  }

  function removeExercise(exIdx) {
    setExList(prev => prev.filter((_, i) => i !== exIdx))
    mark()
  }

  function addExercise(name) {
    setExList(prev => [...prev, { name, sets: [{ weight: '20', reps: '8', type: 'working' }] }])
    setShowExPicker(false)
    mark()
  }

  function cycleType(exIdx, setIdx) {
    const types = ['warmup', 'top', 'working']
    setExList(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => {
        if (j !== setIdx) return s
        return { ...s, type: types[(types.indexOf(s.type) + 1) % types.length] }
      }),
    }))
    mark()
  }

  function handleSave() {
    for (const ex of exList) {
      for (const set of ex.sets) {
        const w = parseFloat(set.weight)
        const r = parseInt(set.reps, 10)
        if (isNaN(w) || w < 0) { setSaveError(`Invalid weight for "${ex.name}"`); return }
        if (isNaN(r) || r < 1) { setSaveError(`Invalid reps for "${ex.name}"`); return }
      }
    }
    onSave({
      ...workout,
      date: workoutDate + 'T12:00:00',
      localDateKey: workoutDate,
      exercises: exList.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({
          ...s,
          weight: parseFloat(s.weight),
          reps: parseInt(s.reps, 10),
        })),
      })),
    })
  }

  function handleCancel() {
    if (dirty) setShowCancel(true)
    else onCancel()
  }

  const existingNames = new Set(exList.map(e => e.name))

  return (
    <div>
      <div className="screen-header">
        <button className="back-btn" onClick={handleCancel}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Cancel
        </button>
        <span className="flex-1" />
        <button
          className="btn btn-primary"
          style={{ height: 32, fontSize: 14, width: 'auto', padding: '0 14px', borderRadius: 'var(--radius-sm)' }}
          onClick={handleSave}
        >
          Save
        </button>
      </div>

      <div className="builder-date-row">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Workout Date</label>
          <input
            type="date"
            className="input"
            value={workoutDate}
            max={today}
            onChange={e => { setWorkoutDate(e.target.value); mark() }}
          />
        </div>
      </div>

      {exList.map((ex, exIdx) => (
        <div className="card" key={exIdx}>
          <div className="row-sb" style={{ marginBottom: 8 }}>
            <span className="exercise-name" style={{ marginBottom: 0 }}>{ex.name}</span>
            <button
              className="icon-btn danger"
              onClick={() => removeExercise(exIdx)}
              aria-label="Remove exercise"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {ex.sets.map((set, setIdx) => (
            <div
              key={setIdx}
              className={`set-edit-row${set.type === 'top' ? ' is-top' : set.type === 'warmup' ? ' is-warmup' : ''}`}
            >
              <button
                className="set-type-btn"
                onClick={() => cycleType(exIdx, setIdx)}
                title="Tap to cycle type"
              >
                {set.type === 'top' ? 'TOP' : set.type === 'warmup' ? 'WU' : 'WK'}
              </button>

              <button className="step-btn" onClick={() => stepSet(exIdx, setIdx, 'weight', -2.5)}>−</button>
              <input
                type="number"
                inputMode="decimal"
                className="set-num-input"
                value={set.weight}
                min="0"
                step="2.5"
                onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
              />
              <button className="step-btn" onClick={() => stepSet(exIdx, setIdx, 'weight', 2.5)}>+</button>
              <span className="set-unit">kg</span>
              <span className="set-unit" style={{ color: 'var(--border)', margin: '0 2px' }}>×</span>
              <button className="step-btn" onClick={() => stepSet(exIdx, setIdx, 'reps', -1)}>−</button>
              <input
                type="number"
                inputMode="numeric"
                className="set-num-input"
                value={set.reps}
                min="1"
                step="1"
                onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
              />
              <button className="step-btn" onClick={() => stepSet(exIdx, setIdx, 'reps', 1)}>+</button>
              <span className="set-unit">rp</span>
              <button
                className="icon-btn danger"
                style={{ marginLeft: 4 }}
                onClick={() => removeSet(exIdx, setIdx)}
                aria-label="Remove set"
                disabled={ex.sets.length <= 1}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}

          <button
            className="btn btn-secondary"
            style={{ marginTop: 10, height: 34, fontSize: 13 }}
            onClick={() => addSet(exIdx)}
          >
            + Add Set
          </button>
        </div>
      ))}

      {saveError && <div className="save-error">{saveError}</div>}

      <div style={{ padding: '4px 16px 8px', display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowExPicker(true)}>
          + Add Exercise
        </button>
      </div>

      <div style={{ height: 24 }} />

      {showCancel && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCancel(false) }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="confirm-msg">Discard changes?</div>
            <div className="confirm-sub">Your edits will be lost.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCancel(false)}>
                Keep editing
              </button>
              <button
                className="btn"
                style={{ flex: 1, background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                onClick={onCancel}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {showExPicker && (
        <ExercisePickerModal
          exercises={exercises}
          existingNames={existingNames}
          onAdd={addExercise}
          onClose={() => setShowExPicker(false)}
        />
      )}
    </div>
  )
}

// ─── Main Workout Detail View ─────────────────────────────────────────────────

export default function WorkoutDetail({ workout, workouts, exercises, onBack, onDelete, onUpdate }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isEditing, setIsEditing]         = useState(false)

  if (isEditing) {
    return (
      <WorkoutEditView
        workout={workout}
        exercises={exercises || []}
        onSave={updated => { onUpdate(updated); setIsEditing(false) }}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  const prev    = findPrevWorkout(workouts, workout.template, workout.date)
  const threeWk = find3WeeksAgo(workouts, workout.template, workout.date, prev?.id)

  const totalVol  = calcTotalVolume(workout)
  const topWeight = workout.exercises.reduce((max, ex) => {
    const t = getTopSet(ex)
    return t.weight > max ? t.weight : max
  }, 0)

  return (
    <div>
      {/* Header */}
      <div className="screen-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span className="flex-1" />
        <span className={`tag ${tagClass(workout.template)}`}>{workout.template}</span>
        <span className="fs-13 c-dim" style={{ marginLeft: 8 }}>{formatDate(workout.date)}</span>
        {onUpdate && (
          <button
            className="icon-btn"
            onClick={() => setIsEditing(true)}
            aria-label="Edit workout"
            style={{ marginLeft: 4 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        {onDelete && (
          <button
            className="icon-btn danger"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete workout"
            style={{ marginLeft: 4 }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        )}
      </div>

      {/* Metric tiles */}
      <div className="metric-row">
        <div className="metric-tile">
          <div className="metric-value">{workout.exercises.length}</div>
          <div className="metric-label">Exercises</div>
        </div>
        <div className="metric-tile">
          <div className="metric-value">{fmtVol(totalVol)}</div>
          <div className="metric-label">kg Volume</div>
        </div>
        <div className="metric-tile">
          <div className="metric-value">{topWeight}</div>
          <div className="metric-label">kg Top Set</div>
        </div>
      </div>

      {/* Comparison legend */}
      {(prev || threeWk) && (
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {prev && (
            <span className="fs-12 c-dim">
              Prev:&nbsp;<span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatDateShort(prev.date)}</span>
            </span>
          )}
          {threeWk && (
            <span className="fs-12 c-dim">
              3 wk:&nbsp;<span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatDateShort(threeWk.date)}</span>
            </span>
          )}
        </div>
      )}

      {/* Notes */}
      {workout.notes && (
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="fs-12 c-dim" style={{ marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>{workout.notes}</div>
        </div>
      )}

      {/* Exercise cards */}
      {workout.exercises.map((ex, i) => {
        const prevEx   = prev?.exercises.find(e => e.name === ex.name)
        const threeEx  = threeWk?.exercises.find(e => e.name === ex.name)
        const prevTop  = prevEx  ? getTopSet(prevEx)  : null
        const threeTop = threeEx ? getTopSet(threeEx) : null
        const thisTop  = getTopSet(ex)
        const isNewPR  = prevTop && thisTop.weight > prevTop.weight

        return (
          <div className="card" key={i}>
            <div className="row-sb" style={{ marginBottom: 8 }}>
              <span className="exercise-name" style={{ marginBottom: 0 }}>{ex.name}</span>
              {isNewPR && <span className="pr-badge">PR</span>}
            </div>

            <div className="sets-row">
              {ex.sets.map((set, j) => (
                <span
                  key={j}
                  className={`set-chip${set.type === 'top' ? ' top' : set.type === 'warmup' ? ' warmup' : ''}${set.done ? ' done-chip' : ''}`}
                >
                  {set.done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                      style={{ marginRight: 3 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {set.weight}kg&thinsp;&times;&thinsp;{set.reps}
                </span>
              ))}
            </div>

            {(prevTop || threeTop) && (
              <div className="comparison">
                {prevTop && (
                  <span>
                    Prev:&nbsp;
                    <span className="cmp-val">{prevTop.weight}kg&thinsp;&times;&thinsp;{prevTop.reps}</span>
                    {thisTop.weight > prevTop.weight && (
                      <span style={{ marginLeft: 4, color: 'var(--success-text)', fontSize: 11, fontWeight: 700 }}>
                        +{(thisTop.weight - prevTop.weight).toFixed(1)}kg
                      </span>
                    )}
                  </span>
                )}
                {threeTop && (
                  <span>
                    3wk:&nbsp;
                    <span className="cmp-val">{threeTop.weight}kg&thinsp;&times;&thinsp;{threeTop.reps}</span>
                    {thisTop.weight > threeTop.weight && (
                      <span style={{ marginLeft: 4, color: 'var(--success-text)', fontSize: 11, fontWeight: 700 }}>
                        +{(thisTop.weight - threeTop.weight).toFixed(1)}kg
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}

      <div style={{ height: 16 }} />

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(false) }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="confirm-msg">Delete this workout?</div>
            <div className="confirm-sub">
              {workout.template} · {formatDate(workout.date)}<br />
              This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ flex: 1, background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                onClick={() => onDelete(workout.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
