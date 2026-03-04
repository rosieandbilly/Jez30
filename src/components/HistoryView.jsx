import { useState, useMemo, useRef } from 'react'
import { formatDate, tagClass, getTopSet, getDateKey, buildActivityChart, abbrevExercise } from '../utils'
import WorkoutIcon from './WorkoutIcon'

const PERIODS = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1yr', days: 365 },
]

function getCutoffKey(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function HistoryView({ workouts, onSelect, onExport, onImport, theme, onToggleTheme }) {
  const [periodIdx, setPeriodIdx] = useState(1) // default 30d
  const [importMode, setImportMode] = useState(null) // 'replace' | 'merge' | null
  const [importParsed, setImportParsed] = useState(null)
  const [importError, setImportError]   = useState('')
  const fileInputRef = useRef(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result)
        if (!Array.isArray(parsed.workouts)) throw new Error('Invalid format')
        setImportParsed(parsed)
        setImportMode('choose')
        setImportError('')
      } catch {
        setImportError('Invalid file — could not read backup.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function confirmImport(mode) {
    onImport(importParsed, mode)
    setImportMode(null)
    setImportParsed(null)
  }

  const { days } = PERIODS[periodIdx]
  const cutoff = getCutoffKey(days)

  // Workouts within the selected period (use localDateKey when available)
  const filtered = useMemo(
    () => workouts.filter(w => (w.localDateKey || getDateKey(w.date)) >= cutoff),
    [workouts, cutoff]
  )

  // Stats for the period
  const daysActive = useMemo(
    () => new Set(filtered.map(w => w.localDateKey || getDateKey(w.date))).size,
    [filtered]
  )
  const totalSets = useMemo(
    () => filtered.reduce(
      (sum, w) => sum + w.exercises.reduce(
        (s, ex) => s + ex.sets.filter(s => s.type !== 'warmup').length, 0
      ), 0
    ),
    [filtered]
  )

  // Top exercises (by frequency) for the period, with template info
  const topExercises = useMemo(() => {
    const counts = {}
    const templates = {}
    filtered.forEach(w => {
      w.exercises.forEach(ex => {
        counts[ex.name] = (counts[ex.name] || 0) + 1
        if (!templates[ex.name]) templates[ex.name] = w.template
      })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, template: templates[name] }))
  }, [filtered])

  // Chart data for the period
  const chartData = useMemo(
    () => buildActivityChart(workouts, days),
    [workouts, days]
  )

  const headerActions = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
      {onToggleTheme && (
        <button className="header-icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      )}
      {onExport && (
        <button className="header-icon-btn" onClick={onExport} aria-label="Export data">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      )}
      {onImport && (
        <button className="header-icon-btn" onClick={() => fileInputRef.current?.click()} aria-label="Import data">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )

  if (workouts.length === 0) {
    return (
      <div>
        <div className="screen-header">
          <h1 className="screen-title">History</h1>
          {headerActions}
        </div>
        {importError && <div className="save-error">{importError}</div>}
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          No workouts yet.<br />Tap Create to start your first session.
        </div>
        {importMode === 'choose' && importParsed && (
          <ImportConfirmModal
            parsed={importParsed}
            onConfirm={confirmImport}
            onClose={() => { setImportMode(null); setImportParsed(null) }}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="screen-header">
        <h1 className="screen-title">History</h1>
        <span className="fs-13 c-dim" style={{ marginLeft: 8 }}>{workouts.length}</span>
        {headerActions}
      </div>
      {importError && <div className="save-error">{importError}</div>}

      {/* Period filter */}
      <div className="seg-control">
        {PERIODS.map((p, i) => (
          <button
            key={p.label}
            className={`seg-btn${i === periodIdx ? ' active' : ''}`}
            onClick={() => setPeriodIdx(i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-value">{daysActive}</div>
          <div className="stat-label">Days Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{filtered.length}</div>
          <div className="stat-label">Workouts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalSets}</div>
          <div className="stat-label">Sets</div>
        </div>
      </div>

      {/* Activity chart */}
      {chartData.length > 0 && (
        <div className="card">
          <div className="card-title">Activity</div>
          <ActivityChart data={chartData} />
        </div>
      )}

      {/* Top exercises */}
      {topExercises.length > 0 && (
        <>
          <div className="section-label">Top Exercises</div>
          {topExercises.map(ex => (
            <TopExerciseRow key={ex.name} {...ex} />
          ))}
        </>
      )}

      {/* All workouts */}
      <div className="section-label" style={{ marginTop: 16 }}>All Workouts</div>
      {workouts.map(workout => (
        <WorkoutCard key={workout.id} workout={workout} onSelect={onSelect} />
      ))}

      {importMode === 'choose' && importParsed && (
        <ImportConfirmModal
          parsed={importParsed}
          onConfirm={confirmImport}
          onClose={() => { setImportMode(null); setImportParsed(null) }}
        />
      )}
    </div>
  )
}

/* ── Import Confirm Modal ── */

function ImportConfirmModal({ parsed, onConfirm, onClose }) {
  const wCount  = parsed.workouts?.length || 0
  const bwCount = parsed.bodyweights?.length || 0
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">Import Backup</div>
        <div className="c-dim fs-13" style={{ marginBottom: 16 }}>
          Found {wCount} workout{wCount !== 1 ? 's' : ''} and {bwCount} bodyweight entry/entries.
        </div>
        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button className="btn btn-primary" onClick={() => onConfirm('merge')}>
            Merge (add new data)
          </button>
          <button
            className="btn"
            style={{ background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
            onClick={() => onConfirm('replace')}
          >
            Replace all data
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function ActivityChart({ data }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="bar-chart">
      {data.map((item, i) => (
        <div key={i} className="bar-col">
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ height: item.count > 0 ? `${Math.max(6, (item.count / max) * 100)}%` : '0%' }}
            />
          </div>
          <span className="bar-label">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function TopExerciseRow({ name, count, template }) {
  return (
    <div className="top-ex-row">
      <WorkoutIcon template={template || 'Push'} size={36} />
      <div className="top-ex-info">
        <div className="top-ex-name">{name}</div>
        <div className="top-ex-count">{count} session{count !== 1 ? 's' : ''}</div>
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginRight: 4 }}>
        {count}×
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  )
}

function WorkoutCard({ workout, onSelect }) {
  const summary = workout.exercises
    .slice(0, 3)
    .map(ex => {
      const top = getTopSet(ex)
      return `${abbrevExercise(ex.name)} ${top.weight}kg`
    })
    .join('  ·  ')

  return (
    <div className="card card-tap" onClick={() => onSelect(workout.id)}>
      <div className="workout-row-content">
        <WorkoutIcon template={workout.template} size={42} />
        <div className="workout-info">
          <div className="workout-template">
            <span className={`tag ${tagClass(workout.template)}`}
              style={{ marginRight: 6 }}>
              {workout.template}
            </span>
          </div>
          <div className="workout-summary">{summary}</div>
        </div>
        <div className="workout-time">
          <div>{formatDate(workout.date)}</div>
          <div style={{ marginTop: 4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
