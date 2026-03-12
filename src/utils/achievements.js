import { parseLocalDateKey } from './dateKey'

export const ACHIEVEMENT_IDS = {
  FIRST_WORKOUT:       'first_workout_logged',
  THREE_WEEK_STREAK:   'three_week_streak',
  BACK_AFTER_BREAK:    'back_after_break',
  TEN_SQUAT_SESSIONS:  'ten_sessions_of_squats',
  VOLUME_PR:           'volume_pr',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bestStreak(workouts) {
  const keys = uniqueSorted(workouts)
  if (!keys.length) return 0
  let best = 1, run = 1
  for (let i = 1; i < keys.length; i++) {
    const diff = daysBetween(keys[i - 1], keys[i])
    if (diff === 1) run += 1
    else run = 1
    best = Math.max(best, run)
  }
  return best
}

function gapSinceLastWorkout(before, newWorkout) {
  const keys = uniqueSorted(before)
  if (!keys.length || !newWorkout?.localDateKey) return 0
  return daysBetween(keys[keys.length - 1], newWorkout.localDateKey)
}

function countSessionsWithExercise(workouts, substring) {
  const sub = substring.toLowerCase()
  return (workouts || []).filter(w =>
    (w.exercises || []).some(ex => ex.name.toLowerCase().includes(sub))
  ).length
}

function uniqueSorted(workouts) {
  return Array.from(new Set((workouts || []).map(w => w.localDateKey).filter(Boolean))).sort()
}

function daysBetween(keyA, keyB) {
  return Math.round((parseLocalDateKey(keyB) - parseLocalDateKey(keyA)) / (1000 * 60 * 60 * 24))
}

// ── Main evaluator ────────────────────────────────────────────────────────────

export function evaluateAchievements({ workoutsBefore, workoutsAfter, pbEvents }) {
  const before = workoutsBefore || []
  const after  = workoutsAfter  || []
  const newWorkout = after[after.length - 1]
  const unlocked = []

  if (before.length === 0 && after.length === 1) {
    unlocked.push({ id: ACHIEVEMENT_IDS.FIRST_WORKOUT, title: 'First workout logged' })
  }

  if (bestStreak(after) >= 21) {
    unlocked.push({ id: ACHIEVEMENT_IDS.THREE_WEEK_STREAK, title: '3-week streak' })
  }

  const gap = gapSinceLastWorkout(before, newWorkout)
  if (gap >= 14) {
    unlocked.push({ id: ACHIEVEMENT_IDS.BACK_AFTER_BREAK, title: 'Back after a break' })
  }

  if (countSessionsWithExercise(after, 'squat') >= 10) {
    unlocked.push({ id: ACHIEVEMENT_IDS.TEN_SQUAT_SESSIONS, title: '10 sessions of squats' })
  }

  if ((pbEvents || []).some(e => e.type === 'volume_pr')) {
    unlocked.push({ id: ACHIEVEMENT_IDS.VOLUME_PR, title: 'Volume PR' })
  }

  // Deduplicate
  const seen = new Set()
  return unlocked.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true })
}
