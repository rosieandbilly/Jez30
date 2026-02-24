import { useState, useEffect } from 'react'
import { SEED_DATA } from './data/seed'
import NavBar from './components/NavBar'
import HistoryView from './components/HistoryView'
import WorkoutDetail from './components/WorkoutDetail'
import GenerateView from './components/GenerateView'
import ProgressView from './components/ProgressView'
import BodyweightView from './components/BodyweightView'

const STORAGE_KEY = 'jez30-tracker-v1'

function loadData() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) return JSON.parse(s)
  } catch {}
  return SEED_DATA
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

  const sortedWorkouts = [...data.workouts].sort((a, b) => b.date.localeCompare(a.date))

  if (detailId) {
    const workout = data.workouts.find(w => w.id === detailId)
    return (
      <div className="app">
        <WorkoutDetail
          workout={workout}
          workouts={data.workouts}
          onBack={() => setDetailId(null)}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="content">
        {tab === 'history' && (
          <HistoryView workouts={sortedWorkouts} onSelect={setDetailId} />
        )}
        {tab === 'generate' && (
          <GenerateView workouts={data.workouts} onSave={handleSaveWorkout} />
        )}
        {tab === 'progress' && (
          <ProgressView workouts={data.workouts} bodyweights={data.bodyweights} />
        )}
        {tab === 'weight' && (
          <BodyweightView bodyweights={data.bodyweights} onAdd={addBodyweight} />
        )}
      </div>
      <NavBar tab={tab} onChange={setTab} />
    </div>
  )
}
