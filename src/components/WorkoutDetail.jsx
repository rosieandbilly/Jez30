import { formatDate, formatDateShort, tagClass, getTopSet, findPrevWorkout, find3WeeksAgo, calcTotalVolume, fmtVol } from '../utils'

export default function WorkoutDetail({ workout, workouts, onBack }) {
  const prev   = findPrevWorkout(workouts, workout.template, workout.date)
  const threeWk = find3WeeksAgo(workouts, workout.template, workout.date, prev?.id)

  // Compute summary metrics
  const totalVol = calcTotalVolume(workout)
  const topWeight = workout.exercises.reduce((max, ex) => {
    const t = getTopSet(ex)
    return t.weight > max ? t.weight : max
  }, 0)

  return (
    <div>
      {/* Header */}
      <div className="screen-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span className="flex-1" />
        <span className={`tag ${tagClass(workout.template)}`}>{workout.template}</span>
        <span className="fs-13 c-dim" style={{ marginLeft: 8 }}>{formatDate(workout.date)}</span>
      </div>

      {/* Metric tiles */}
      <div className="metric-row">
        <div className="metric-tile">
          <div className="metric-value">{workout.exercises.length}</div>
          <div className="metric-label">Exercises</div>
        </div>
        <div className="metric-tile">
          <div className="metric-value">{fmtVol(totalVol)}</div>
          <div className="metric-label">kg Volume</div>
        </div>
        <div className="metric-tile">
          <div className="metric-value">{topWeight}</div>
          <div className="metric-label">kg Top Set</div>
        </div>
      </div>

      {/* Comparison legend */}
      {(prev || threeWk) && (
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {prev && (
            <span className="fs-12 c-dim">
              Prev:&nbsp;<span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatDateShort(prev.date)}</span>
            </span>
          )}
          {threeWk && (
            <span className="fs-12 c-dim">
              3 wk:&nbsp;<span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatDateShort(threeWk.date)}</span>
            </span>
          )}
        </div>
      )}

      {/* Exercise cards */}
      {workout.exercises.map((ex, i) => {
        const prevEx   = prev?.exercises.find(e => e.name === ex.name)
        const threeEx  = threeWk?.exercises.find(e => e.name === ex.name)
        const prevTop  = prevEx  ? getTopSet(prevEx)  : null
        const threeTop = threeEx ? getTopSet(threeEx) : null
        const thisTop  = getTopSet(ex)
        const isNewPR  = prevTop && thisTop.weight > prevTop.weight

        return (
          <div className="card" key={i}>
            <div className="row-sb" style={{ marginBottom: 8 }}>
              <span className="exercise-name" style={{ marginBottom: 0 }}>{ex.name}</span>
              {isNewPR && (
                <span className="pr-badge">PR</span>
              )}
            </div>

            {/* Sets */}
            <div className="sets-row">
              {ex.sets.map((set, j) => (
                <span
                  key={j}
                  className={`set-chip${set.type === 'top' ? ' top' : set.type === 'warmup' ? ' warmup' : ''}`}
                >
                  {set.weight}kg&thinsp;&times;&thinsp;{set.reps}
                </span>
              ))}
            </div>

            {/* Comparison */}
            {(prevTop || threeTop) && (
              <div className="comparison">
                {prevTop && (
                  <span>
                    Prev:&nbsp;
                    <span className="cmp-val">{prevTop.weight}kg&thinsp;&times;&thinsp;{prevTop.reps}</span>
                    {thisTop.weight > prevTop.weight && (
                      <span style={{ marginLeft: 4, color: 'var(--success-text)', fontSize: 11, fontWeight: 700 }}>
                        +{(thisTop.weight - prevTop.weight).toFixed(1)}kg
                      </span>
                    )}
                  </span>
                )}
                {threeTop && (
                  <span>
                    3wk:&nbsp;
                    <span className="cmp-val">{threeTop.weight}kg&thinsp;&times;&thinsp;{threeTop.reps}</span>
                    {thisTop.weight > threeTop.weight && (
                      <span style={{ marginLeft: 4, color: 'var(--success-text)', fontSize: 11, fontWeight: 700 }}>
                        +{(thisTop.weight - threeTop.weight).toFixed(1)}kg
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}

      <div style={{ height: 16 }} />
    </div>
  )
}
