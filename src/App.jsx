import { useState, useEffect, useCallback, useMemo } from 'react'
import { SEED_DATA, SEED_EXERCISES, SEED_TEMPLATES } from './data/seed'
import { getDateKey, todayLocalKey } from './utils'
import NavBar from './components/NavBar'
import HistoryView from './components/HistoryView'
import WorkoutDetail from './components/WorkoutDetail'
import CreateView from './components/CreateView'
import ProgressView from './components/ProgressView'
import BodyweightView from './components/BodyweightView'
import CalendarView from './components/CalendarView'

// Personalization
import CelebrationModal from './components/CelebrationModal'
import AchievementToast from './components/AchievementToast'
import WeeklyRecapCard from './components/WeeklyRecapCard'
import MascotBilly from './components/MascotBilly'
import { getLocalDateKey, isSundayLocal } from './utils/dateKey'
import { detectPBEvents, computeCurrentStreak, countPRsInLastNDays } from './utils/prs'
import { evaluateAchievements } from './utils/achievements'
import { computeWeeklyRecap } from './utils/weeklyRecap'

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY    = 'jez30-tracker-v1'
const BACKUP_KEY     = 'jez30-tracker-backup'
const ACH_KEY        = 'jez30-unlocked-achievements'
const RECAP_SEEN_KEY = 'jez30-last-recap-sunday'
const SCHEMA_VERSION = 3

// ── Data validation ───────────────────────────────────────────────────────────

function isValidData(d) {
  return (
    d !== null &&
    typeof d === 'object' &&
    Array.isArray(d.workouts) &&
    Array.isArray(d.bodyweights) &&
    typeof d.schemaVersion === 'number'
  )
}

function isRicherThan(candidate, existing) {
  // Prefer whichever has more workouts — prevents overwriting with an empty reset
  return (candidate.workouts?.length ?? 0) >= (existing.workouts?.length ?? 0)
}

// ── Migration ─────────────────────────────────────────────────────────────────

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
    updated.workouts = (updated.workouts || []).map(w => ({
      ...w,
      localDateKey: w.localDateKey || getDateKey(w.date),
    }))
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
  // Try primary key first, then backup, then seed
  const candidates = [STORAGE_KEY, BACKUP_KEY]
  for (const key of candidates) {
    try {
      const s = localStorage.getItem(key)
      if (!s) continue
      const parsed = JSON.parse(s)
      if (isValidData(parsed)) return migrate(parsed)
    } catch {}
  }
  const fresh = { ...SEED_DATA, exercises: SEED_EXERCISES, templates: SEED_TEMPLATES, schemaVersion: SCHEMA_VERSION }
  return migrate({ ...fresh, schemaVersion: 1 })
}

function loadTheme() {
  try { return localStorage.getItem('jez30-theme') || 'light' } catch { return 'light' }
}

function loadAchievements() {
  try { return JSON.parse(localStorage.getItem(ACH_KEY) || '[]') } catch { return [] }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function workoutsLast7Days(workouts) {
  const now    = Date.now()
  const cutoff = now - 7 * 24 * 60 * 60 * 1000
  return (workouts || []).filter(w => {
    if (!w.localDateKey) return false
    return new Date(`${w.localDateKey}T12:00:00`).getTime() >= cutoff
  }).length
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [data, setData]         = useState(loadData)
  const [tab, setTab]           = useState('history')
  const [detailId, setDetailId] = useState(null)
  const [prefillDate, setPrefillDate] = useState(null)
  const [theme, setTheme]       = useState(loadTheme)

  // ── Personalization state ──────────────────────────────────────────────────
  const [celebration, setCelebration]         = useState({ open: false, events: [] })
  const [toastAchievement, setToastAchievement] = useState(null)
  const [billyEvent, setBillyEvent]           = useState(null)
  const [weeklyRecap, setWeeklyRecap]         = useState(null)
  const [unlockedAchievements, setUnlockedAchievements] = useState(loadAchievements)
  const [lastRecapSundayKey, setLastRecapSundayKey] = useState(
    () => { try { return localStorage.getItem(RECAP_SEEN_KEY) || '' } catch { return '' } }
  )

  // ── Persist data & theme ───────────────────────────────────────────────────

  useEffect(() => {
    if (!isValidData(data)) return   // never overwrite with bad state

    try {
      // Read what's currently on disk before overwriting
      const existing = (() => {
        try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null } catch { return null }
      })()

      // Promote the current on-disk value to backup if it was valid and richer
      if (isValidData(existing) && isRicherThan(existing, data)) {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(existing))
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))

      // After writing, promote the new value to backup if it's the richest we've seen
      if (!isValidData(existing) || isRicherThan(data, existing)) {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(data))
      }
    } catch {}
  }, [data])

  useEffect(() => {
    try { localStorage.setItem('jez30-theme', theme) } catch {}
    document.documentElement.classList.toggle('dark-mode', theme === 'dark')
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  // ── Weekly recap: show once per Sunday ────────────────────────────────────

  useEffect(() => {
    const todayKey = getLocalDateKey()
    if (isSundayLocal(todayKey) && lastRecapSundayKey !== todayKey && data.workouts.length > 0) {
      setWeeklyRecap(
        computeWeeklyRecap({ workouts: data.workouts, bodyweights: data.bodyweights, endDateKey: todayKey })
      )
    }
  }, [data.workouts, data.bodyweights, lastRecapSundayKey])

  function dismissRecap() {
    const todayKey = getLocalDateKey()
    setWeeklyRecap(null)
    setLastRecapSundayKey(todayKey)
    try { localStorage.setItem(RECAP_SEEN_KEY, todayKey) } catch {}
  }

  // ── Workout handlers ───────────────────────────────────────────────────────

  function addWorkout(workout) {
    setData(d => ({ ...d, workouts: [...d.workouts, workout] }))
  }

  function deleteWorkout(id) {
    setData(d => ({ ...d, workouts: d.workouts.filter(w => w.id !== id) }))
  }

  function updateWorkout(workout) {
    setData(d => ({ ...d, workouts: d.workouts.map(w => w.id === workout.id ? workout : w) }))
  }

  function handleSaveWorkout(workout) {
    const workoutsBefore = data.workouts
    const workoutsAfter  = [...workoutsBefore, workout]

    // Save first
    addWorkout(workout)
    setPrefillDate(null)
    setTab('history')

    // ── PR detection ──────────────────────────────────────────────────────
    const pbEvents = detectPBEvents({ workoutsBefore, newWorkout: workout })
    if (pbEvents.length) {
      setCelebration({ open: true, events: pbEvents })
      setBillyEvent({ type: 'pr' })
    }

    // ── Achievements ──────────────────────────────────────────────────────
    const evaluated = evaluateAchievements({ workoutsBefore, workoutsAfter, pbEvents })
    const alreadyIds = new Set(unlockedAchievements.map(a => a.id))
    const newlyUnlocked = evaluated.filter(a => !alreadyIds.has(a.id))
    if (newlyUnlocked.length) {
      const updated = [...unlockedAchievements, ...newlyUnlocked.map(a => ({ ...a, unlockedAt: Date.now() }))]
      setUnlockedAchievements(updated)
      try { localStorage.setItem(ACH_KEY, JSON.stringify(updated)) } catch {}
      setToastAchievement(newlyUnlocked[0])
    }

    // ── Billy missed-week reaction ────────────────────────────────────────
    if (!pbEvents.length && workoutsBefore.length) {
      const lastKey = [...workoutsBefore].map(w => w.localDateKey).filter(Boolean).sort().pop()
      if (lastKey && workout.localDateKey) {
        const gapDays = Math.round(
          (new Date(`${workout.localDateKey}T12:00:00`) - new Date(`${lastKey}T12:00:00`)) / (1000 * 60 * 60 * 24)
        )
        if (gapDays >= 7) setBillyEvent({ type: 'missed' })
      }
    }

    // ── Billy deload reaction (volume < 70% of previous same-template workout) ──
    if (!pbEvents.length) {
      const prevSameTemplate = [...workoutsBefore]
        .filter(w => w.template === workout.template)
        .sort((a, b) => (b.localDateKey || '').localeCompare(a.localDateKey || ''))[0]
      if (prevSameTemplate) {
        const prevVol = prevSameTemplate.exercises.reduce((sum, ex) =>
          sum + (ex.sets || []).reduce((s, set) => s + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0), 0)
        const newVol = workout.exercises.reduce((sum, ex) =>
          sum + (ex.sets || []).reduce((s, set) => s + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0), 0)
        if (prevVol > 0 && newVol < prevVol * 0.7) {
          setBillyEvent({ type: 'deload', message: 'Respect the process.' })
        }
      }
    }
  }

  function handleDeleteWorkout(id) {
    deleteWorkout(id)
    setDetailId(null)
  }

  function handleUpdateWorkout(workout) {
    updateWorkout(workout)
    setDetailId(null)
  }

  // ── Export / Import ────────────────────────────────────────────────────────

  function handleExport() {
    const payload = { ...data, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jez30-backup-${todayLocalKey()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleImport(parsed, mode) {
    if (!parsed || !Array.isArray(parsed.workouts)) return
    const migrated = migrate({ ...parsed, schemaVersion: parsed.schemaVersion || 1 })
    if (mode === 'replace') {
      setData(migrated)
    } else {
      setData(d => {
        const existingWIds  = new Set(d.workouts.map(w => w.id))
        const existingBwIds = new Set(d.bodyweights.map(b => b.id))
        return {
          ...d,
          workouts:    [...d.workouts,    ...migrated.workouts.filter(w => !existingWIds.has(w.id))],
          bodyweights: [...d.bodyweights, ...(migrated.bodyweights || []).filter(b => !existingBwIds.has(b.id))],
        }
      })
    }
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

  const setExercises = useCallback((exercises) => {
    setData(d => ({ ...d, exercises }))
  }, [])

  // ── Template handlers ──────────────────────────────────────────────────────

  const setTemplates = useCallback((templates) => {
    setData(d => ({ ...d, templates }))
  }, [])

  // ── Navigation ─────────────────────────────────────────────────────────────

  const handleTabChange = useCallback((newTab) => {
    if (newTab !== 'create') setPrefillDate(null)
    setTab(newTab)
  }, [])

  const handleSelectWorkout = useCallback((id) => {
    setDetailId(id)
  }, [])

  const handleBack = useCallback(() => {
    setDetailId(null)
  }, [])

  const handleLogWorkout = useCallback((dateKey) => {
    setPrefillDate(dateKey)
    setTab('create')
  }, [])

  // ── Mascot signals (memoised — only recompute when workouts change) ─────────

  const sortedWorkouts = useMemo(
    () => [...data.workouts].sort((a, b) => b.date.localeCompare(a.date)),
    [data.workouts]
  )

  const billy_workoutsLast7 = useMemo(
    () => workoutsLast7Days(data.workouts),
    [data.workouts]
  )

  const billy_streak = useMemo(
    () => computeCurrentStreak(data.workouts),
    [data.workouts]
  )

  // countPRsInLastNDays is the most expensive call — iterate once per workouts change
  const billy_prsLast7 = useMemo(
    () => countPRsInLastNDays(data.workouts, 7),
    [data.workouts]
  )

  // ── Render ─────────────────────────────────────────────────────────────────

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
            exercises={data.exercises || SEED_EXERCISES}
            onBack={handleBack}
            onDelete={handleDeleteWorkout}
            onUpdate={handleUpdateWorkout}
          />
        </div>
        {/* Mascot still visible in detail view */}
        <MascotBilly
          workoutsLast7={billy_workoutsLast7}
          prsLast7={billy_prsLast7}
          streak={billy_streak}
          event={billyEvent}
        />
        <CelebrationModal
          isOpen={celebration.open}
          events={celebration.events}
          onClose={() => setCelebration({ open: false, events: [] })}
        />
        <AchievementToast achievement={toastAchievement} onDone={() => setToastAchievement(null)} />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="content">
        {tab === 'history' && (
          <>
            {weeklyRecap && (
              <WeeklyRecapCard recap={weeklyRecap} onDismiss={dismissRecap} />
            )}
            <HistoryView
              workouts={sortedWorkouts}
              onSelect={handleSelectWorkout}
              onExport={handleExport}
              onImport={handleImport}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          </>
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

      {/* Global overlays */}
      <MascotBilly
        workoutsLast7={billy_workoutsLast7}
        prsLast7={billy_prsLast7}
        streak={billy_streak}
        event={billyEvent}
      />
      <CelebrationModal
        isOpen={celebration.open}
        events={celebration.events}
        onClose={() => setCelebration({ open: false, events: [] })}
      />
      <AchievementToast achievement={toastAchievement} onDone={() => setToastAchievement(null)} />
    </div>
  )
}
