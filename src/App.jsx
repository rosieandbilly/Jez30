import { useState, useEffect } from 'react'
import { SEED_DATA, SEED_EXERCISES, SEED_TEMPLATES } from './data/seed'
import { getDateKey } from './utils'
import NavBar from './components/NavBar'
import HistoryView from './components/HistoryView'
import WorkoutDetail from './components/WorkoutDetail'
import CreateView from './components/CreateView'
import ProgressView from './components/ProgressView'
import BodyweightView from './components/BodyweightView'
import CalendarView from './components/CalendarView'

const STORAGE_KEY = 'jez30-tracker-v1'
const SCHEMA_VERSION = 3

/**
 * Migrate stored data across schema versions.
 * v1 → v2: add exercise library + template definitions.
 * v2 → v3: add localDateKey to workouts; add progression fields to template exercises.
 */
function migrate(data) {
  const version = data.schemaVersion || 1
  if (version >= SCHEMA_VERSION) return data

  const updated = { ...data }

  // v1 → v2
  if (version < 2) {
    if (!updated.exercises || updated.exercises.length === 0) {
      updated.exercises = SEED_EXERCISES
    }
    if (!updated.templates || updated.templates.length === 0) {
      updated.templates = SEED_TEMPLATES
    }
  }

  // v2 → v3
  if (version < 3) {
    // Stamp localDateKey on existing workouts
    updated.workouts = (updated.workouts || []).map(w => ({
      ...w,
      localDateKey: w.localDateKey || getDateKey(w.date),
    }))
    // Add progression fields to template exercises (non-destructively)
    updated.templates = (updated.templates || []).map(t => ({
      ...t,
      exercises: t.exercises.map(e => ({
        progressionType: 'fixed_increment',
        progressionIncrement: 2.5,
        minReps: null,
        maxReps: null,
        backoffReps: 8,
        backoffSets: 3,
        ...e,
      })),
    }))
  }

  updated.schemaVersion = SCHEMA_VERSION
  return updated
}

function loadData() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) {
      const parsed = JSON.parse(s)
      return migrate(parsed)
    }
  } catch {}
  // Fresh seed — stamp localDateKey and progression fields
  const fresh = {
    ...SEED_DATA,
    exercises: SEED_EXERCISES,
    templates: SEED_TEMPLATES,
    schemaVersion: SCHEMA_VERSION,
  }
  return migrate({ ...fresh, schemaVersion: 1 })
}

export default function App() {
  const [data, setData]           = useState(loadData)
  const [tab, setTab]             = useState('history')
  const [detailId, setDetailId]   = useState(null)
  const [prefillDate, setPrefillDate] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {}
  }, [data])

  // ── Workout handlers ──────────────────────────────────────────────────────

  function addWorkout(workout) {
    setData(d => ({ ...d, workouts: [...d.workouts, workout] }))
  }

  function deleteWorkout(id) {
    setData(d => ({ ...d, workouts: d.workouts.filter(w => w.id !== id) }))
  }

  function handleSaveWorkout(workout) {
    addWorkout(workout)
    setPrefillDate(null)
    setTab('history')
  }

  function handleDeleteWorkout(id) {
    deleteWorkout(id)
    setDetailId(null)
  }

  // ── Bodyweight handlers ────────────────────────────────────────────────────

  function addBodyweight(entry) {
    setData(d => ({ ...d, bodyweights: [...d.bodyweights, entry] }))
  }

  function updateBodyweight(entry) {
    setData(d => ({
      ...d,
      bodyweights: d.bodyweights.map(bw => bw.id === entry.id ? entry : bw),
    }))
  }

  function deleteBodyweight(id) {
    setData(d => ({ ...d, bodyweights: d.bodyweights.filter(bw => bw.id !== id) }))
  }

  // ── Exercise library handlers ──────────────────────────────────────────────

  function setExercises(exercises) {
    setData(d => ({ ...d, exercises }))
  }

  // ── Template handlers ──────────────────────────────────────────────────────

  function setTemplates(templates) {
    setData(d => ({ ...d, templates }))
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function handleTabChange(newTab) {
    if (newTab !== 'create') setPrefillDate(null)
    setTab(newTab)
  }

  function handleSelectWorkout(id) {
    setDetailId(id)
  }

  function handleBack() {
    setDetailId(null)
  }

  function handleLogWorkout(dateKey) {
    setPrefillDate(dateKey)
    setTab('create')
  }

  const sortedWorkouts = [...data.workouts].sort((a, b) => b.date.localeCompare(a.date))

  // Workout detail overlay (full-screen, no nav bar)
  if (detailId) {
    const workout = data.workouts.find(w => w.id === detailId)
    if (!workout) { setDetailId(null); return null }
    return (
      <div className="app">
        <div className="content">
          <WorkoutDetail
            workout={workout}
            workouts={data.workouts}
            onBack={handleBack}
            onDelete={handleDeleteWorkout}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="content">
        {tab === 'history' && (
          <HistoryView workouts={sortedWorkouts} onSelect={handleSelectWorkout} />
        )}
        {tab === 'calendar' && (
          <CalendarView
            workouts={data.workouts}
            onSelectWorkout={handleSelectWorkout}
            onLogWorkout={handleLogWorkout}
          />
        )}
        {tab === 'create' && (
          <CreateView
            workouts={data.workouts}
            exercises={data.exercises || SEED_EXERCISES}
            templates={data.templates || SEED_TEMPLATES}
            onSave={handleSaveWorkout}
            onUpdateExercises={setExercises}
            onUpdateTemplates={setTemplates}
            prefillDate={prefillDate}
          />
        )}
        {tab === 'progress' && (
          <ProgressView
            workouts={data.workouts}
            bodyweights={data.bodyweights}
          />
        )}
        {tab === 'weight' && (
          <BodyweightView
            bodyweights={data.bodyweights}
            onAdd={addBodyweight}
            onUpdate={updateBodyweight}
            onDelete={deleteBodyweight}
          />
        )}
      </div>
      <NavBar tab={tab} onChange={handleTabChange} />
    </div>
  )
}
