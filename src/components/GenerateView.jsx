import { useState, useCallback } from 'react'
import { TEMPLATES } from '../data/seed'
import { getTopSet, round2_5, generateWarmups, findPrevWorkout } from '../utils'

function buildWorkout(template, workouts) {
  const last = findPrevWorkout(workouts, template, '9999')

  return TEMPLATES[template].map(({ name, defaultWeight, defaultReps, backoff }) => {
    let topWeight = defaultWeight
    let topReps   = defaultReps

    if (last) {
      const lastEx = last.exercises.find(e => e.name === name)
      if (lastEx) {
        const lastTop = getTopSet(lastEx)
        topWeight = lastTop.weight + 2.5
        topReps   = lastTop.reps
      }
    }

    const backoffWeight = round2_5(topWeight * 0.8)
    const warmups = generateWarmups(topWeight)

    const sets = [
      ...warmups,
      { weight: topWeight, reps: topReps, type: 'top' },
      ...(backoff ? [
        { weight: backoffWeight, reps: 8, type: 'working' },
        { weight: backoffWeight, reps: 8, type: 'working' },
        { weight: backoffWeight, reps: 8, type: 'working' },
      ] : []),
    ]

    return { name, sets }
  })
}

export default function GenerateView({ workouts, onSave }) {
  const templateNames = Object.keys(TEMPLATES)
  const [template, setTemplate] = useState(templateNames[0])
  const [exercises, setExercises] = useState(() => buildWorkout(templateNames[0], workouts))

  function switchTemplate(t) {
    setTemplate(t)
    setExercises(buildWorkout(t, workouts))
  }

  const updateSet = useCallback((exIdx, setIdx, field, value) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      return {
        ...ex,
        sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: Number(value) }),
      }
    }))
  }, [])

  function handleSave() {
    const workout = {
      id: `w${Date.now()}`,
      date: new Date().toISOString(),
      template,
      exercises,
    }
    onSave(workout)
  }

  const last = findPrevWorkout(workouts, template, '9999')

  return (
    <div>
      <div className="screen-header">
        <h1 className="screen-title">Generate</h1>
      </div>

      <div className="template-tabs">
        {templateNames.map(t => (
          <button
            key={t}
            className={`template-tab${template === t ? ' active' : ''}`}
            onClick={() => switchTemplate(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {last && (
        <div style={{ padding: '0 16px 12px' }}>
          <div className="info-box">
            Based on last {template} — top sets +2.5 kg. Tap any number to edit.
          </div>
        </div>
      )}

      {exercises.map((ex, exIdx) => {
        const lastEx  = last?.exercises.find(e => e.name === ex.name)
        const lastTop = lastEx ? getTopSet(lastEx) : null
        const thisTop = ex.sets.find(s => s.type === 'top')

        return (
          <div className="card" key={exIdx}>
            <div className="exercise-name">{ex.name}</div>
            {lastTop && (
              <div className="prev-note">
                Last: <span>{lastTop.weight}kg&thinsp;&times;&thinsp;{lastTop.reps}</span>
                {thisTop && (
                  <span style={{ marginLeft: 8, color: 'var(--success-text)', fontWeight: 700 }}>
                    → {thisTop.weight}kg
                  </span>
                )}
              </div>
            )}

            {ex.sets.map((set, setIdx) => (
              <div
                key={setIdx}
                className={`set-edit-row${set.type === 'top' ? ' is-top' : set.type === 'warmup' ? ' is-warmup' : ''}`}
              >
                <span className="set-type-badge">
                  {set.type === 'top' ? 'TOP' : set.type === 'warmup' ? 'WU' : ''}
                </span>

                <input
                  type="number"
                  className="set-num-input"
                  value={set.weight}
                  min="0"
                  step="2.5"
                  onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                />
                <span className="set-unit">kg</span>
                <span className="set-unit" style={{ color: 'var(--border)' }}>×</span>
                <input
                  type="number"
                  className="set-num-input"
                  value={set.reps}
                  min="1"
                  step="1"
                  onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                />
                <span className="set-unit">reps</span>
              </div>
            ))}
          </div>
        )
      })}

      <div style={{ padding: '0 16px 16px' }}>
        <button className="btn btn-primary" onClick={handleSave}>
          Save Workout
        </button>
      </div>
    </div>
  )
}
