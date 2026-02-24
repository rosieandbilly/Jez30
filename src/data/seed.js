/**
 * Workout templates with default weights/reps and whether to include back-off sets.
 */
export const TEMPLATES = {
  'Upper A': [
    { name: 'Barbell Bench Press', defaultWeight: 60, defaultReps: 5, backoff: true },
    { name: 'Barbell Row',         defaultWeight: 60, defaultReps: 5, backoff: true },
    { name: 'Overhead Press',      defaultWeight: 40, defaultReps: 5, backoff: true },
    { name: 'Lat Pulldown',        defaultWeight: 50, defaultReps: 8, backoff: true },
    { name: 'Barbell Curl',        defaultWeight: 25, defaultReps: 10, backoff: false },
  ],
  'Lower A': [
    { name: 'Squat',               defaultWeight: 80, defaultReps: 5, backoff: true },
    { name: 'Romanian Deadlift',   defaultWeight: 70, defaultReps: 6, backoff: true },
    { name: 'Leg Press',           defaultWeight: 120, defaultReps: 10, backoff: true },
    { name: 'Leg Curl',            defaultWeight: 40, defaultReps: 10, backoff: false },
    { name: 'Calf Raise',          defaultWeight: 60, defaultReps: 15, backoff: false },
  ],
  'Push': [
    { name: 'Overhead Press',      defaultWeight: 40, defaultReps: 5, backoff: true },
    { name: 'Incline Bench Press', defaultWeight: 55, defaultReps: 6, backoff: true },
    { name: 'Lateral Raise',       defaultWeight: 10, defaultReps: 12, backoff: false },
    { name: 'Tricep Pushdown',     defaultWeight: 30, defaultReps: 12, backoff: false },
    { name: 'Cable Fly',           defaultWeight: 12.5, defaultReps: 12, backoff: false },
  ],
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function r(w) {
  return Math.round(w / 2.5) * 2.5
}

function makeExercise(name, topW, topR, backoffW = null, backoffR = 8) {
  const sets = []
  if (topW > 20) {
    sets.push({ weight: Math.max(20, r(topW * 0.4)), reps: 10, type: 'warmup' })
    sets.push({ weight: r(topW * 0.65), reps: 5, type: 'warmup' })
    sets.push({ weight: r(topW * 0.82), reps: 3, type: 'warmup' })
  }
  sets.push({ weight: topW, reps: topR, type: 'top' })
  if (backoffW) {
    sets.push({ weight: backoffW, reps: backoffR, type: 'working' })
    sets.push({ weight: backoffW, reps: backoffR, type: 'working' })
    sets.push({ weight: backoffW, reps: backoffR, type: 'working' })
  }
  return { name, sets }
}

function makeWorkout(id, date, template, exercises) {
  return { id, date, template, exercises }
}

// ─── Seed Data ───────────────────────────────────────────────────────────────
//
// Schedule (today = 2026-02-24):
//   2026-02-03  Upper A   (≈3 weeks ago)
//   2026-02-05  Lower A
//   2026-02-07  Push
//   2026-02-10  Upper A
//   2026-02-12  Lower A
//   2026-02-14  Push
//   2026-02-17  Upper A
//   2026-02-19  Lower A
//   2026-02-21  Push
//
// Weights increase by 2.5 kg per Upper A cycle, ~2–3 kg elsewhere.

export const SEED_DATA = {
  workouts: [
    // ── 2026-02-03  Upper A ──────────────────────────────────
    makeWorkout('w1', '2026-02-03T09:30:00', 'Upper A', [
      makeExercise('Barbell Bench Press', 80,   3, 65,  8),
      makeExercise('Barbell Row',         70,   5, 57.5,8),
      makeExercise('Overhead Press',      52.5, 3, 42.5,8),
      makeExercise('Lat Pulldown',        65,   8, 52.5,10),
      makeExercise('Barbell Curl',        32.5,10),
    ]),

    // ── 2026-02-05  Lower A ──────────────────────────────────
    makeWorkout('w2', '2026-02-05T10:00:00', 'Lower A', [
      makeExercise('Squat',             100,  3, 80,  8),
      makeExercise('Romanian Deadlift',  80,  6, 65,  8),
      makeExercise('Leg Press',         140, 10,120, 12),
      makeExercise('Leg Curl',           45, 10),
      makeExercise('Calf Raise',         80, 15),
    ]),

    // ── 2026-02-07  Push ─────────────────────────────────────
    makeWorkout('w3', '2026-02-07T09:00:00', 'Push', [
      makeExercise('Overhead Press',      55, 3, 45,  8),
      makeExercise('Incline Bench Press', 65, 6, 52.5,8),
      makeExercise('Lateral Raise',       12,12),
      makeExercise('Tricep Pushdown',     35,12),
      makeExercise('Cable Fly',           15,12),
    ]),

    // ── 2026-02-10  Upper A ──────────────────────────────────
    makeWorkout('w4', '2026-02-10T09:30:00', 'Upper A', [
      makeExercise('Barbell Bench Press', 82.5, 3, 67.5,8),
      makeExercise('Barbell Row',         72.5, 5, 60,  8),
      makeExercise('Overhead Press',      55,   3, 45,  8),
      makeExercise('Lat Pulldown',        67.5, 8, 55,  10),
      makeExercise('Barbell Curl',        35,  10),
    ]),

    // ── 2026-02-12  Lower A ──────────────────────────────────
    makeWorkout('w5', '2026-02-12T10:00:00', 'Lower A', [
      makeExercise('Squat',             102.5, 3, 82.5,8),
      makeExercise('Romanian Deadlift',  82.5, 6, 67.5,8),
      makeExercise('Leg Press',         142.5,10,122.5,12),
      makeExercise('Leg Curl',           47.5,10),
      makeExercise('Calf Raise',         82.5,15),
    ]),

    // ── 2026-02-14  Push ─────────────────────────────────────
    makeWorkout('w6', '2026-02-14T09:00:00', 'Push', [
      makeExercise('Overhead Press',      57.5,3, 47.5,8),
      makeExercise('Incline Bench Press', 67.5,6, 55,  8),
      makeExercise('Lateral Raise',       14, 12),
      makeExercise('Tricep Pushdown',     37.5,12),
      makeExercise('Cable Fly',           17.5,12),
    ]),

    // ── 2026-02-17  Upper A ──────────────────────────────────
    makeWorkout('w7', '2026-02-17T09:30:00', 'Upper A', [
      makeExercise('Barbell Bench Press', 85,   3, 70,  8),
      makeExercise('Barbell Row',         75,   5, 62.5,8),
      makeExercise('Overhead Press',      57.5, 3, 47.5,8),
      makeExercise('Lat Pulldown',        70,   8, 57.5,10),
      makeExercise('Barbell Curl',        37.5,10),
    ]),

    // ── 2026-02-19  Lower A ──────────────────────────────────
    makeWorkout('w8', '2026-02-19T10:00:00', 'Lower A', [
      makeExercise('Squat',             105,  3, 85,  8),
      makeExercise('Romanian Deadlift',  85,  6, 70,  8),
      makeExercise('Leg Press',         145, 10,125, 12),
      makeExercise('Leg Curl',           50, 10),
      makeExercise('Calf Raise',         85, 15),
    ]),

    // ── 2026-02-21  Push ─────────────────────────────────────
    makeWorkout('w9', '2026-02-21T09:00:00', 'Push', [
      makeExercise('Overhead Press',      60, 3, 50,  8),
      makeExercise('Incline Bench Press', 70, 6, 57.5,8),
      makeExercise('Lateral Raise',       16,12),
      makeExercise('Tricep Pushdown',     40,12),
      makeExercise('Cable Fly',           20,12),
    ]),
  ],

  bodyweights: [
    { id: 'bw1', date: '2026-02-03', weight: 79.2 },
    { id: 'bw2', date: '2026-02-06', weight: 79.0 },
    { id: 'bw3', date: '2026-02-09', weight: 78.8 },
    { id: 'bw4', date: '2026-02-12', weight: 79.4 },
    { id: 'bw5', date: '2026-02-15', weight: 79.1 },
    { id: 'bw6', date: '2026-02-18', weight: 78.9 },
    { id: 'bw7', date: '2026-02-21', weight: 79.3 },
    { id: 'bw8', date: '2026-02-24', weight: 79.0 },
  ],
}
