import { useState, useEffect } from 'react'
import { SEED_DATA, SEED_EXERCISES, SEED_TEMPLATES } from './data/seed'
import NavBar from './components/NavBar'
import HistoryView from './components/HistoryView'
import WorkoutDetail from './components/WorkoutDetail'
import CreateView from './components/CreateView'
import ProgressView from './components/ProgressView'
import BodyweightView from './components/BodyweightView'
import CalendarView from './components/CalendarView'

const STORAGE_KEY = 'jez30-tracker-v1'
const SCHEMA_VERSION = 2

/**
 * Migrate stored data from older schema versions.
 * v1 → v2: add exercise library + template definitions.
 */
function migrate(data) {
  const version = data.schemaVersion || 1
  if (version >= SCHEMA_VERSION) return data

  const updated = { ...data }

  // Add exercise library if not present
  if (!updated.exercises || updated.exercises.length === 0) {
    updated.exercises = SEED_EXERCISES
  }

  // Add templates if not present
  if (!updated.templates || updated.templates.length === 0) {
    updated.templates = SEED_TEMPLATES
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
  return {
    ...SEED_DATA,
    exercises: SEED_EXERCISES,
    templates: SEED_TEMPLATES,
    schemaVersion: SCHEMA_VERSION,
  }
}

export default function App() {
  const [data, setData] = useState(loadData)
  const [tab, setTab] = useState('history')
  const [detailId, setDetailId] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {}
  }, [data])

  // ── Workout handlers ──────────────────────────────────────────────────────

  function addWorkout(workout) {
    setData(d => ({ ...d, workouts: [...d.workouts, workout] }))
  }

  function addBodyweight(entry) {
    setData(d => ({ ...d, bodyweights: [...d.bodyweights, entry] }))
  }

  function handleSaveWorkout(workout) {
    addWorkout(workout)
    setTab('history')
  }

  // ── Exercise library handlers ─────────────────────────────────────────────

  function setExercises(exercises) {
    setData(d => ({ ...d, exercises }))
  }

  // ── Template handlers ─────────────────────────────────────────────────────

  function setTemplates(templates) {
    setData(d => ({ ...d, templates }))
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function handleSelectWorkout(id) {
    setDetailId(id)
  }

  function handleBack() {
    setDetailId(null)
  }

  const sortedWorkouts = [...data.workouts].sort((a, b) => b.date.localeCompare(a.date))

  // Workout detail overlay (full-screen, no nav bar)
  if (detailId) {
    const workout = data.workouts.find(w => w.id === detailId)
    return (
      <div className="app">
        <div className="content">
          <WorkoutDetail
            workout={workout}
            workouts={data.workouts}
            onBack={handleBack}
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
          <CalendarView workouts={data.workouts} onSelectWorkout={handleSelectWorkout} />
        )}
        {tab === 'create' && (
          <CreateView
            workouts={data.workouts}
            exercises={data.exercises || SEED_EXERCISES}
            templates={data.templates || SEED_TEMPLATES}
            onSave={handleSaveWorkout}
            onUpdateExercises={setExercises}
            onUpdateTemplates={setTemplates}
          />
        )}
        {tab === 'progress' && (
          <ProgressView
            workouts={data.workouts}
            bodyweights={data.bodyweights}
          />
        )}
        {tab === 'weight' && (
          <BodyweightView bodyweights={data.bodyweights} onAdd={addBodyweight} />
        )}
      </div>
      <NavBar tab={tab} onChange={setTab} />
    </div>
  )
}
