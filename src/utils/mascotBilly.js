export const BILLY_QUOTES = {
  PR:     ['NEIGHHH!!', 'ABSOLUTE UNIT.', 'MORE POWER.', 'BILLY APPROVES.'],
  SAD:    ['Where did you go then?', 'Billy misses you.', 'No gym? Betrayal.'],
  DELOAD: ['Respect the process.', 'Deload today, dominate tomorrow.'],
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function computeBillyLevel({ workoutsLast7 = 0, streak = 0, prsLast7 = 0 }) {
  // Simple XP model: +10 per workout, +20 per PR, +5 per streak day
  const xp      = workoutsLast7 * 10 + prsLast7 * 20 + streak * 5
  const level   = Math.max(1, Math.floor(xp / 50) + 1)
  const progress = xp % 50
  return { level, xp, progress, nextAt: 50 }
}
