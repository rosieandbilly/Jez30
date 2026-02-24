import { formatDate, formatDateShort, tagClass, getTopSet, findPrevWorkout, find3WeeksAgo } from '../utils'

export default function WorkoutDetail({ workout, workouts, onBack }) {
  const prev = findPrevWorkout(workouts, workout.template, workout.date)
  const threeWk = find3WeeksAgo(workouts, workout.template, workout.date, prev?.id)

  return (
    <div>
      <div className="screen-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span className={`tag ${tagClass(workout.template)}`}>{workout.template}</span>
        <span className="flex-1" />
        <span className="fs-13 c-dim">{formatDate(workout.date)}</span>
      </div>

      {/* Comparison legend */}
      {(prev || threeWk) && (
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {prev && (
            <span className="fs-12 c-dim">
              Prev: <span style={{ color: 'var(--text)' }}>{formatDateShort(prev.date)}</span>
            </span>
          )}
          {threeWk && (
            <span className="fs-12 c-dim">
              3wk: <span style={{ color: 'var(--text)' }}>{formatDateShort(threeWk.date)}</span>
            </span>
          )}
        </div>
      )}

      {workout.exercises.map((ex, i) => {
        const prevEx   = prev?.exercises.find(e => e.name === ex.name)
        const threeEx  = threeWk?.exercises.find(e => e.name === ex.name)
        const prevTop  = prevEx  ? getTopSet(prevEx)  : null
        const threeTop = threeEx ? getTopSet(threeEx) : null
        const thisTop  = getTopSet(ex)
        const isNewPR  = !prevTop || thisTop.weight > prevTop.weight

        return (
          <div className="card" key={i}>
            <div className="row-sb" style={{ marginBottom: 8 }}>
              <span className="exercise-name" style={{ marginBottom: 0 }}>{ex.name}</span>
              {isNewPR && prevTop && (
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

            {/* Previous performance comparison */}
            {(prevTop || threeTop) && (
              <div className="comparison">
                {prevTop && (
                  <span>
                    Prev:&nbsp;
                    <span className="cmp-val">{prevTop.weight}kg&thinsp;&times;&thinsp;{prevTop.reps}</span>
                    {thisTop.weight > prevTop.weight && (
                      <span style={{ marginLeft: 4, color: 'var(--success)', fontSize: 11, fontWeight: 700 }}>
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
                      <span style={{ marginLeft: 4, color: 'var(--success)', fontSize: 11, fontWeight: 700 }}>
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
