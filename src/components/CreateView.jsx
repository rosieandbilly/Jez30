import { useState, useCallback } from 'react'
import { getTopSet, round2_5, generateWarmups, findPrevWorkout } from '../utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const BODY_AREAS = ['Upper Body', 'Lower Body', 'Core', 'Full Body']

const AREA_COLORS = {
  'Upper Body': '#007AFF',
  'Lower Body': '#1c9e43',
  'Core':       '#b86800',
  'Full Body':  '#6e4db8',
}

// ─── Workout Builder (replaces old GenerateView logic) ────────────────────────

function buildWorkoutFromTemplate(template, workouts) {
  const last = findPrevWorkout(workouts, template.name, '9999')

  return template.exercises.map(({ name, defaultWeight, defaultReps, backoff }) => {
    let topWeight = defaultWeight ?? 20
    let topReps   = defaultReps  ?? 8

    if (last) {
      const lastEx = last.exercises.find(e => e.name === name)
      if (lastEx) {
        const lastTop = getTopSet(lastEx)
        topWeight = lastTop.weight + 2.5
        topReps   = lastTop.reps
      }
    }

    const backoffWeight = round2_5(topWeight * 0.8)
    const warmups       = generateWarmups(topWeight)

    return {
      name,
      sets: [
        ...warmups,
        { weight: topWeight, reps: topReps, type: 'top' },
        ...(backoff ? [
          { weight: backoffWeight, reps: 8, type: 'working' },
          { weight: backoffWeight, reps: 8, type: 'working' },
          { weight: backoffWeight, reps: 8, type: 'working' },
        ] : []),
      ],
    }
  })
}

function WorkoutBuilder({ template, workouts, onSave, onBack }) {
  const [exercises, setExercises] = useState(
    () => buildWorkoutFromTemplate(template, workouts)
  )

  const updateSet = useCallback((exIdx, setIdx, field, value) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      return {
        ...ex,
        sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: Number(value) }),
      }
    }))
  }, [])

  function handleSave() {
    onSave({
      id: `w${Date.now()}`,
      date: new Date().toISOString(),
      template: template.name,
      exercises,
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

      {last && (
        <div style={{ padding: '0 16px 12px' }}>
          <div className="info-box">
            Based on last {template.name} — top sets +2.5 kg. Tap any number to edit.
          </div>
        </div>
      )}

      {exercises.map((ex, exIdx) => {
        const lastEx  = last?.exercises.find(e => e.name === ex.name)
        const lastTop = lastEx ? getTopSet(lastEx) : null
        const thisTop = ex.sets.find(s => s.type === 'top')

        return (
          <div className="card" key={exIdx}>
            <div className="exercise-name">{ex.name}</div>
            {lastTop && (
              <div className="prev-note">
                Last: <span>{lastTop.weight}kg&thinsp;&times;&thinsp;{lastTop.reps}</span>
                {thisTop && (
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
                <input
                  type="number"
                  className="set-num-input"
                  value={set.weight}
                  min="0"
                  step="2.5"
                  onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                />
                <span className="set-unit">kg</span>
                <span className="set-unit" style={{ color: 'var(--border)' }}>×</span>
                <input
                  type="number"
                  className="set-num-input"
                  value={set.reps}
                  min="1"
                  step="1"
                  onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                />
                <span className="set-unit">reps</span>
              </div>
            ))}
          </div>
        )
      })}

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

// ─── Exercises Panel ─────────────────────────────────────────────────────────

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
      {/* Search */}
      <div className="search-wrap">
        <input
          type="search"
          className="input"
          placeholder="Search exercises…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Body area filter chips */}
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

      {/* Exercise list */}
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
                <div
                  className="ex-lib-area"
                  style={{ color: AREA_COLORS[ex.bodyArea] || 'var(--text-dim)' }}
                >
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

      {/* Add button */}
      <div style={{ padding: '10px 16px 16px' }}>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add Exercise
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <AddExerciseModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />
      )}

      {/* Delete confirmation modal */}
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
  const [name, setName] = useState(template?.name || '')
  const [selectedNames, setSelectedNames] = useState(
    () => template?.exercises.map(e => e.name) || []
  )
  const [search, setSearch] = useState('')
  const [error, setError]   = useState('')

  const filteredEx = exercises.filter(ex =>
    !search || ex.name.toLowerCase().includes(search.toLowerCase())
  )

  function toggleExercise(exName) {
    setSelectedNames(prev =>
      prev.includes(exName)
        ? prev.filter(n => n !== exName)
        : [...prev, exName]
    )
    setError('')
  }

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) { setError('Template name is required'); return }
    if (selectedNames.length === 0) { setError('Add at least one exercise'); return }

    const exercisesToSave = selectedNames.map(n => {
      const existing = template?.exercises.find(e => e.name === n)
      return existing || { name: n, defaultWeight: 20, defaultReps: 8, backoff: false }
    })

    onSave({
      ...(template || {}),
      id: template?.id || `tpl-${Date.now()}`,
      name: trimmed,
      exercises: exercisesToSave,
    })
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">{template ? 'Edit Workout' : 'New Workout'}</div>

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

        <div className="form-group">
          <label className="form-label">
            Exercises{selectedNames.length > 0 ? ` (${selectedNames.length} selected)` : ''}
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
                const sel = selectedNames.includes(ex.name)
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
                      <div
                        style={{
                          fontSize: 11, fontWeight: 600, marginTop: 1,
                          color: AREA_COLORS[ex.bodyArea] || 'var(--text-dim)',
                        }}
                      >
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

function WorkoutsPanel({ templates, exercises, onUpdate, onStartWorkout }) {
  const [showNew, setShowNew]           = useState(false)
  const [editingId, setEditingId]       = useState(null)
  const [deleteId, setDeleteId]         = useState(null)

  const editingTemplate = editingId ? templates.find(t => t.id === editingId) : null
  const deleteTarget    = deleteId  ? templates.find(t => t.id === deleteId)  : null

  function handleCreate(tpl) {
    onUpdate([...templates, tpl])
    setShowNew(false)
  }

  function handleEdit(updated) {
    onUpdate(templates.map(t => t.id === updated.id ? updated : t))
    setEditingId(null)
  }

  function handleDelete(id) {
    onUpdate(templates.filter(t => t.id !== id))
    setDeleteId(null)
  }

  return (
    <div>
      {templates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <span className="c-dim fs-13">No workout templates yet. Create one below.</span>
        </div>
      ) : (
        templates.map(tpl => (
          <div key={tpl.id} className="card">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{tpl.name}</div>
                <div className="fs-12 c-dim" style={{ marginTop: 2 }}>
                  {tpl.exercises.length} exercise{tpl.exercises.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="tpl-card-actions">
                <button
                  className="icon-btn"
                  onClick={() => setEditingId(tpl.id)}
                  aria-label="Edit template"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => setDeleteId(tpl.id)}
                  aria-label="Delete template"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Exercise summary */}
            <div className="fs-12 c-dim" style={{ marginBottom: 12, lineHeight: 1.6 }}>
              {tpl.exercises.map(e => e.name).join(' · ')}
            </div>

            {/* Start button */}
            <button className="btn btn-primary" onClick={() => onStartWorkout(tpl)}>
              Start Workout
            </button>
          </div>
        ))
      )}

      {/* New template button */}
      <div style={{ padding: '4px 16px 20px' }}>
        <button
          className="btn btn-secondary"
          style={{ width: '100%' }}
          onClick={() => setShowNew(true)}
        >
          + New Workout Template
        </button>
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteId(null) }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="confirm-msg">Delete "{deleteTarget.name}"?</div>
            <div className="confirm-sub">This will not affect your logged workout history.</div>
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

      {/* New template editor */}
      {showNew && (
        <TemplateEditor
          exercises={exercises}
          onSave={handleCreate}
          onClose={() => setShowNew(false)}
        />
      )}

      {/* Edit template editor */}
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
}) {
  const [section, setSection]             = useState('exercises')
  const [activeTemplate, setActiveTemplate] = useState(null)

  // When a workout is started from a template
  if (activeTemplate) {
    return (
      <WorkoutBuilder
        template={activeTemplate}
        workouts={workouts}
        onSave={workout => { onSave(workout); setActiveTemplate(null) }}
        onBack={() => setActiveTemplate(null)}
      />
    )
  }

  return (
    <div>
      <div className="screen-header">
        <h1 className="screen-title">Create</h1>
      </div>

      {/* Exercises | Workouts segmented control */}
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
        />
      )}
    </div>
  )
}
