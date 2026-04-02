import { useEffect, useMemo, useState } from 'react'
import { BILLY_QUOTES, computeBillyLevel, pick } from '../utils/mascotBilly'

// Unicorn horse head SVG — white with electric blue details
function HorseHead({ mood }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={`billySvg billy-mood-${mood}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hornGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ff6bff" />
          <stop offset="50%"  stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#4A90D9" />
        </linearGradient>
      </defs>
      {/* Unicorn horn */}
      <polygon
        points="41,4 34,22 48,22"
        fill="url(#hornGrad)"
        stroke="#e8c0ff"
        strokeWidth="0.5"
      />
      {/* Head */}
      <ellipse cx="40" cy="44" rx="22" ry="24" fill="white" stroke="#4A90D9" strokeWidth="1.2" />
      {/* Ear */}
      <path d="M30 22 Q27 13 34 15 Q37 16 35 23" fill="white" stroke="#4A90D9" strokeWidth="1" />
      {/* Mane wisps */}
      <path d="M20 28 Q13 23 17 37" fill="none" stroke="#7B4FBF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 37 Q11 32 15 46" fill="none" stroke="#4A90D9" strokeWidth="2" strokeLinecap="round" />
      {/* Eye */}
      <ellipse cx="48" cy="39" rx="3.5" ry="4" fill="#0D1529" />
      <circle cx="49.5" cy="37.5" r="1.2" fill="white" opacity="0.9" />
      {/* Nostril */}
      <ellipse cx="51" cy="57" rx="2.5" ry="1.8" fill="#e8e8ff" opacity="0.7" />
      {/* Mouth */}
      {mood === 'sad' ? (
        <path d="M38 66 Q44 63 50 66" fill="none" stroke="#4A90D9" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <path d="M38 66 Q44 69 50 66" fill="none" stroke="#4A90D9" strokeWidth="1.5" strokeLinecap="round" />
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
    const t = setTimeout(() => { setMood('calm'); setSpeech('') }, 3200)
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
