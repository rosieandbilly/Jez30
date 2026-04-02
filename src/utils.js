/**
 * Format a date string or ISO datetime to a human-readable relative string.
 * Handles both "YYYY-MM-DD" and full ISO strings.
 */
export function formatDate(dateStr) {
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
  if (template === 'Legs')      return 'tag-legs'
  if (template === 'Push')      return 'tag-push'
  if (template === 'Pull')      return 'tag-pull'
  if (template === 'Shoulders') return 'tag-shoulders'
  if (template === 'Abs')       return 'tag-abs'
  return 'tag-default'
}

/**
 * Return the hex colour for a template/muscle group.
 */
export function getTemplateColor(template) {
  if (template === 'Legs')      return '#1c9e43'
  if (template === 'Push')      return '#b86800'
  if (template === 'Pull')      return '#4A90D9'
  if (template === 'Shoulders') return '#7B4FBF'
  if (template === 'Abs')       return '#D63B3B'
  return '#7B8DB0'
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

/** Build a YYYY-MM-DD string from a Date using local timezone. */
function _lk(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Return today's date as YYYY-MM-DD in the local timezone. */
export function todayLocalKey() {
  return _lk(new Date())
}

/**
 * Normalize a date string to YYYY-MM-DD using local timezone.
 * Handles both "YYYY-MM-DD" and full ISO strings.
 */
export function getDateKey(dateStr) {
  if (!dateStr) return ''
  if (dateStr.length === 10) return dateStr
  return _lk(new Date(dateStr))
}

/**
 * Group workouts by YYYY-MM-DD local date key.
 * Prefers localDateKey if set on the workout, otherwise derives from date.
 * Returns { 'YYYY-MM-DD': [workout, ...], ... }
 */
export function groupByDate(workouts) {
  const map = {}
  workouts.forEach(w => {
    const key = w.localDateKey || getDateKey(w.date)
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
  const todayKey = todayLocalKey()
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)

  const start = new Date(firstOfMonth)
  const startDow = start.getDay() // 0=Sun
  start.setDate(start.getDate() - (startDow === 0 ? 6 : startDow - 1))

  const cells = []
  const cur = new Date(start)

  while (cur <= lastOfMonth || cells.length % 7 !== 0) {
    const key = _lk(cur)
    cells.push({
      date: new Date(cur),
      key,
      day: cur.getDate(),
      isCurrentMonth: cur.getMonth() === month,
      isToday: key === todayKey,
    })
    cur.setDate(cur.getDate() + 1)
    if (cells.length >= 42) break
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
 * Estimate 1RM using the Brzycki formula.
 * Clamps reps to a safe range.
 */
export function calc1RM(weight, reps) {
  if (!reps || reps <= 1) return weight
  return Math.round(weight * (36 / (37 - Math.min(reps, 36))))
}

/**
 * Abbreviate an exercise name for compact display.
 * Strips common equipment prefixes and truncates to ~15 chars.
 */
export function abbrevExercise(name) {
  const STRIP = ['Barbell ', 'Dumbbell ', 'Cable ', 'EZ Bar ', 'EZ-Bar ', 'Machine ']
  let s = name
  for (const prefix of STRIP) {
    if (name.startsWith(prefix)) { s = name.slice(prefix.length); break }
  }
  return s.length > 15 ? s.slice(0, 14) + '…' : s
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
      const key = _lk(d)
      const count = workouts.filter(w => (w.localDateKey || getDateKey(w.date)) === key).length
      result.push({
        key,
        label: d.toLocaleDateString('en-GB', { weekday: 'short' }).charAt(0),
        count,
      })
    }
    return result
  }

  if (days <= 90) {
    const startMon = new Date(cutoffDate)
    const sd = startMon.getDay()
    startMon.setDate(startMon.getDate() - (sd === 0 ? 6 : sd - 1))

    const weeks = []
    const cur = new Date(startMon)
    while (cur <= now) {
      const wsKey = _lk(cur)
      const we = new Date(cur)
      we.setDate(we.getDate() + 6)
      const weKey = _lk(we)
      const count = workouts.filter(w => {
        const dk = w.localDateKey || getDateKey(w.date)
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
    const mo = cur.getMonth()
    const prefix = `${y}-${String(mo + 1).padStart(2, '0')}`
    const count = workouts.filter(w => (w.localDateKey || getDateKey(w.date)).startsWith(prefix)).length
    const label = cur.toLocaleDateString('en-GB', { month: 'short' })
    months.push({ key: `${y}-${mo}`, label, count })
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}
