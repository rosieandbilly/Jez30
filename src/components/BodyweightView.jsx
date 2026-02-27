import { useState } from 'react'
import { todayLocalKey } from '../utils'

export default function BodyweightView({ bodyweights, onAdd, onUpdate, onDelete }) {
  const today = todayLocalKey()
  const [date, setDate]     = useState(today)
  const [weight, setWeight] = useState('')
  const [error, setError]   = useState('')
  const [editId, setEditId] = useState(null)

  const sorted = [...bodyweights].sort((a, b) => b.date.localeCompare(a.date))

  // ── Rolling average & trend ──────────────────────────────────────────────

  const todayMs = new Date().getTime()

  function avgOfEntries(entries) {
    if (entries.length === 0) return null
    return entries.reduce((s, e) => s + e.weight, 0) / entries.length
  }

  const last7Entries  = sorted.filter(e => {
    const d = new Date(e.date + 'T12:00:00')
    return (todayMs - d.getTime()) < 7 * 86400000
  })
  const prev7Entries  = sorted.filter(e => {
    const d = new Date(e.date + 'T12:00:00')
    const ms = todayMs - d.getTime()
    return ms >= 7 * 86400000 && ms < 14 * 86400000
  })

  const avg7     = avgOfEntries(last7Entries)
  const prevAvg7 = avgOfEntries(prev7Entries)
  const trend    = avg7 !== null && prevAvg7 !== null ? avg7 - prevAvg7 : null

  // ── Handlers ─────────────────────────────────────────────────────────────

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

  function handleEditSave(entry, newDate, newWeight) {
    const val = parseFloat(newWeight)
    if (!newDate || isNaN(val) || val <= 0 || val > 400) return
    onUpdate({ ...entry, date: newDate, weight: Math.round(val * 10) / 10 })
    setEditId(null)
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
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
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

      {/* Rolling average + trend summary */}
      {avg7 !== null && (
        <div className="bw-summary-row">
          <div>
            <div className="fs-11 c-dim" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              7-day avg
            </div>
            <div className="bw-avg-value">{avg7.toFixed(1)} kg</div>
          </div>
          {trend !== null && (
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div className="fs-11 c-dim" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                vs prev week
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}
                className={trend > 0.05 ? 'bw-trend-up' : trend < -0.05 ? 'bw-trend-down' : 'bw-trend-flat'}>
                {trend > 0.05 ? '↑' : trend < -0.05 ? '↓' : '→'} {Math.abs(trend).toFixed(1)} kg
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="section-label">History</div>

      {sorted.length === 0 ? (
        <div className="card">
          <span className="c-dim fs-13">No entries yet.</span>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {sorted.map((entry, i) => {
            const next     = sorted[i + 1]
            const delta    = next ? (entry.weight - next.weight) : null
            const deltaStr = delta !== null
              ? (delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1))
              : null

            if (editId === entry.id) {
              return (
                <BwEditRow
                  key={entry.id}
                  entry={entry}
                  today={today}
                  onSave={handleEditSave}
                  onCancel={() => setEditId(null)}
                />
              )
            }

            return (
              <div key={entry.id} className="bw-entry-row">
                <span className="fs-13 c-dim" style={{ minWidth: 80 }}>{entry.date}</span>
                <div className="row gap-8" style={{ flex: 1 }}>
                  <span className="fw-700">{entry.weight} kg</span>
                  {deltaStr && (
                    <span className={`delta ${delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : 'delta-neu'}`}>
                      {deltaStr}
                    </span>
                  )}
                </div>
                <button
                  className="icon-btn"
                  onClick={() => setEditId(entry.id)}
                  aria-label="Edit entry"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => onDelete(entry.id)}
                  aria-label="Delete entry"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}

function BwEditRow({ entry, today, onSave, onCancel }) {
  const [date, setDate]     = useState(entry.date)
  const [weight, setWeight] = useState(String(entry.weight))

  return (
    <div className="bw-entry-row" style={{ background: 'var(--primary-soft)' }}>
      <div className="bw-edit-inputs">
        <input
          type="date"
          className="bw-mini-input"
          style={{ width: 130 }}
          value={date}
          max={today}
          onChange={e => setDate(e.target.value)}
        />
        <input
          type="number"
          inputMode="decimal"
          className="bw-mini-input"
          value={weight}
          step="0.1"
          min="20"
          max="400"
          onChange={e => setWeight(e.target.value)}
          autoFocus
        />
        <span className="fs-13 c-dim">kg</span>
      </div>
      <button
        className="icon-btn"
        style={{ color: 'var(--success-text)' }}
        onClick={() => onSave(entry, date, weight)}
        aria-label="Save"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
      <button className="icon-btn" onClick={onCancel} aria-label="Cancel">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
