// Local-timezone date helpers — no UTC shifting

export function getLocalDateKey(d = new Date()) {
  const year  = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day   = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDateKey(dateKey) {
  // Use local midday to avoid DST crossover issues
  return new Date(`${dateKey}T12:00:00`)
}

export function getDayOfWeekName(dateKey) {
  return parseLocalDateKey(dateKey).toLocaleDateString(undefined, { weekday: 'long' })
}

export function addDays(dateKey, deltaDays) {
  const d = parseLocalDateKey(dateKey)
  d.setDate(d.getDate() + deltaDays)
  return getLocalDateKey(d)
}

export function isSundayLocal(dateKey) {
  return parseLocalDateKey(dateKey).getDay() === 0
}

export function daysBetween(keyA, keyB) {
  const a = parseLocalDateKey(keyA)
  const b = parseLocalDateKey(keyB)
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}
