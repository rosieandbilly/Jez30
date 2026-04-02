export const BILLY_QUOTES = {
  PR: [
    'Fuck yes Jez, you monster.',
    'Think of the gainzzzz',
    "You're sex on legs",
    'God Rosie is lucky',
    "Let's take this energy back to the bedroom ;)",
    'COYS — absolute beast.',
    'Harry Kane never trained this hard.',
    'Pochettino would be proud.',
    "That's a new PB, Jez. Levy is shook.",
  ],
  SAD: [
    'Where did you go Jez?',
    'Billy misses you.',
    "No gym? That's a yellow card.",
    'Even Spurs show up on Sundays.',
    'Rosie trained more than you this week.',
  ],
  DELOAD: [
    'Respect the process, Jez.',
    'Deload today, dominate tomorrow.',
    'Even Kane had rest days.',
    'Recovery is gains. Trust it.',
  ],
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function computeBillyLevel({ workoutsLast7 = 0, streak = 0, prsLast7 = 0 }) {
  const xp      = workoutsLast7 * 10 + prsLast7 * 20 + streak * 5
  const level   = Math.max(1, Math.floor(xp / 50) + 1)
  const progress = xp % 50
  return { level, xp, progress, nextAt: 50 }
}
