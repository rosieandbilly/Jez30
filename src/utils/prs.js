// PR / personal-best detection — no external imports

function safeNum(x) {
  const n = Number(x)
  return Number.isFinite(n) ? n : 0
}

function normalizeName(name = '') {
  return String(name).trim().toLowerCase()
}

function bestStreakFromKeys(sortedKeys) {
  if (!sortedKeys.length) return 0
  let best = 1, run = 1
  for (let i = 1; i < sortedKeys.length; i++) {
    const prev = new Date(`${sortedKeys[i - 1]}T12:00:00`)
    const cur  = new Date(`${sortedKeys[i]}T12:00:00`)
    const diff = Math.round((cur - prev) / (1000 * 60 * 60 * 24))
    if (diff === 1) run += 1
    else run = 1
    best = Math.max(best, run)
  }
  return best
}

// ── Per-workout stats ──────────────────────────────────────────────────────────

export function computeWorkoutExerciseStats(workout) {
  // Returns { [normalisedExName]: { bestWeight, bestReps, volume, displayName } }
  const stats = {}
  for (const ex of workout.exercises || []) {
    const key = normalizeName(ex.name)
    if (!key) continue
    let bestWeight = 0, bestReps = 0, volume = 0
    for (const set of ex.sets || []) {
      const w = safeNum(set.weight)
      const r = safeNum(set.reps)
      bestWeight = Math.max(bestWeight, w)
      bestReps   = Math.max(bestReps, r)
      volume    += w * r
    }
    stats[key] = { bestWeight, bestReps, volume, displayName: ex.name }
  }
  return stats
}

// ── All-time PRs from a list of workouts ──────────────────────────────────────

export function computeAllTimePRs(workouts) {
  const prs = {}
  for (const w of workouts || []) {
    for (const [k, v] of Object.entries(computeWorkoutExerciseStats(w))) {
      const cur = prs[k] || { bestWeight: 0, bestReps: 0, bestVolume: 0, displayName: v.displayName }
      prs[k] = {
        displayName: cur.displayName || v.displayName,
        bestWeight: Math.max(cur.bestWeight, v.bestWeight),
        bestReps:   Math.max(cur.bestReps,   v.bestReps),
        bestVolume: Math.max(cur.bestVolume,  v.volume),
      }
    }
  }
  return prs
}

// ── Detect PB events from a new workout vs existing history ───────────────────

export function detectPBEvents({ workoutsBefore, newWorkout }) {
  const beforePRs = computeAllTimePRs(workoutsBefore)
  const newStats  = computeWorkoutExerciseStats(newWorkout)
  const events    = []

  for (const [k, v] of Object.entries(newStats)) {
    const prev = beforePRs[k] || { bestWeight: 0, bestReps: 0, bestVolume: 0 }
    if (v.bestWeight > prev.bestWeight) {
      events.push({ type: 'weight_pr', exerciseName: v.displayName, value: v.bestWeight, prevValue: prev.bestWeight })
    }
    if (v.bestReps > prev.bestReps) {
      events.push({ type: 'rep_pr', exerciseName: v.displayName, value: v.bestReps, prevValue: prev.bestReps })
    }
    if (v.volume > prev.bestVolume) {
      events.push({ type: 'volume_pr', exerciseName: v.displayName, value: Math.round(v.volume), prevValue: Math.round(prev.bestVolume) })
    }
  }

  // Streak PR: compare best streak before vs with new workout included
  const keysBefore = uniqueSortedDateKeys(workoutsBefore)
  const keysAfter  = uniqueSortedDateKeys([...workoutsBefore, newWorkout])
  const bestBefore = bestStreakFromKeys(keysBefore)
  const bestAfter  = bestStreakFromKeys(keysAfter)
  if (bestAfter > bestBefore && bestAfter >= 3) {
    events.push({ type: 'streak_pr', value: bestAfter, prevValue: bestBefore })
  }

  return events
}

// ── Current streak (consecutive days ending today or yesterday) ───────────────

export function computeCurrentStreak(workouts) {
  const sorted = uniqueSortedDateKeys(workouts)
  if (!sorted.length) return 0
  let run = 1
  for (let i = sorted.length - 1; i > 0; i--) {
    const prev = new Date(`${sorted[i - 1]}T12:00:00`)
    const cur  = new Date(`${sorted[i]}T12:00:00`)
    const diff = Math.round((cur - prev) / (1000 * 60 * 60 * 24))
    if (diff === 1) run += 1
    else break
  }
  return run
}

// ── Count PR events in the last N days ────────────────────────────────────────

export function countPRsInLastNDays(workouts, n = 7) {
  const now   = new Date()
  const cutMs = now.getTime() - n * 24 * 60 * 60 * 1000
  const recent  = workouts.filter(w => {
    if (!w.localDateKey) return false
    return new Date(`${w.localDateKey}T12:00:00`).getTime() >= cutMs
  })
  const before = workouts.filter(w => !recent.includes(w))
  let count = 0
  for (const w of recent) {
    const events = detectPBEvents({ workoutsBefore: before, newWorkout: w })
    count += events.length
    before.push(w)
  }
  return count
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uniqueSortedDateKeys(workouts) {
  return Array.from(new Set((workouts || []).map(w => w.localDateKey).filter(Boolean))).sort()
}
