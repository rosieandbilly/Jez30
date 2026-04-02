import { getTemplateColor } from '../utils'

/**
 * Colored rounded icon for a workout template.
 * Uses a dumbbell SVG with muscle-group colour coding.
 */
export default function WorkoutIcon({ template, size = 40 }) {
  const color = getTemplateColor(template)
  // 15% opacity background tint
  const bg    = color + '26'

  const r        = Math.round(size * 0.28)
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
        <circle cx="5"  cy="12" r="2.8" />
        <circle cx="19" cy="12" r="2.8" />
        <line x1="7.8" y1="12" x2="16.2" y2="12" strokeWidth="4" />
      </svg>
    </div>
  )
}
