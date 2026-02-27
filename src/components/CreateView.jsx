import { useState, useCallback, useEffect } from 'react'
import {
  getTopSet, round2_5, generateWarmups, findPrevWorkout,
  todayLocalKey, formatDate,
} from '../utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const BODY_AREAS = ['Upper Body', 'Lower Body', 'Core', 'Full Body']

const AREA_COLORS = {
  'Upper Body': '#007AFF',
  'Lower Body': '#1c9e43',
  'Core':       '#b86800',
  'Full Body':  '#6e4db8',
}

const PROG_OPTIONS = [
  { value: 'none',               label: 'No change' },
  { value: 'fixed_increment',    label: 'Add weight each session' },
  { value: 'double_progression', label: 'Rep range, then add weight' },
]

// ─── Progression logic ────────────────────────────────────────────────────────

function calcNextSet(ex, lastTop) {
  const {
    defaultWeight = 20,
    defaultReps   = 8,
    progressionType      = 'fixed_increment',
    progressionIncrement = 2.5,
    minReps = null,
    maxReps = null,
  } = ex

  if (!lastTop) {
    return { weight: defaultWeight, reps: defaultReps }
  }

  if (progressionType === 'fixed_increment') {
    return { weight: lastTop.weight + progressionIncrement, reps: lastTop.reps }
  }

  if (progressionType === 'double_progression') {
    const hi = maxReps ?? defaultReps + 2
    const lo = minReps ?? defaultReps
    if (lastTop.reps >= hi) {
      return { weight: lastTop.weight + progressionIncrement, reps: lo }
    }
    return { weight: lastTop.weight, reps: lastTop.reps + 1 }
  }

  // 'none' or 'manual_suggestion_only' — carry forward last session
  return { weight: lastTop.weight, reps: lastTop.reps }
}

function buildWorkoutFromTemplate(template, workouts) {
  const last = findPrevWorkout(workouts, template.name, '9999')

  return template.exercises.map(ex => {
    const lastEx  = last?.exercises.find(e => e.name === ex.name)
    const lastTop = lastEx ? getTopSet(lastEx) : null

    const { weight: topWeight, reps: topReps } = calcNextSet(ex, lastTop)

    const backoffWeight = round2_5(topWeight * 0.8)
    const backoffReps   = ex.backoffReps ?? 8
    const backoffSets   = ex.backoffSets ?? 3
    const warmups       = generateWarmups(topWeight)

    return {
      name: ex.name,
      sets: [
        ...warmups,
        { weight: topWeight, reps: topReps, type: 'top' },
        ...(ex.backoff ? Array.from({ length: backoffSets }, () => ({
          weight: backoffWeight, reps: backoffReps, type: 'working',
        })) : []),
      ],
    }
  })
}

// ─── Workout Builder ──────────────────────────────────────────────────────────

function WorkoutBuilder({ template, workouts, onSave, onBack, prefillDate }) {
  const today = todayLocalKey()
  const [workoutDate, setWorkoutDate] = useState(prefillDate || today)
  const [exercises, setExercises]     = useState(() =>
    buildWorkoutFromTemplate(template, workouts).map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({ ...s, weight: String(s.weight), reps: String(s.reps) })),
    }))
  )
  const [saveError, setSaveError] = useState('')

  // Update exercises when prefillDate changes (e.g. user navigated away and back)
  useEffect(() => {
    if (prefillDate) setWorkoutDate(prefillDate)
  }, [prefillDate])

  const updateSet = useCallback((exIdx, setIdx, field, value) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      return { ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }) }
    }))
    setSaveError('')
  }, [])

  const stepSet = useCallback((exIdx, setIdx, field, delta) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      return {
        ...ex,
        sets: ex.sets.map((s, j) => {
          if (j !== setIdx) return s
          const cur = parseFloat(s[field]) || 0
          const next = field === 'weight'
            ? Math.max(0, round2_5(cur + delta))
            : Math.max(1, Math.round(cur + delta))
          return { ...s, [field]: String(next) }
        }),
      }
    }))
    setSaveError('')
  }, [])

  function handleSave() {
    for (const ex of exercises) {
      for (const set of ex.sets) {
        const w = parseFloat(set.weight)
        const r = parseInt(set.reps, 10)
        if (isNaN(w) || w < 0) {
          setSaveError(`Invalid weight for "${ex.name}" — check all fields.`)
          return
        }
        if (isNaN(r) || r < 1) {
          setSaveError(`Invalid reps for "${ex.name}" — must be ≥ 1.`)
          return
        }
      }
    }

    onSave({
      id: `w${Date.now()}`,
      date: workoutDate + 'T12:00:00',
      localDateKey: workoutDate,
      template: template.name,
      exercises: exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({
          ...s,
          weight: parseFloat(s.weight),
          reps: parseInt(s.reps, 10),
        })),
      })),
    })
  }

  const last = findPrevWorkout(workouts, template.name, '9999')

  return (
    <div>
      <div className="screen-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span className="flex-1" />
        <span style={{ fontSize: 17, fontWeight: 700, paddingRight: 4 }}>{template.name}</span>
      </div>

      {/* Date override */}
      <div className="builder-date-row">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Workout Date</label>
          <input
            type="date"
            className="input"
            value={workoutDate}
            max={today}
            onChange={e => setWorkoutDate(e.target.value)}
          />
        </div>
      </div>

      {last && (
        <div style={{ padding: '0 16px 12px' }}>
          <div className="info-box">
            Based on {formatDate(last.date)} session. Progression applied per exercise. Tap any number to edit.
          </div>
        </div>
      )}

      {exercises.map((ex, exIdx) => {
        const lastEx   = last?.exercises.find(e => e.name === ex.name)
        const lastTop  = lastEx ? getTopSet(lastEx) : null
        const thisTop  = ex.sets.find(s => s.type === 'top')
        const topW     = parseFloat(thisTop?.weight)

        return (
          <div className="card" key={exIdx}>
            <div className="exercise-name">{ex.name}</div>
            {lastTop && (
              <div className="prev-note">
                Last: <span>{lastTop.weight}kg × {lastTop.reps}</span>
                {thisTop && topW > lastTop.weight && (
                  <span style={{ marginLeft: 8, color: 'var(--success-text)', fontWeight: 700 }}>
                    → {thisTop.weight}kg
                  </span>
                )}
              </div>
            )}

            {ex.sets.map((set, setIdx) => (
              <div
                key={setIdx}
                className={`set-edit-row${set.type === 'top' ? ' is-top' : set.type === 'warmup' ? ' is-warmup' : ''}`}
              >
                <span className="set-type-badge">
                  {set.type === 'top' ? 'TOP' : set.type === 'warmup' ? 'WU' : ''}
                </span>

                {/* Weight stepper */}
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

                {/* Reps stepper */}
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
              </div>
            ))}
          </div>
        )
      })}

      {saveError && <div className="save-error">{saveError}</div>}

      <div style={{ padding: '4px 16px 20px' }}>
        <button className="btn btn-primary" onClick={handleSave}>
          Save Workout
        </button>
      </div>
    </div>
  )
}

// ─── Add Exercise Modal ───────────────────────────────────────────────────────

function AddExerciseModal({ onAdd, onClose }) {
  const [name, setName]         = useState('')
  const [bodyArea, setBodyArea] = useState('Upper Body')
  const [notes, setNotes]       = useState('')
  const [error, setError]       = useState('')

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) { setError('Exercise name is required'); return }
    const result = onAdd({ name: trimmed, bodyArea, notes: notes.trim() })
    if (result?.error) { setError(result.error); return }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">Add Exercise</div>

        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Dumbbell Curl"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            autoFocus
          />
          {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 5 }}>{error}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Body Area</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 2 }}>
            {BODY_AREAS.map(area => (
              <button
                key={area}
                className={`chip${bodyArea === area ? ' active' : ''}`}
                style={{ padding: '6px 14px' }}
                onClick={() => setBodyArea(area)}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Use EZ bar"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, width: 'auto', borderRadius: 'var(--radius-sm)' }}
            onClick={handleSubmit}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Exercises Panel ──────────────────────────────────────────────────────────

function ExercisesPanel({ exercises, onUpdate }) {
  const [search, setSearch]         = useState('')
  const [areaFilter, setAreaFilter] = useState('All')
  const [showAdd, setShowAdd]       = useState(false)
  const [deleteId, setDeleteId]     = useState(null)

  const areas = ['All', ...BODY_AREAS]

  const filtered = exercises
    .filter(ex => {
      const s = search.trim().toLowerCase()
      return (
        (!s || ex.name.toLowerCase().includes(s)) &&
        (areaFilter === 'All' || ex.bodyArea === areaFilter)
      )
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  function handleAdd(fields) {
    const dup = exercises.find(e => e.name.toLowerCase() === fields.name.toLowerCase())
    if (dup) return { error: `"${fields.name}" already exists` }
    onUpdate([...exercises, { id: `ex-${Date.now()}`, ...fields }])
    return {}
  }

  function handleDelete(id) {
    onUpdate(exercises.filter(e => e.id !== id))
    setDeleteId(null)
  }

  const deleteTarget = deleteId ? exercises.find(e => e.id === deleteId) : null

  return (
    <div>
      <div className="search-wrap">
        <input
          type="search"
          className="input"
          placeholder="Search exercises…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="chip-row">
        {areas.map(area => (
          <button
            key={area}
            className={`chip${areaFilter === area ? ' active' : ''}`}
            onClick={() => setAreaFilter(area)}
          >
            {area}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <span className="c-dim fs-13">No exercises found.</span>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.map(ex => (
            <div key={ex.id} className="ex-lib-row">
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: AREA_COLORS[ex.bodyArea] || 'var(--text-dim)',
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{ex.name}</div>
                <div className="ex-lib-area" style={{ color: AREA_COLORS[ex.bodyArea] || 'var(--text-dim)' }}>
                  {ex.bodyArea}
                </div>
                {ex.notes ? (
                  <div className="fs-12 c-dim" style={{ marginTop: 1 }}>{ex.notes}</div>
                ) : null}
              </div>
              <button
                className="icon-btn danger"
                onClick={() => setDeleteId(ex.id)}
                aria-label="Delete exercise"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '10px 16px 16px' }}>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add Exercise
        </button>
      </div>

      {showAdd && (
        <AddExerciseModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteId(null) }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="confirm-msg">Delete "{deleteTarget.name}"?</div>
            <div className="confirm-sub">This will not affect logged workouts.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ flex: 1, background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                onClick={() => handleDelete(deleteId)}
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

// ─── Template Editor Modal ────────────────────────────────────────────────────

function TemplateEditor({ exercises, template, onSave, onClose }) {
  const [name, setName]               = useState(template?.name || '')
  const [exerciseConfigs, setExerciseConfigs] = useState(() =>
    (template?.exercises || []).map(e => ({
      name:                e.name,
      defaultWeight:       e.defaultWeight       ?? 20,
      defaultReps:         e.defaultReps         ?? 8,
      backoff:             e.backoff             ?? false,
      backoffReps:         e.backoffReps         ?? 8,
      backoffSets:         e.backoffSets         ?? 3,
      progressionType:     e.progressionType     ?? 'fixed_increment',
      progressionIncrement: e.progressionIncrement ?? 2.5,
      minReps:             e.minReps             ?? null,
      maxReps:             e.maxReps             ?? null,
    }))
  )
  const [search, setSearch] = useState('')
  const [error, setError]   = useState('')

  const selectedNames = new Set(exerciseConfigs.map(e => e.name))

  const filteredEx = exercises.filter(ex =>
    !search || ex.name.toLowerCase().includes(search.toLowerCase())
  )

  function toggleExercise(exName) {
    if (selectedNames.has(exName)) {
      setExerciseConfigs(prev => prev.filter(c => c.name !== exName))
    } else {
      // Preserve existing config from template if re-adding
      const existing = template?.exercises.find(e => e.name === exName)
      setExerciseConfigs(prev => [...prev, {
        name:                exName,
        defaultWeight:       existing?.defaultWeight       ?? 20,
        defaultReps:         existing?.defaultReps         ?? 8,
        backoff:             existing?.backoff             ?? false,
        backoffReps:         existing?.backoffReps         ?? 8,
        backoffSets:         existing?.backoffSets         ?? 3,
        progressionType:     existing?.progressionType     ?? 'fixed_increment',
        progressionIncrement: existing?.progressionIncrement ?? 2.5,
        minReps:             existing?.minReps             ?? null,
        maxReps:             existing?.maxReps             ?? null,
      }])
    }
    setError('')
  }

  function updateConfig(idx, field, value) {
    setExerciseConfigs(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  function moveUp(idx) {
    if (idx === 0) return
    setExerciseConfigs(prev => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  function moveDown(idx) {
    setExerciseConfigs(prev => {
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) { setError('Template name is required'); return }
    if (exerciseConfigs.length === 0) { setError('Add at least one exercise'); return }

    onSave({
      ...(template || {}),
      id: template?.id || `tpl-${Date.now()}`,
      name: trimmed,
      exercises: exerciseConfigs,
    })
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">{template ? 'Edit Workout' : 'New Workout'}</div>

        {/* Template name */}
        <div className="form-group">
          <label className="form-label">Template Name</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Pull Day"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            autoFocus={!template}
          />
        </div>

        {/* Selected exercises — ordered with config */}
        {exerciseConfigs.length > 0 && (
          <div className="form-group">
            <label className="form-label">Exercises in order ({exerciseConfigs.length})</label>
            {exerciseConfigs.map((cfg, idx) => (
              <div key={`${cfg.name}-${idx}`} className="tpl-ex-item">
                {/* Header row */}
                <div className="tpl-ex-item-header">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <button
                      className="reorder-btn"
                      disabled={idx === 0}
                      onClick={() => moveUp(idx)}
                      aria-label="Move up"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>
                    <button
                      className="reorder-btn"
                      disabled={idx === exerciseConfigs.length - 1}
                      onClick={() => moveDown(idx)}
                      aria-label="Move down"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>
                  <span className="tpl-ex-item-name">{cfg.name}</span>
                  <button
                    className="icon-btn danger"
                    onClick={() => toggleExercise(cfg.name)}
                    aria-label="Remove exercise"
                    style={{ marginLeft: 'auto' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Defaults body */}
                <div className="tpl-ex-item-body">
                  {/* Weight + Reps + Backoff */}
                  <div className="tpl-ex-defaults-row">
                    <span className="tpl-mini-label">Wt</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      className="tpl-mini-input"
                      value={cfg.defaultWeight}
                      min="0"
                      step="2.5"
                      onChange={e => updateConfig(idx, 'defaultWeight', parseFloat(e.target.value) || 0)}
                    />
                    <span className="tpl-mini-label">kg</span>

                    <span className="tpl-mini-label" style={{ marginLeft: 4 }}>Reps</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      className="tpl-mini-input"
                      value={cfg.defaultReps}
                      min="1"
                      step="1"
                      onChange={e => updateConfig(idx, 'defaultReps', parseInt(e.target.value, 10) || 1)}
                    />

                    <button
                      className={`toggle-btn${cfg.backoff ? ' on' : ''}`}
                      onClick={() => updateConfig(idx, 'backoff', !cfg.backoff)}
                      style={{ marginLeft: 4 }}
                    >
                      Backoff {cfg.backoff ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Backoff reps/sets if enabled */}
                  {cfg.backoff && (
                    <div className="tpl-ex-defaults-row">
                      <span className="tpl-mini-label">Back sets</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="tpl-mini-input"
                        value={cfg.backoffSets}
                        min="1"
                        max="6"
                        onChange={e => updateConfig(idx, 'backoffSets', parseInt(e.target.value, 10) || 3)}
                      />
                      <span className="tpl-mini-label" style={{ marginLeft: 4 }}>× reps</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="tpl-mini-input"
                        value={cfg.backoffReps}
                        min="1"
                        onChange={e => updateConfig(idx, 'backoffReps', parseInt(e.target.value, 10) || 8)}
                      />
                    </div>
                  )}

                  {/* Progression */}
                  <div className="tpl-prog-row">
                    <span className="tpl-mini-label">Prog</span>
                    <select
                      className="tpl-prog-select"
                      value={cfg.progressionType}
                      onChange={e => updateConfig(idx, 'progressionType', e.target.value)}
                    >
                      {PROG_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {cfg.progressionType !== 'none' && (
                      <>
                        <span className="tpl-mini-label">+</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="tpl-mini-input"
                          value={cfg.progressionIncrement}
                          min="0.5"
                          step="0.5"
                          onChange={e => updateConfig(idx, 'progressionIncrement', parseFloat(e.target.value) || 2.5)}
                        />
                        <span className="tpl-mini-label">kg</span>
                      </>
                    )}
                  </div>

                  {/* Rep range for double progression */}
                  {cfg.progressionType === 'double_progression' && (
                    <div className="tpl-ex-defaults-row">
                      <span className="tpl-mini-label">Rep range</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="tpl-mini-input"
                        value={cfg.minReps ?? cfg.defaultReps}
                        min="1"
                        onChange={e => updateConfig(idx, 'minReps', parseInt(e.target.value, 10) || null)}
                      />
                      <span className="tpl-mini-label">–</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="tpl-mini-input"
                        value={cfg.maxReps ?? (cfg.defaultReps + 2)}
                        min="1"
                        onChange={e => updateConfig(idx, 'maxReps', parseInt(e.target.value, 10) || null)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Exercise picker */}
        <div className="form-group">
          <label className="form-label">
            Add Exercises{exerciseConfigs.length > 0 ? '' : ' (select at least one)'}
          </label>
          <input
            className="input"
            type="search"
            placeholder="Filter…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 8 }}
          />

          {exercises.length === 0 ? (
            <div className="c-dim fs-13" style={{ padding: '10px 0' }}>
              Add exercises in Create → Exercises first.
            </div>
          ) : (
            <div className="picker-list">
              {filteredEx.map(ex => {
                const sel = selectedNames.has(ex.name)
                return (
                  <div
                    key={ex.id}
                    className={`ex-checkbox-row${sel ? ' selected' : ''}`}
                    onClick={() => toggleExercise(ex.name)}
                  >
                    <div className={`ex-checkbox${sel ? ' checked' : ''}`}>
                      {sel && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="white" strokeWidth="3" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{ex.name}</div>
                      <div style={{
                        fontSize: 11, fontWeight: 600, marginTop: 1,
                        color: AREA_COLORS[ex.bodyArea] || 'var(--text-dim)',
                      }}>
                        {ex.bodyArea}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, width: 'auto', borderRadius: 'var(--radius-sm)' }}
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Workouts Panel ───────────────────────────────────────────────────────────

function WorkoutsPanel({ templates, exercises, onUpdate, onStartWorkout, prefillDate }) {
  const [showNew, setShowNew]     = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId]   = useState(null)

  const editingTemplate = editingId ? templates.find(t => t.id === editingId) : null
  const deleteTarget    = deleteId  ? templates.find(t => t.id === deleteId)  : null

  function handleCreate(tpl) { onUpdate([...templates, tpl]); setShowNew(false) }
  function handleEdit(updated) { onUpdate(templates.map(t => t.id === updated.id ? updated : t)); setEditingId(null) }
  function handleDelete(id) { onUpdate(templates.filter(t => t.id !== id)); setDeleteId(null) }

  return (
    <div>
      {prefillDate && (
        <div style={{ padding: '0 16px 10px' }}>
          <div className="info-box" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
            Logging for {prefillDate} — pick a template to start.
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <span className="c-dim fs-13">No workout templates yet. Create one below.</span>
        </div>
      ) : (
        templates.map(tpl => (
          <div key={tpl.id} className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{tpl.name}</div>
                <div className="fs-12 c-dim" style={{ marginTop: 2 }}>
                  {tpl.exercises.length} exercise{tpl.exercises.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="tpl-card-actions">
                <button className="icon-btn" onClick={() => setEditingId(tpl.id)} aria-label="Edit template">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="icon-btn danger" onClick={() => setDeleteId(tpl.id)} aria-label="Delete template">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="fs-12 c-dim" style={{ marginBottom: 12, lineHeight: 1.6 }}>
              {tpl.exercises.map(e => e.name).join(' · ')}
            </div>

            <button className="btn btn-primary" onClick={() => onStartWorkout(tpl)}>
              Start Workout
            </button>
          </div>
        ))
      )}

      <div style={{ padding: '4px 16px 20px' }}>
        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowNew(true)}>
          + New Workout Template
        </button>
      </div>

      {deleteTarget && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteId(null) }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="confirm-msg">Delete "{deleteTarget.name}"?</div>
            <div className="confirm-sub">This will not affect your logged workout history.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>Cancel</button>
              <button
                className="btn"
                style={{ flex: 1, background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                onClick={() => handleDelete(deleteId)}
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <TemplateEditor exercises={exercises} onSave={handleCreate} onClose={() => setShowNew(false)} />
      )}
      {editingTemplate && (
        <TemplateEditor
          exercises={exercises}
          template={editingTemplate}
          onSave={handleEdit}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}

// ─── Main CreateView ──────────────────────────────────────────────────────────

export default function CreateView({
  workouts, exercises, templates,
  onSave, onUpdateExercises, onUpdateTemplates,
  prefillDate,
}) {
  const [section, setSection]           = useState('exercises')
  const [activeTemplate, setActiveTemplate] = useState(null)

  // When a prefill date is given (from calendar quick-log), switch to workouts tab
  useEffect(() => {
    if (prefillDate) setSection('workouts')
  }, [prefillDate])

  if (activeTemplate) {
    return (
      <WorkoutBuilder
        template={activeTemplate}
        workouts={workouts}
        onSave={workout => { onSave(workout); setActiveTemplate(null) }}
        onBack={() => setActiveTemplate(null)}
        prefillDate={prefillDate}
      />
    )
  }

  return (
    <div>
      <div className="screen-header">
        <h1 className="screen-title">Create</h1>
      </div>

      <div className="seg-control">
        <button
          className={`seg-btn${section === 'exercises' ? ' active' : ''}`}
          onClick={() => setSection('exercises')}
        >
          Exercises
        </button>
        <button
          className={`seg-btn${section === 'workouts' ? ' active' : ''}`}
          onClick={() => setSection('workouts')}
        >
          Workouts
        </button>
      </div>

      {section === 'exercises' && (
        <ExercisesPanel exercises={exercises} onUpdate={onUpdateExercises} />
      )}
      {section === 'workouts' && (
        <WorkoutsPanel
          templates={templates}
          exercises={exercises}
          onUpdate={onUpdateTemplates}
          onStartWorkout={setActiveTemplate}
          prefillDate={prefillDate}
        />
      )}
    </div>
  )
}
