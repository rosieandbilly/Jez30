import { useEffect, useMemo, useState } from 'react'
import { BILLY_QUOTES, computeBillyLevel, pick } from '../utils/mascotBilly'

// Unicorn horse head SVG — white horse with rainbow horn
function HorseHead({ mood }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={`billySvg billy-mood-${mood}`}
      aria-hidden="true"
    >
      {/* Unicorn horn — pointing up-right from forehead */}
      <polygon
        points="41,6 35,22 47,22"
        fill="url(#hornGrad)"
        stroke="#e8c0ff"
        strokeWidth="0.5"
      />
      <defs>
        <linearGradient id="hornGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ff6bff" />
          <stop offset="50%"  stopColor="#ffaa33" />
          <stop offset="100%" stopColor="#33ddff" />
        </linearGradient>
      </defs>
      {/* Head shape */}
      <ellipse cx="40" cy="42" rx="22" ry="24" fill="white" stroke="#e8e8e8" strokeWidth="1" />
      {/* Ear */}
      <path d="M30 22 Q27 14 34 16 Q37 17 35 23" fill="white" stroke="#e0e0e0" strokeWidth="1" />
      {/* Mane wisps */}
      <path d="M20 28 Q14 24 18 36" fill="none" stroke="#ffaaee" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M19 35 Q12 32 16 44" fill="none" stroke="#aaccff" strokeWidth="2" strokeLinecap="round" />
      {/* Eye */}
      <ellipse cx="47" cy="38" rx="3.5" ry="4" fill="#1a1a2e" />
      <circle cx="48.5" cy="36.5" r="1.2" fill="white" opacity="0.8" />
      {/* Nostril */}
      <ellipse cx="50" cy="55" rx="2.5" ry="1.8" fill="#eee" />
      {/* Mouth */}
      {mood === 'sad' ? (
        <path d="M38 63 Q44 61 50 63" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <path d="M38 63 Q44 65 50 63" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
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
