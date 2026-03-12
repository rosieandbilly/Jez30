import { useEffect, useMemo, useState } from 'react'
import { BILLY_QUOTES, computeBillyLevel, pick } from '../utils/mascotBilly'

// Simple white horse head SVG — clean minimal icon
function HorseHead({ mood }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={`billySvg billy-mood-${mood}`}
      aria-hidden="true"
    >
      {/* Head shape */}
      <ellipse cx="40" cy="38" rx="22" ry="26" fill="white" stroke="#e0e0e0" strokeWidth="1.5" />
      {/* Mane */}
      <path d="M22 18 Q18 10 26 8 Q30 6 32 14" fill="#ddd" />
      <path d="M26 14 Q20 8 28 6 Q34 5 34 12" fill="#ccc" />
      {/* Ear left */}
      <path d="M30 14 Q28 6 35 8 Q38 9 36 16" fill="white" stroke="#ddd" strokeWidth="1" />
      {/* Eye */}
      <ellipse cx="47" cy="34" rx="3.5" ry="4" fill="#222" />
      <circle cx="48.5" cy="32.5" r="1" fill="white" opacity="0.7" />
      {/* Nostril */}
      <ellipse cx="50" cy="52" rx="2.5" ry="1.8" fill="#ddd" />
      {/* Mouth */}
      {mood === 'sad' ? (
        <path d="M38 60 Q44 58 50 60" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <path d="M38 60 Q44 62 50 60" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  )
}

export default function MascotBilly({ workoutsLast7, prsLast7, streak, event }) {
  const levelInfo = useMemo(
    () => computeBillyLevel({ workoutsLast7, prsLast7, streak }),
    [workoutsLast7, prsLast7, streak]
  )
  const [mood, setMood]     = useState('calm')
  const [speech, setSpeech] = useState('')

  useEffect(() => {
    if (!event?.type) return
    if (event.type === 'pr') {
      setMood('berserk')
      setSpeech(event.message || pick(BILLY_QUOTES.PR))
    } else if (event.type === 'missed') {
      setMood('sad')
      setSpeech(event.message || pick(BILLY_QUOTES.SAD))
    } else if (event.type === 'deload') {
      setMood('calm')
      setSpeech(event.message || pick(BILLY_QUOTES.DELOAD))
    }
    const t = setTimeout(() => { setMood('calm'); setSpeech('') }, 2800)
    return () => clearTimeout(t)
  }, [event])

  return (
    <div className="billyWrap" aria-label="Billy the mascot">
      {speech && (
        <div className="billyBubble">
          {speech}
        </div>
      )}
      <div className={`billyBody billy-mood-${mood}`}>
        <HorseHead mood={mood} />
        <div className="billyLevel">Lvl {levelInfo.level}</div>
      </div>
    </div>
  )
}
