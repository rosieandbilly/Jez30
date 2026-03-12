import { useEffect } from 'react'

const DISPLAY_MS = 3000

export default function AchievementToast({ achievement, onDone }) {
  useEffect(() => {
    if (!achievement) return
    const t = setTimeout(onDone, DISPLAY_MS)
    return () => clearTimeout(t)
  }, [achievement, onDone])

  if (!achievement) return null

  return (
    <div className="achToast" role="status" aria-live="polite">
      <div className="achToastTop">Achievement unlocked</div>
      <div className="achToastBody">🏆 {achievement.title}</div>
    </div>
  )
}
