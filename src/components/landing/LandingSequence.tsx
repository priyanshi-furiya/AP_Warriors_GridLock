import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore } from '@/stores/appStore'

export default function LandingSequence() {
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const setHasSeenIntro = useAppStore((s) => s.setHasSeenIntro)
  const [phase, setPhase] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),   // fade in background
      setTimeout(() => setPhase(2), 1500),   // grid appears
      setTimeout(() => setPhase(3), 3000),   // city lights
      setTimeout(() => setPhase(4), 4500),   // data streams
      setTimeout(() => setPhase(5), 6000),   // title appears
      setTimeout(() => setPhase(6), 8000),   // subtitle
      setTimeout(() => setPhase(7), 10000),  // CTA appears
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const enterDashboard = () => {
    setPhase(8) // exit animation
    setTimeout(() => {
      setHasSeenIntro(true)
      setActiveModule('dashboard')
    }, 1000)
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ background: '#07070B' }}
    >
      {/* Animated grid background */}
      <div
        className="absolute inset-0 transition-opacity duration-[2000ms]"
        style={{ opacity: phase >= 1 ? 1 : 0 }}
      >
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(163, 255, 18, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(163, 255, 18, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: phase >= 2 ? 'grid-drift 20s linear infinite' : 'none',
        }} />
        {/* Major grid lines */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(163, 255, 18, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(163, 255, 18, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '300px 300px',
        }} />
      </div>

      {/* Radial glow center */}
      <motion.div
        className="absolute"
        style={{
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(163,255,18,0.06) 0%, rgba(163,255,18,0.02) 30%, transparent 70%)',
        }}
        animate={{
          scale: phase >= 2 ? [1, 1.2, 1] : 0,
          opacity: phase >= 2 ? 1 : 0,
        }}
        transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse' }}
      />

      {/* Floating particles / city lights */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
          >
            {Array.from({ length: 80 }).map((_, i) => {
              const x = Math.sin(i * 0.7) * 45 + 50
              const y = Math.cos(i * 0.5) * 40 + 50
              const delay = i * 0.05
              const size = (i % 3) + 1
              const color = i % 5 === 0 ? '#FF6B35' : i % 3 === 0 ? '#FBBF24' : '#A3FF12'
              return (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: color,
                    boxShadow: `0 0 ${size * 4}px ${color}`,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 0.8, 0.4, 0.8],
                    scale: [0, 1, 0.8, 1],
                  }}
                  transition={{
                    duration: 3 + (i % 3),
                    delay,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data stream lines */}
      <AnimatePresence>
        {phase >= 4 && (
          <motion.div
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const isVertical = i % 2 === 0
              const pos = 10 + (i * 7.5)
              return (
                <motion.div
                  key={`stream-${i}`}
                  className="absolute"
                  style={{
                    ...(isVertical
                      ? { left: `${pos}%`, top: 0, width: '1px', height: '100%' }
                      : { top: `${pos}%`, left: 0, height: '1px', width: '100%' }
                    ),
                    background: isVertical
                      ? 'linear-gradient(to bottom, transparent, rgba(163,255,18,0.15), transparent)'
                      : 'linear-gradient(to right, transparent, rgba(163,255,18,0.15), transparent)',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.5, 0.2, 0.5] }}
                  transition={{ duration: 4, delay: i * 0.2, repeat: Infinity }}
                />
              )
            })}
            {/* Moving data packets */}
            {Array.from({ length: 20 }).map((_, i) => {
              const isVertical = i % 2 === 0
              const lineIdx = i % 12
              const pos = 10 + (lineIdx * 7.5)
              return (
                <motion.div
                  key={`packet-${i}`}
                  className="absolute rounded-full"
                  style={{
                    width: '3px',
                    height: '3px',
                    backgroundColor: '#A3FF12',
                    boxShadow: '0 0 6px #A3FF12',
                    ...(isVertical
                      ? { left: `${pos}%` }
                      : { top: `${pos}%` }
                    ),
                  }}
                  animate={
                    isVertical
                      ? { top: ['-2%', '102%'] }
                      : { left: ['-2%', '102%'] }
                  }
                  transition={{
                    duration: 3 + (i % 4),
                    delay: i * 0.3,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Radar sweep */}
      <AnimatePresence>
        {phase >= 4 && (
          <motion.div
            className="absolute"
            style={{
              width: '500px',
              height: '500px',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 1 }}
          >
            <motion.div
              className="w-full h-full"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, rgba(163,255,18,0.12) 10%, transparent 20%)',
                borderRadius: '50%',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main title */}
      <div className="relative z-20 text-center">
        <AnimatePresence>
          {phase >= 5 && phase < 8 && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 1.1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-lime" />
                <span className="text-text-muted text-xs tracking-[0.4em] font-mono uppercase">
                  System Initialized
                </span>
                <div className="h-[1px] w-20 bg-gradient-to-l from-transparent to-lime" />
              </div>

              <h1 className="font-display font-black text-[5.5rem] leading-none tracking-tight mb-2">
                <span className="text-platinum">GRID</span>
                <span className="text-lime" style={{
                  textShadow: '0 0 30px rgba(163,255,18,0.4), 0 0 60px rgba(163,255,18,0.2)',
                }}>LOCK</span>
              </h1>

              <motion.div
                className="flex items-center justify-center gap-3 mb-2"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <div className="h-[1px] flex-1 max-w-32 bg-gradient-to-r from-transparent to-lime/30" />
                <span className="text-lime text-sm font-semibold tracking-[0.3em]">AI</span>
                <div className="h-[1px] flex-1 max-w-32 bg-gradient-to-l from-transparent to-lime/30" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 6 && phase < 8 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8"
            >
              <p className="text-text-secondary text-lg tracking-[0.15em] font-light mb-1">
                Urban Mobility Intelligence
              </p>
              <p className="text-text-muted text-sm tracking-[0.2em] uppercase">
                For Smart Enforcement
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 7 && phase < 8 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.6 }}
              className="mt-14"
            >
              <button
                onClick={enterDashboard}
                className="group relative px-10 py-4 font-display font-semibold text-sm tracking-[0.2em] uppercase
                           text-bg-primary bg-lime rounded-sm
                           transition-all duration-300
                           hover:shadow-[0_0_30px_rgba(163,255,18,0.4)]
                           active:scale-95"
              >
                <span className="relative z-10">Enter Command Center</span>
                <motion.div
                  className="absolute inset-0 rounded-sm"
                  style={{ background: 'rgba(163,255,18,0.3)' }}
                  animate={{ opacity: [0, 0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </button>

              <motion.p
                className="mt-6 text-text-muted text-xs tracking-wider cursor-pointer hover:text-text-secondary transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={enterDashboard}
              >
                Press Enter or click to continue
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip button */}
      {phase < 7 && phase > 0 && (
        <motion.button
          className="fixed bottom-8 right-8 z-50 text-text-muted text-xs tracking-wider
                     hover:text-text-secondary transition-colors font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 2 }}
          onClick={enterDashboard}
        >
          SKIP INTRO →
        </motion.button>
      )}

      {/* Corner brackets */}
      {phase >= 2 && (
        <>
          {[
            'top-8 left-8',
            'top-8 right-8 rotate-90',
            'bottom-8 right-8 rotate-180',
            'bottom-8 left-8 -rotate-90',
          ].map((pos, i) => (
            <motion.div
              key={i}
              className={`fixed ${pos} z-30`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.3, scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.1 + 0.5 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M0 8V0H8" stroke="#A3FF12" strokeWidth="1" />
              </svg>
            </motion.div>
          ))}
        </>
      )}

      {/* Keyboard listener */}
      <KeyboardListener onEnter={enterDashboard} enabled={phase >= 7} />

      <style>{`
        @keyframes grid-drift {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
      `}</style>
    </div>
  )
}

function KeyboardListener({ onEnter, enabled }: { onEnter: () => void; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onEnter()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onEnter, enabled])
  return null
}
