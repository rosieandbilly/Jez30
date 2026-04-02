import { useEffect, useMemo, useRef } from 'react'

const QUOTES = [
  'Fuck yes Jez, you monster.',
  'Think of the gainzzzz',
  "You're sex on legs",
  'God Rosie is lucky',
  "Let's take this energy back to the bedroom ;)",
]

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function safeVibrate(pattern) {
  try { navigator?.vibrate?.(pattern) } catch {}
}

function burstConfetti(canvas) {
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
  const ctx = canvas.getContext('2d')
  const w = canvas.width, h = canvas.height

  const pieces = Array.from({ length: 60 }, () => ({
    x:   Math.random() * w,
    y:   -20 - Math.random() * h * 0.25,
    vx:  (Math.random() - 0.5) * 7,
    vy:  2.5 + Math.random() * 5,
    r:   2 + Math.random() * 5,
    rot: Math.random() * Math.PI,
    vr:  (Math.random() - 0.5) * 0.25,
    hue: Math.random() * 360,
  }))

  let rafId = 0
  const start = performance.now()
  let lastT = start

  function tick(t) {
    const dt = Math.min(32, t - lastT)
    lastT = t
    ctx.clearRect(0, 0, w, h)
    for (const p of pieces) {
      p.x  += p.vx  * (dt / 16)
      p.y  += p.vy  * (dt / 16)
      p.rot += p.vr * (dt / 16)
      p.vy += 0.025 * (dt / 16)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = `hsl(${p.hue} 88% 62%)`
      ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2)
      ctx.restore()
    }
    if (t - start < 1400) rafId = requestAnimationFrame(tick)
    else ctx.clearRect(0, 0, w, h)
  }
  rafId = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(rafId)
}

function getHeadline(events) {
  if (!events.length) return '🏆 PB!'
  if (events.some(e => e.type === 'streak_pr'))  return '🔥 STREAK PB!'
  if (events.some(e => e.type === 'weight_pr'))  return '💪 WEIGHT PB!'
  if (events.some(e => e.type === 'rep_pr'))     return '🎯 REP PB!'
  if (events.some(e => e.type === 'volume_pr'))  return '📦 VOLUME PB!'
  return '🏆 PB!'
}

function eventLabel(e) {
  switch (e.type) {
    case 'weight_pr': return `Weight PR — ${e.exerciseName}`
    case 'rep_pr':    return `Rep PR — ${e.exerciseName}`
    case 'volume_pr': return `Volume PR — ${e.exerciseName}`
    case 'streak_pr': return 'Streak PR'
    default:          return 'PB'
  }
}

function eventValue(e) {
  if (e.type === 'streak_pr') return `${e.value} days`
  if (e.type === 'volume_pr') return `${e.value} kg·reps`
  return `${e.value}`
}

export default function CelebrationModal({ isOpen, events = [], onClose }) {
  const canvasRef = useRef(null)
  const quote     = useMemo(() => pickRandom(QUOTES), [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps
  const headline  = useMemo(() => getHeadline(events), [events])

  useEffect(() => {
    if (!isOpen) return
    safeVibrate([60, 30, 120, 30, 80])
    let cleanup = null
    if (canvasRef.current) cleanup = burstConfetti(canvasRef.current)
    return () => cleanup?.()
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="celebOverlay" role="dialog" aria-modal="true">
      <canvas ref={canvasRef} className="celebConfettiCanvas" aria-hidden="true" />

      <div className="celebCard">
        <div className="celebTitleRow">
          <span className="celebTitle">{headline}</span>
          <button className="celebCloseBtn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Billy quote */}
        <div className="celebSpeech">
          <div className="celebSpeechWho">🐴 Billy says</div>
          <div className="celebSpeechQuote">"{quote}"</div>
        </div>

        {/* PR list */}
        {events.length > 0 && (
          <div className="celebPbList">
            {events.slice(0, 4).map((e, i) => (
              <div key={i} className="celebPbItem">
                <span className="celebPbLabel">{eventLabel(e)}</span>
                <span className="celebPbValue">{eventValue(e)}</span>
              </div>
            ))}
          </div>
        )}

        <button className="celebActionBtn" onClick={onClose}>
          Ride the hype 🐎
        </button>
      </div>
    </div>
  )
}
