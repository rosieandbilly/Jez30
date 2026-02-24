import { useState } from 'react'

export default function BodyweightView({ bodyweights, onAdd }) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState('')
  const [error, setError] = useState('')

  const sorted = [...bodyweights].sort((a, b) => b.date.localeCompare(a.date))

  function handleAdd() {
    const val = parseFloat(weight)
    if (!weight || isNaN(val) || val <= 0 || val > 400) {
      setError('Enter a valid weight in kg')
      return
    }
    setError('')
    onAdd({
      id: `bw${Date.now()}`,
      date,
      weight: Math.round(val * 10) / 10,
    })
    setWeight('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div>
      <div className="screen-header">
        <h1 className="screen-title">Bodyweight</h1>
      </div>

      {/* Log entry */}
      <div className="card">
        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            type="date"
            className="input"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Weight (kg)</label>
          <input
            type="number"
            className="input"
            placeholder="e.g. 79.5"
            value={weight}
            onChange={e => { setWeight(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            step="0.1"
            min="20"
            max="400"
            inputMode="decimal"
          />
          {error && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>{error}</div>
          )}
        </div>
        <button className="btn btn-primary" onClick={handleAdd}>
          Log Weight
        </button>
      </div>

      {/* History */}
      <div className="section-label">History</div>

      {sorted.length === 0 ? (
        <div className="card">
          <span className="c-dim fs-13">No entries yet.</span>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {sorted.map((entry, i) => {
            const next = sorted[i + 1]
            const delta = next ? (entry.weight - next.weight) : null
            const deltaStr = delta !== null
              ? (delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1))
              : null

            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 16px',
                  borderBottom: i < sorted.length - 1 ? '1px solid var(--border-soft)' : 'none',
                }}
              >
                <span className="fs-13 c-dim">{entry.date}</span>
                <div className="row gap-8">
                  <span className="fw-700">{entry.weight} kg</span>
                  {deltaStr && (
                    <span className={`delta ${delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : 'delta-neu'}`}>
                      {deltaStr}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}
