/**
 * Format a date string or ISO datetime to a human-readable relative string.
 * Handles both "YYYY-MM-DD" and full ISO strings.
 */
export function formatDate(dateStr) {
  // Add noon time for date-only strings to avoid UTC shift issues
  const iso = dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr
  const date = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round((today - d) / 86400000)

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 8) return `${diff}d ago`
  if (diff < 29) return `${Math.round(diff / 7)}wk ago`

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * Format date as short string for display (e.g. "3 Feb")
 */
export function formatDateShort(dateStr) {
  const iso = dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr
  const date = new Date(iso)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * Return the CSS tag class for a template name.
 */
export function tagClass(template) {
  if (template.startsWith('Upper')) return 'tag-upper'
  if (template.startsWith('Lower')) return 'tag-lower'
  return 'tag-push'
}

/**
 * Return the top set for an exercise (type === 'top', or heaviest set as fallback).
 */
export function getTopSet(exercise) {
  const top = exercise.sets.find(s => s.type === 'top')
  if (top) return top
  return exercise.sets.reduce((max, s) => (s.weight > max.weight ? s : max), exercise.sets[0])
}

/**
 * Round a weight to the nearest 2.5 kg increment.
 */
export function round2_5(w) {
  return Math.round(w / 2.5) * 2.5
}

/**
 * Generate warmup sets for a given top set weight.
 * Returns 3 warmup sets at ~40%, ~65%, ~82% of top weight.
 * Skips if top weight is very light (≤ 20 kg).
 */
export function generateWarmups(topWeight) {
  if (topWeight <= 20) return []
  return [
    { weight: Math.max(20, round2_5(topWeight * 0.4)), reps: 10, type: 'warmup' },
    { weight: round2_5(topWeight * 0.65), reps: 5, type: 'warmup' },
    { weight: round2_5(topWeight * 0.82), reps: 3, type: 'warmup' },
  ]
}

/**
 * Find the most recent workout with the same template, before the given date.
 * Excludes the workout with excludeId.
 */
export function findPrevWorkout(workouts, template, beforeDate, excludeId = null) {
  return workouts
    .filter(w => w.template === template && w.date < beforeDate && w.id !== excludeId)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null
}

/**
 * Find the workout closest to ~3 weeks (21 days) before the given date,
 * with the same template. Excludes the workout with excludeId.
 */
export function find3WeeksAgo(workouts, template, fromDate, excludeId = null) {
  const target = new Date(fromDate)
  target.setDate(target.getDate() - 21)
  const targetMs = target.getTime()

  const candidates = workouts.filter(
    w => w.template === template && w.date < fromDate && w.id !== excludeId
  )
  if (candidates.length === 0) return null

  return candidates.sort((a, b) => {
    const da = Math.abs(new Date(a.date).getTime() - targetMs)
    const db = Math.abs(new Date(b.date).getTime() - targetMs)
    return da - db
  })[0]
}

/**
 * Normalize a date string to YYYY-MM-DD (local date key).
 */
export function getDateKey(dateStr) {
  return dateStr.length === 10 ? dateStr : dateStr.split('T')[0]
}

/**
 * Group workouts by YYYY-MM-DD date key.
 * Returns { 'YYYY-MM-DD': [workout, ...], ... }
 */
export function groupByDate(workouts) {
  const map = {}
  workouts.forEach(w => {
    const key = getDateKey(w.date)
    if (!map[key]) map[key] = []
    map[key].push(w)
  })
  return map
}

/**
 * Generate a calendar grid for a given year/month.
 * Week starts on Monday.
 * Returns array of { date, key, day, isCurrentMonth, isToday }
 */
export function getCalendarGrid(year, month) {
  const todayKey = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)

  // Start from Monday on or before first day of month
  const start = new Date(firstOfMonth)
  const startDow = start.getDay() // 0=Sun
  start.setDate(start.getDate() - (startDow === 0 ? 6 : startDow - 1))

  const cells = []
  const cur = new Date(start)

  while (cur <= lastOfMonth || cells.length % 7 !== 0) {
    const key = cur.toISOString().split('T')[0]
    cells.push({
      date: new Date(cur),
      key,
      day: cur.getDate(),
      isCurrentMonth: cur.getMonth() === month,
      isToday: key === todayKey,
    })
    cur.setDate(cur.getDate() + 1)
    if (cells.length >= 42) break // max 6 rows
  }

  return cells
}

/**
 * Calculate total working volume for a workout (excludes warmup sets).
 */
export function calcTotalVolume(workout) {
  return workout.exercises.reduce((vol, ex) =>
    vol + ex.sets
      .filter(s => s.type !== 'warmup')
      .reduce((s, set) => s + set.weight * set.reps, 0),
    0
  )
}

/**
 * Format a volume number compactly (e.g. 2150 → "2.2k").
 */
export function fmtVol(v) {
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  return Math.round(v).toString()
}

/**
 * Build activity chart data for the last N days.
 * Returns array of { key, label, count }.
 * - ≤14 days: one bar per day
 * - ≤90 days: one bar per week (Mon–Sun)
 * - >90 days: one bar per month
 */
export function buildActivityChart(workouts, days) {
  const now = new Date()
  const cutoffDate = new Date(now)
  cutoffDate.setDate(cutoffDate.getDate() - days)

  if (days <= 14) {
    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const count = workouts.filter(w => getDateKey(w.date) === key).length
      result.push({
        key,
        label: d.toLocaleDateString('en-GB', { weekday: 'short' }).charAt(0),
        count,
      })
    }
    return result
  }

  if (days <= 90) {
    // Weekly bars
    const startMon = new Date(cutoffDate)
    const sd = startMon.getDay()
    startMon.setDate(startMon.getDate() - (sd === 0 ? 6 : sd - 1))

    const weeks = []
    const cur = new Date(startMon)
    while (cur <= now) {
      const wsKey = cur.toISOString().split('T')[0]
      const we = new Date(cur)
      we.setDate(we.getDate() + 6)
      const weKey = we.toISOString().split('T')[0]
      const count = workouts.filter(w => {
        const dk = getDateKey(w.date)
        return dk >= wsKey && dk <= weKey
      }).length
      const label = cur.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      weeks.push({ key: wsKey, label, count })
      cur.setDate(cur.getDate() + 7)
    }
    return weeks
  }

  // Monthly bars
  const cur = new Date(cutoffDate.getFullYear(), cutoffDate.getMonth(), 1)
  const months = []
  while (cur <= now) {
    const y = cur.getFullYear()
    const m = cur.getMonth()
    const count = workouts.filter(w => {
      const d = new Date(w.date)
      return d.getFullYear() === y && d.getMonth() === m
    }).length
    const label = cur.toLocaleDateString('en-GB', { month: 'short' })
    months.push({ key: `${y}-${m}`, label, count })
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}
