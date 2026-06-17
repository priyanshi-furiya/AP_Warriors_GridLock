import { motion } from 'motion/react'

interface SeverityBarProps {
  value: number // 0-100
  label?: string
  showValue?: boolean
  className?: string
}

function getSeverityColor(v: number) {
  if (v >= 85) return { bg: 'bg-red', glow: 'shadow-[0_0_12px_rgba(220,38,38,0.4)]', text: 'text-red' }
  if (v >= 70) return { bg: 'bg-orange', glow: 'shadow-[0_0_12px_rgba(255,107,53,0.35)]', text: 'text-orange' }
  if (v >= 40) return { bg: 'bg-amber', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.3)]', text: 'text-amber' }
  return { bg: 'bg-green', glow: 'shadow-[0_0_12px_rgba(34,197,94,0.3)]', text: 'text-green' }
}

export default function SeverityBar({
  value,
  label,
  showValue = true,
  className = '',
}: SeverityBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const colors = getSeverityColor(clamped)

  return (
    <div className={`w-full ${className}`}>
      {/* Label row */}
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
              {label}
            </span>
          )}
          {showValue && (
            <span className={`text-xs font-mono font-semibold ${colors.text}`}>
              {clamped}%
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div className="relative w-full h-1.5 rounded-full bg-graphite overflow-hidden">
        {/* Fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className={`absolute inset-y-0 left-0 rounded-full ${colors.bg} ${colors.glow}`}
        />
      </div>
    </div>
  )
}
