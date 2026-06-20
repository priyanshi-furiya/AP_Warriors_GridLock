import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore } from '@/stores/appStore'

export default function AlertPanel() {
  const alerts = useAppStore((s) => s.alerts)
  const dismiss = useAppStore((s) => s.dismissAlert)
  const clearAlerts = useAppStore((s) => s.clearAlerts)
  const [isMinimized, setIsMinimized] = useState(false)

  if (!alerts || alerts.length === 0) {
    if (isMinimized) setIsMinimized(false)
    return null
  }

  return (
    <div className="fixed top-14 right-6 z-50 flex flex-col items-end">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.button
            key="minimized"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setIsMinimized(false)}
            className="glass-card px-4 py-2 rounded-full flex items-center gap-2 hover:border-lime/30 transition-colors shadow-lg"
          >
            <span className="w-2 h-2 rounded-full bg-red animate-pulse" />
            <span className="text-xs font-mono text-platinum">{alerts.length} Alerts</span>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-96 glass-panel flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red animate-pulse" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-platinum">System Alerts ({alerts.length})</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={clearAlerts}
                  className="text-[10px] uppercase tracking-wider text-text-muted hover:text-red transition-colors"
                >
                  Clear All
                </button>
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="text-[10px] uppercase tracking-wider text-text-muted hover:text-platinum transition-colors"
                >
                  Hide
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[280px] overflow-y-auto p-2 space-y-2 scrollbar-thin">
              {alerts.map((a) => (
                <div key={a.id} className={`glass-card p-3 border-l-4 ${a.level === 'critical' ? 'border-l-red' : a.level === 'warning' ? 'border-l-amber' : 'border-l-lime'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-platinum">{a.title}</div>
                      <div className="text-text-muted text-xs mt-1">{a.message}</div>
                      <div className="text-text-muted text-[10px] mt-1 font-mono">{new Date(a.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <button onClick={() => dismiss(a.id)} className="text-[10px] text-text-muted hover:text-platinum">Dismiss</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
