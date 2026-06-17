import { type ReactNode } from 'react'
import { motion } from 'motion/react'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'accent' | 'danger' | 'info'
  glow?: boolean
  animate?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const variantStyles: Record<string, string> = {
  default: 'border-[rgba(163,255,18,0.08)]',
  accent: 'border-[rgba(163,255,18,0.2)]',
  danger: 'border-[rgba(220,38,38,0.2)]',
  info: 'border-[rgba(255,107,53,0.2)]',
}

const variantGlow: Record<string, string> = {
  default: '',
  accent: 'shadow-[0_0_20px_rgba(163,255,18,0.15),0_0_60px_rgba(163,255,18,0.05)]',
  danger: 'shadow-[0_0_20px_rgba(220,38,38,0.2),0_0_60px_rgba(220,38,38,0.08)]',
  info: 'shadow-[0_0_20px_rgba(255,107,53,0.15),0_0_60px_rgba(255,107,53,0.05)]',
}

const paddingMap: Record<string, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
}

export default function GlassPanel({
  children,
  className = '',
  variant = 'default',
  glow = false,
  animate = false,
  padding = 'md',
  onClick,
}: GlassPanelProps) {
  const baseClasses = [
    'relative rounded-xl border',
    'bg-bg-glass backdrop-blur-[20px]',
    variantStyles[variant],
    (glow || variant !== 'default') ? variantGlow[variant] : '',
    paddingMap[padding],
    'hud-corner',
    onClick ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (animate) {
    return (
      <motion.div
        className={baseClasses}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div className={baseClasses} onClick={onClick}>
      {children}
    </div>
  )
}
