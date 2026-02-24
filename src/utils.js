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
