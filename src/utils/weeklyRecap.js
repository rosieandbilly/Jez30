import { addDays, getDayOfWeekName } from './dateKey'

function normalizeName(name = '') {
  return String(name).trim().toLowerCase()
}

function titleCase(s) {
  return String(s).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function bestWeightByExercise(workouts) {
  const best = new Map()
  for (const w of workouts) {
    for (const ex of w.exercises || []) {
      const k = normalizeName(ex.name)
      if (!k) continue
      let exBest = 0
      for (const set of ex.sets || []) exBest = Math.max(exBest, Number(set.weight) || 0)
      best.set(k, Math.max(best.get(k) || 0, exBest))
    }
  }
  return best
}

export function computeWeeklyRecap({ workouts, bodyweights, endDateKey }) {
  const startKey     = addDays(endDateKey, -6)
  const priorEndKey  = addDays(startKey, -1)
  const priorStartKey = addDays(startKey, -7)

  const weekWorkouts  = (workouts || []).filter(w => w.localDateKey >= startKey && w.localDateKey <= endDateKey)
  const priorWorkouts = (workouts || []).filter(w => w.localDateKey >= priorStartKey && w.localDateKey <= priorEndKey)

  const uniqueDays  = new Set(weekWorkouts.map(w => w.localDateKey))
  const daysTrained = uniqueDays.size

  // Top move: most-logged exercise this week
  const freq = new Map()
  for (const w of weekWorkouts) {
    for (const ex of w.exercises || []) {
      const k = normalizeName(ex.name)
      if (!k) continue
      freq.set(k, { name: ex.name, count: (freq.get(k)?.count || 0) + 1 })
    }
  }
  const topMove = [...freq.values()].sort((a, b) => b.count - a.count)[0]?.name || '—'

  // Biggest weight jump vs prior week
  const bestThis  = bestWeightByExercise(weekWorkouts)
  const bestPrior = bestWeightByExercise(priorWorkouts)
  let biggestJump = { name: '—', diff: 0 }
  for (const [k, v] of bestThis.entries()) {
    const diff = v - (bestPrior.get(k) || 0)
    if (diff > biggestJump.diff) {
      biggestJump = { name: freq.get(k)?.name || titleCase(k), diff }
    }
  }

  // Most consistent day of week
  const dowCounts = new Map()
  for (const w of weekWorkouts) {
    if (!w.localDateKey) continue
    const dow = getDayOfWeekName(w.localDateKey)
    dowCounts.set(dow, (dowCounts.get(dow) || 0) + 1)
  }
  const mostConsistentDay = [...dowCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  // Ghosted exercise: trained in prior week but not this week
  const priorExercises = new Set()
  for (const w of priorWorkouts) for (const ex of w.exercises || []) priorExercises.add(normalizeName(ex.name))
  const thisExercises = new Set(freq.keys())
  const ghostedKey = [...priorExercises].find(k => k && !thisExercises.has(k))
  const ghostedExercise = ghostedKey ? titleCase(ghostedKey) : '—'

  // Bodyweight trend — bodyweights use 'dateKey' field
  const bwAvg = (start, end) => {
    const vals = (bodyweights || [])
      .filter(b => b.dateKey >= start && b.dateKey <= end)
      .map(b => Number(b.weight))
      .filter(n => Number.isFinite(n))
    return vals.length ? vals.reduce((a, c) => a + c, 0) / vals.length : null
  }
  const avgThis  = bwAvg(startKey, endDateKey)
  const avgPrior = bwAvg(priorStartKey, priorEndKey)
  const bwTrend  = (avgThis != null && avgPrior != null) ? {
    delta: avgThis - avgPrior,
    arrow: avgThis > avgPrior ? '↗' : avgThis < avgPrior ? '↘' : '→',
    avgThis, avgPrior,
  } : null

  return {
    startKey,
    endKey: endDateKey,
    daysTrained,
    topMove,
    biggestJump: biggestJump.diff > 0 ? `+${biggestJump.diff.toFixed(1)}kg on ${biggestJump.name}` : '—',
    insights: { mostConsistentDay, ghostedExercise, bodyweightTrend: bwTrend },
    footer: 'Jez is amazing.',
  }
}
