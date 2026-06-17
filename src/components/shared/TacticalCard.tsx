import { motion } from 'motion/react'

type AccentColor = 'lime' | 'orange' | 'red' | 'amber' | 'green'

interface TacticalCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  color?: AccentColor
  delay?: number
  className?: string
}

const accentBorder: Record<AccentColor, string> = {
  lime: 'border-t-lime',
  orange: 'border-t-orange',
  red: 'border-t-red',
  amber: 'border-t-amber',
  green: 'border-t-green',
}

const accentText: Record<AccentColor, string> = {
  lime: 'text-lime',
  orange: 'text-orange',
  red: 'text-red',
  amber: 'text-amber',
  green: 'text-green',
}

const accentGlow: Record<AccentColor, string> = {
  lime: 'hover:shadow-[0_0_24px_rgba(163,255,18,0.12),0_-2px_0_rgba(163,255,18,0.4)]',
  orange: 'hover:shadow-[0_0_24px_rgba(255,107,53,0.12),0_-2px_0_rgba(255,107,53,0.4)]',
  red: 'hover:shadow-[0_0_24px_rgba(220,38,38,0.15),0_-2px_0_rgba(220,38,38,0.4)]',
  amber: 'hover:shadow-[0_0_24px_rgba(251,191,36,0.12),0_-2px_0_rgba(251,191,36,0.4)]',
  green: 'hover:shadow-[0_0_24px_rgba(34,197,94,0.12),0_-2px_0_rgba(34,197,94,0.4)]',
}

export default function TacticalCard({
  title,
  value,
  subtitle,
  icon,
  color = 'lime',
  delay = 0,
  className = '',
}: TacticalCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      className={[
        'relative rounded-xl p-5 border-t-2 border border-border',
        'bg-bg-glass backdrop-blur-[20px]',
        'hud-corner transition-shadow duration-300',
        accentBorder[color],
        accentGlow[color],
        className,
      ].join(' ')}
    >
      {/* Icon */}
      {icon && (
        <div
          className={`text-xl mb-3 ${accentText[color]} opacity-70`}
        >
          {icon}
        </div>
      )}

      {/* Value */}
      <div className={`font-mono text-3xl font-bold tracking-tight ${accentText[color]}`}>
        {value}
      </div>

      {/* Title */}
      <div className="mt-2 text-xs font-mono uppercase tracking-[0.12em] text-text-muted">
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="mt-1 text-[11px] font-mono text-text-muted/60">
          {subtitle}
        </div>
      )}
    </motion.div>
  )
}
