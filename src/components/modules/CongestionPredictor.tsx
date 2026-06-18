import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { predictions } from '@/data/zones'

/* ───────── helpers ───────── */
function getCongestionColor(level: number) {
  if (level < 30) return '#22C55E'
  if (level < 60) return '#FBBF24'
  if (level < 80) return '#FF6B35'
  return '#DC2626'
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const rad = (a: number) => ((a - 90) * Math.PI) / 180
  const x1 = cx + r * Math.cos(rad(startAngle))
  const y1 = cy + r * Math.sin(rad(startAngle))
  const x2 = cx + r * Math.cos(rad(endAngle))
  const y2 = cy + r * Math.sin(rad(endAngle))
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

/* ───────── types ───────── */
interface PredictionResult {
  violations: number
  blockageProbability: number
  congestionLevel: number
  features: { name: string; importance: number }[]
}

/* ═══════════════════════════════════════════════════ */
export default function CongestionPredictor() {
  const [selectedJunction, setSelectedJunction] = useState(predictions.junctions[0].id)
  const [selectedHour, setSelectedHour] = useState(9)
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null)
  const [isPredicting, setIsPredicting] = useState(false)

  const junctions = predictions.junctions

  const selectedJunctionName = useMemo(
    () => junctions.find((j) => j.id === selectedJunction)?.name ?? '',
    [selectedJunction, junctions],
  )

  /* predict handler */
  const handlePredict = () => {
    setIsPredicting(true)
    setPredictionResult(null)
    setTimeout(() => {
      const result = predictions.predict(selectedJunction, selectedHour)
      setPredictionResult(result)
      setIsPredicting(false)
    }, 900)
  }

  /* congestion arc */
  const congestionDeg = predictionResult ? (predictionResult.congestionLevel / 100) * 270 : 0
  const congestionColor = predictionResult ? getCongestionColor(predictionResult.congestionLevel) : '#22C55E'

  return (
    <div className="relative w-full bg-bg-primary p-6 lg:p-10 overflow-y-auto" style={{ minHeight: 'calc(100vh - 3rem)' }}>
      {/* ── Title ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <p className="text-text-muted text-xs tracking-[0.3em] uppercase font-mono mb-1">
          Module 07
        </p>
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-platinum">
          Congestion <span className="text-gradient-lime">Predictor</span>
        </h1>
        <p className="text-text-secondary text-sm mt-1 max-w-md">
          AI-powered traffic forecasting — select a junction &amp; hour to predict violations.
        </p>
      </motion.div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* ══════════ LEFT / MAIN COLUMN ══════════ */}
        <div className="flex-1 flex flex-col gap-6">
          {/* ── Top Controls ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="glass-panel p-5"
          >
            {/* Junction Selector */}
            <label className="block text-text-muted text-[10px] uppercase tracking-[0.2em] mb-2">
              Junction
            </label>
            <div className="relative mb-5">
              <select
                value={selectedJunction}
                onChange={(e) => setSelectedJunction(e.target.value)}
                className="w-full bg-bg-secondary/60 border border-border rounded-lg px-4 py-3 text-platinum text-sm font-medium appearance-none cursor-pointer focus:outline-none focus:border-lime/40 transition-colors"
              >
                {junctions.map((j) => (
                  <option key={j.id} value={j.id} className="bg-bg-primary">
                    {j.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lime text-xs">
                ▼
              </div>
            </div>

            {/* Hour Selector */}
            <label className="block text-text-muted text-[10px] uppercase tracking-[0.2em] mb-2">
              Hour of Day
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
              {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                <button
                  key={h}
                  onClick={() => setSelectedHour(h)}
                  className={`
                    shrink-0 w-10 h-10 rounded-lg font-mono text-xs font-semibold transition-all duration-200
                    ${
                      h === selectedHour
                        ? 'bg-lime text-bg-primary shadow-[0_0_16px_rgba(163,255,18,0.3)]'
                        : 'bg-bg-secondary/50 text-text-secondary border border-border hover:border-lime/30 hover:text-platinum'
                    }
                  `}
                >
                  {String(h).padStart(2, '0')}
                </button>
              ))}
            </div>

            {/* Predict Button */}
            <motion.button
              onClick={handlePredict}
              disabled={isPredicting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="mt-5 w-full py-3.5 rounded-xl font-display font-bold text-base tracking-wide bg-lime text-bg-primary
                         shadow-[0_0_30px_rgba(163,255,18,0.25)] hover:shadow-[0_0_50px_rgba(163,255,18,0.4)]
                         transition-shadow disabled:opacity-60 disabled:cursor-wait animate-pulse-glow"
            >
              {isPredicting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70" />
                  </svg>
                  Analyzing…
                </span>
              ) : (
                '⚡ PREDICT'
              )}
            </motion.button>
          </motion.div>

          {/* ── Center: Visualization ── */}
          <AnimatePresence mode="wait">
            {isPredicting && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-panel p-10 flex items-center justify-center min-h-[360px]"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-lime/30 border-t-lime animate-spin" />
                  <p className="text-text-secondary text-sm">Running neural model…</p>
                </div>
              </motion.div>
            )}

            {predictionResult && !isPredicting && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="glass-panel p-6 lg:p-8"
              >
                {/* Junction label */}
                <p className="text-text-muted text-[10px] uppercase tracking-[0.25em] text-center mb-6">
                  Prediction for <span className="text-lime">{selectedJunctionName}</span> at{' '}
                  <span className="font-mono text-lime">{String(selectedHour).padStart(2, '0')}:00</span>
                </p>

                {/* Gauge */}
                <div className="flex justify-center mb-8">
                  <div className="relative w-56 h-56">
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      {/* bg ring */}
                      <path
                        d={arcPath(100, 100, 85, 0, 270)}
                        fill="none"
                        stroke="rgba(163,255,18,0.08)"
                        strokeWidth="10"
                        strokeLinecap="round"
                      />
                      {/* value arc */}
                      <motion.path
                        d={arcPath(100, 100, 85, 0, Math.max(1, congestionDeg))}
                        fill="none"
                        stroke={congestionColor}
                        strokeWidth="10"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        style={{ filter: `drop-shadow(0 0 8px ${congestionColor}80)` }}
                      />
                      {/* tick marks */}
                      {[0, 25, 50, 75, 100].map((pct) => {
                        const angle = (pct / 100) * 270
                        const rad = ((angle - 90) * Math.PI) / 180
                        const x1 = 100 + 73 * Math.cos(rad)
                        const y1 = 100 + 73 * Math.sin(rad)
                        const x2 = 100 + 78 * Math.cos(rad)
                        const y2 = 100 + 78 * Math.sin(rad)
                        return (
                          <line
                            key={pct}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="rgba(229,231,235,0.25)"
                            strokeWidth="1.5"
                          />
                        )
                      })}
                    </svg>
                    {/* Inner data */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        className="font-mono text-5xl font-bold leading-none"
                        style={{ color: congestionColor }}
                      >
                        {predictionResult.congestionLevel}
                        <span className="text-lg">%</span>
                      </span>
                      <span className="text-text-muted text-[10px] uppercase tracking-widest mt-1">
                        Congestion
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
                  <div className="glass-card p-4 text-center">
                    <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1">
                      Expected Violations
                    </p>
                    <motion.p
                      className="font-mono text-3xl font-bold text-platinum"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      {predictionResult.violations}
                    </motion.p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1">
                      Blockage Probability
                    </p>
                    <motion.p
                      className="font-mono text-3xl font-bold"
                      style={{ color: congestionColor }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      {predictionResult.blockageProbability}%
                    </motion.p>
                  </div>
                </div>

                {/* Feature Importance */}
                <div>
                  <p className="text-text-muted text-[10px] uppercase tracking-[0.25em] mb-4">
                    Feature Importance
                  </p>
                  <div className="space-y-2.5">
                    {predictionResult.features.map((feat, i) => (
                      <motion.div
                        key={feat.name}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.08, duration: 0.4 }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-text-secondary text-xs w-28 shrink-0 text-right">
                          {feat.name}
                        </span>
                        <div className="flex-1 h-5 bg-bg-secondary/50 rounded-full overflow-hidden border border-border/50">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: `linear-gradient(90deg, #A3FF12, #22C55E)`,
                              boxShadow: '0 0 12px rgba(163,255,18,0.25)',
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${feat.importance * 100}%` }}
                            transition={{ delay: 0.7 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="font-mono text-xs text-lime w-10 text-right">
                          {feat.importance.toFixed(2)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Empty state ── */}
          {!predictionResult && !isPredicting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="glass-panel p-10 flex flex-col items-center justify-center min-h-[360px] text-center"
            >
              <div className="w-20 h-20 rounded-full border border-border flex items-center justify-center mb-4">
                <span className="text-3xl opacity-40">🧠</span>
              </div>
              <p className="text-text-secondary text-sm">
                Select a junction &amp; hour, then hit <span className="text-lime font-semibold">PREDICT</span> to generate a forecast.
              </p>
            </motion.div>
          )}
        </div>

        {/* ══════════ RIGHT SIDE PANEL ══════════ */}
        <motion.aside
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="w-full xl:w-72 shrink-0"
        >
          <div className="glass-panel p-5 space-y-5">
            <h3 className="text-text-muted text-[10px] uppercase tracking-[0.3em]">
              Model Information
            </h3>

            {[
              { label: 'Model', value: 'GridLock Neural v3.2' },
              { label: 'Accuracy', value: '94.7%' },
              { label: 'Last Trained', value: '2h ago' },
              { label: 'Training Data', value: '2.4M records' },
              { label: 'Inference', value: '~120ms' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.06 }}
              >
                <p className="text-text-muted text-[10px] uppercase tracking-widest">{item.label}</p>
                <p className="font-mono text-sm text-platinum font-medium mt-0.5">{item.value}</p>
              </motion.div>
            ))}

            {/* Accuracy gauge */}
            <div className="pt-2">
              <p className="text-text-muted text-[10px] uppercase tracking-widest mb-2">
                Historical Accuracy
              </p>
              <div className="w-full h-2 rounded-full bg-bg-secondary/60 border border-border/40 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-lime to-green"
                  initial={{ width: 0 }}
                  animate={{ width: '94.7%' }}
                  transition={{ delay: 0.8, duration: 1 }}
                  style={{ boxShadow: '0 0 8px rgba(163,255,18,0.3)' }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-mono text-[10px] text-text-muted">0%</span>
                <span className="font-mono text-[10px] text-lime">94.7%</span>
                <span className="font-mono text-[10px] text-text-muted">100%</span>
              </div>
            </div>

            {/* Status pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green/10 border border-green/20 text-green text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                Model Online
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lime/10 border border-lime/20 text-lime text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-lime" />
                GPU Accelerated
              </span>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  )
}
