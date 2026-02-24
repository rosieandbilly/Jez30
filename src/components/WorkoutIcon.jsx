/**
 * Colored rounded icon for a workout template.
 * Uses a simple dumbbell SVG with template-based color.
 */
export default function WorkoutIcon({ template, size = 40 }) {
  let bg, color
  if (template.startsWith('Upper')) {
    bg = 'rgba(0,122,255,0.12)'; color = '#007AFF'
  } else if (template.startsWith('Lower')) {
    bg = 'rgba(52,199,89,0.12)'; color = '#1c9e43'
  } else {
    // Push / fallback
    bg = 'rgba(255,149,0,0.12)'; color = '#b86800'
  }

  const r = Math.round(size * 0.28)
  const iconSize = Math.round(size * 0.52)

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: r,
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Dumbbell: two circles connected by a thick bar */}
        <circle cx="5"  cy="12" r="2.8" />
        <circle cx="19" cy="12" r="2.8" />
        <line x1="7.8" y1="12" x2="16.2" y2="12" strokeWidth="4" />
      </svg>
    </div>
  )
}
