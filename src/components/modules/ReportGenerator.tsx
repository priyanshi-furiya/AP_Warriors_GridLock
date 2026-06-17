import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { zones } from '@/data/zones'

interface ReportHistoryItem {
  id: string
  title: string
  date: string
  type: string
  size: string
}

const PAST_REPORTS: ReportHistoryItem[] = [
  {
    id: 'rep-01',
    title: 'Daily Enforcement Summary - Central',
    date: '2026-06-16',
    type: 'Daily',
    size: '1.2 MB',
  },
  {
    id: 'rep-02',
    title: 'Weekly Traffic Volume Analytics',
    date: '2026-06-14',
    type: 'Weekly',
    size: '4.8 MB',
  },
  {
    id: 'rep-03',
    title: 'Monthly Congestion Prediction Report',
    date: '2026-06-01',
    type: 'Monthly',
    size: '12.4 MB',
  },
]

export default function ReportGenerator() {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [startDate, setStartDate] = useState('2026-06-16')
  const [endDate, setEndDate] = useState('2026-06-16')
  const [selectedZones, setSelectedZones] = useState<string[]>(zones.map((z) => z.id))
  const [includedSections, setIncludedSections] = useState<string[]>([
    'heatmap',
    'charts',
    'stats',
    'recommendations',
  ])
  const [generatingState, setGeneratingState] = useState<'idle' | 'generating' | 'success'>('idle')

  // Automatically update end date based on type for convenience
  useEffect(() => {
    if (reportType === 'daily') {
      setEndDate(startDate)
    } else if (reportType === 'weekly') {
      const start = new Date(startDate)
      start.setDate(start.getDate() + 7)
      setEndDate(start.toISOString().split('T')[0])
    } else if (reportType === 'monthly') {
      const start = new Date(startDate)
      start.setMonth(start.getMonth() + 1)
      setEndDate(start.toISOString().split('T')[0])
    }
  }, [reportType, startDate])

  const toggleZone = (id: string) => {
    setSelectedZones((prev) =>
      prev.includes(id) ? prev.filter((zid) => zid !== id) : [...prev, id]
    )
  }

  const toggleSection = (section: string) => {
    setIncludedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

  const handleSelectAllZones = () => {
    setSelectedZones(zones.map((z) => z.id))
  }

  const handleClearAllZones = () => {
    setSelectedZones([])
  }

  const handleGenerate = () => {
    setGeneratingState('generating')
    setTimeout(() => {
      setGeneratingState('success')
    }, 2500)
  }

  const handleReset = () => {
    setGeneratingState('idle')
  }

  const mockDownload = () => {
    const reportContent = `GRIDLOCK AI REPORT\n==================\nType: ${reportType.toUpperCase()}\nPeriod: ${startDate} to ${endDate}\nZones Included: ${selectedZones.length}\nSections: ${includedSections.join(', ')}\nGenerated at: ${new Date().toLocaleString()}\n`
    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gridlock_report_${reportType}_${startDate}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="relative w-full min-h-screen bg-bg-primary p-6 lg:p-10 overflow-y-auto">
      {/* ── Title ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <p className="text-text-muted text-xs tracking-[0.3em] uppercase font-mono mb-1">
          Module 09
        </p>
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-platinum">
          Report <span className="text-gradient-lime">Generator</span>
        </h1>
        <p className="text-text-secondary text-sm mt-1 max-w-md">
          Export smart-city analytics. Configure parameters, assemble modules, and download tactical PDF/CSV sheets.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ══════════ LEFT COLUMN: CONFIGURATION ══════════ */}
        <motion.div
          initial={{ opacity: 0, x: -25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="xl:col-span-5 flex flex-col gap-6"
        >
          <div className="glass-panel p-6 hud-corner relative space-y-6">
            <h2 className="text-text-secondary font-display font-semibold text-lg tracking-wider border-b border-border/30 pb-3 flex items-center gap-2">
              <span>⚙️</span> REPORT PARAMETERS
            </h2>

            {/* Report Type */}
            <div>
              <label className="block text-text-muted text-[10px] uppercase tracking-[0.25em] mb-2.5">
                Report Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['daily', 'weekly', 'monthly'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setReportType(type)}
                    disabled={generatingState === 'generating'}
                    className={`
                      py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-display border transition-all duration-200
                      ${
                        reportType === type
                          ? 'bg-lime text-bg-primary border-lime shadow-[0_0_15px_rgba(163,255,18,0.25)] font-bold'
                          : 'bg-bg-secondary/40 text-text-secondary border-border/50 hover:border-lime/30 hover:text-platinum'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-text-muted text-[10px] uppercase tracking-[0.25em] mb-2.5">
                Time Interval
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[9px] text-text-muted uppercase mb-1 font-mono">Start Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={generatingState === 'generating'}
                    className="w-full bg-bg-secondary/50 border border-border/60 rounded-lg px-3 py-2 text-platinum text-xs font-mono focus:outline-none focus:border-lime/40 transition-colors disabled:opacity-50"
                  />
                </div>
                <div>
                  <span className="block text-[9px] text-text-muted uppercase mb-1 font-mono">End Date</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={generatingState === 'generating' || reportType !== 'daily'}
                    className="w-full bg-bg-secondary/50 border border-border/60 rounded-lg px-3 py-2 text-platinum text-xs font-mono focus:outline-none focus:border-lime/40 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Zone Filter */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label className="text-text-muted text-[10px] uppercase tracking-[0.25em]">
                  Police Station Zones
                </label>
                <div className="flex gap-2 text-[9px] font-mono text-lime uppercase">
                  <button
                    onClick={handleSelectAllZones}
                    disabled={generatingState === 'generating'}
                    className="hover:underline disabled:opacity-50"
                  >
                    All
                  </button>
                  <span className="text-border">|</span>
                  <button
                    onClick={handleClearAllZones}
                    disabled={generatingState === 'generating'}
                    className="hover:underline disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                {zones.map((z) => {
                  const isSelected = selectedZones.includes(z.id)
                  return (
                    <button
                      key={z.id}
                      onClick={() => toggleZone(z.id)}
                      disabled={generatingState === 'generating'}
                      className={`
                        px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-all duration-200
                        ${
                          isSelected
                            ? 'bg-lime/10 border-lime/40 text-lime shadow-[0_0_8px_rgba(163,255,18,0.1)]'
                            : 'bg-bg-secondary/30 border-border/30 text-text-muted hover:border-lime/20 hover:text-text-secondary'
                        }
                        disabled:opacity-50
                      `}
                    >
                      {z.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Included Sections */}
            <div>
              <label className="block text-text-muted text-[10px] uppercase tracking-[0.25em] mb-2.5">
                Sections to Include
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'heatmap', label: 'Heatmap Density' },
                  { id: 'charts', label: 'Enforcement Charts' },
                  { id: 'stats', label: 'Core Statistics' },
                  { id: 'recommendations', label: 'AI Recommendations' },
                ].map((sec) => {
                  const isChecked = includedSections.includes(sec.id)
                  return (
                    <label
                      key={sec.id}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer select-none transition-all duration-200
                        ${
                          isChecked
                            ? 'bg-bg-secondary/70 border-lime/30 text-platinum'
                            : 'bg-bg-secondary/10 border-border/30 text-text-muted hover:border-border/60'
                        }
                        ${generatingState === 'generating' ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={generatingState === 'generating'}
                        onChange={() => toggleSection(sec.id)}
                        className="w-4 h-4 accent-lime rounded border-border bg-bg-primary focus:ring-0 focus:ring-offset-0 disabled:cursor-not-allowed"
                      />
                      <span className="text-xs font-medium tracking-wide">{sec.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              <AnimatePresence mode="wait">
                {generatingState === 'idle' && (
                  <motion.button
                    key="generate-btn"
                    onClick={handleGenerate}
                    disabled={selectedZones.length === 0 || includedSections.length === 0}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 rounded-xl font-display font-bold text-base tracking-wide bg-lime text-bg-primary
                               shadow-[0_0_20px_rgba(163,255,18,0.2)] hover:shadow-[0_0_40px_rgba(163,255,18,0.4)]
                               transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
                  >
                    🛠️ GENERATE REPORT
                  </motion.button>
                )}

                {generatingState === 'generating' && (
                  <motion.div
                    key="generating-spinner"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full py-3.5 rounded-xl border border-lime/30 bg-bg-secondary/40 text-lime text-center font-display font-semibold flex items-center justify-center gap-3"
                  >
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray="30 70"
                      />
                    </svg>
                    ASSEMBLING REPORT FILES...
                  </motion.div>
                )}

                {generatingState === 'success' && (
                  <motion.div
                    key="success-actions"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    <button
                      onClick={mockDownload}
                      className="py-3 rounded-lg font-display font-bold text-sm bg-green text-bg-primary shadow-[0_0_25px_rgba(34,197,94,0.3)] hover:shadow-[0_0_35px_rgba(34,197,94,0.5)] transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      📥 DOWNLOAD PDF
                    </button>
                    <button
                      onClick={handleReset}
                      className="py-3 rounded-lg font-display font-bold text-sm bg-bg-secondary border border-border text-text-secondary hover:text-platinum hover:border-lime/30 transition-colors"
                    >
                      🔄 NEW CONFIG
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* ══════════ RIGHT COLUMN: PREVIEW & HISTORY ══════════ */}
        <motion.div
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="xl:col-span-7 flex flex-col gap-6"
        >
          {/* ── REPORT PREVIEW CHAMBER ── */}
          <div className="glass-panel p-6 hud-corner relative flex flex-col min-h-[420px]">
            <div className="flex justify-between items-center border-b border-border/30 pb-3 mb-5">
              <h2 className="text-text-secondary font-display font-semibold text-lg tracking-wider flex items-center gap-2">
                <span>🖥️</span> PREVIEW ASSEMBLY CHAMBER
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
                <span className="text-[10px] font-mono text-lime uppercase tracking-widest">
                  {generatingState === 'idle' ? 'STANDBY' : generatingState.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Preview Grid Container */}
            <div className="flex-1 relative border border-border/30 rounded-xl bg-bg-secondary/20 overflow-hidden flex items-center justify-center p-4 min-h-[300px]">
              {/* Grid Background */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(163, 255, 18, 0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(163, 255, 18, 0.05) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px',
                }}
              />

              <AnimatePresence mode="wait">
                {generatingState === 'idle' && (
                  <motion.div
                    key="preview-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full grid grid-cols-2 grid-rows-2 gap-3"
                  >
                    {/* Quadrant 1: Heatmap Preview */}
                    <div
                      className={`
                        border border-border/40 rounded-lg p-3 bg-bg-secondary/40 flex flex-col justify-between transition-all duration-300
                        ${includedSections.includes('heatmap') ? 'opacity-100 shadow-[0_0_15px_rgba(255,107,53,0.05)] border-orange/20' : 'opacity-20'}
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-orange uppercase tracking-wider">Heatmap Density</span>
                        <span className="text-xs">🗺️</span>
                      </div>
                      <div className="grid grid-cols-6 gap-1 my-2">
                        {Array.from({ length: 18 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-3 rounded-sm"
                            style={{
                              backgroundColor:
                                i % 5 === 0
                                  ? '#DC2626'
                                  : i % 3 === 0
                                  ? '#FF6B35'
                                  : i % 2 === 0
                                  ? '#FBBF24'
                                  : '#1E293B',
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider">Density map layer</span>
                    </div>

                    {/* Quadrant 2: Enforcement Charts Preview */}
                    <div
                      className={`
                        border border-border/40 rounded-lg p-3 bg-bg-secondary/40 flex flex-col justify-between transition-all duration-300
                        ${includedSections.includes('charts') ? 'opacity-100 shadow-[0_0_15px_rgba(163,255,18,0.05)] border-lime/20' : 'opacity-20'}
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-lime uppercase tracking-wider">Analytics Charts</span>
                        <span className="text-xs">📊</span>
                      </div>
                      <div className="flex items-end gap-1.5 h-12 my-2 px-2 border-b border-border/20 pb-1">
                        {[40, 75, 50, 95, 60, 80].map((h, i) => (
                          <div
                            key={i}
                            className="w-full bg-gradient-to-t from-green to-lime rounded-t-sm"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider">Hourly distribution</span>
                    </div>

                    {/* Quadrant 3: Core Statistics Preview */}
                    <div
                      className={`
                        border border-border/40 rounded-lg p-3 bg-bg-secondary/40 flex flex-col justify-between transition-all duration-300
                        ${includedSections.includes('stats') ? 'opacity-100 shadow-[0_0_15px_rgba(251,191,36,0.05)] border-amber/20' : 'opacity-20'}
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-amber uppercase tracking-wider">Core Statistics</span>
                        <span className="text-xs">🔢</span>
                      </div>
                      <div className="my-2 space-y-1">
                        <div className="flex justify-between font-mono text-xs">
                          <span className="text-text-muted text-[10px]">TOTAL:</span>
                          <span className="text-platinum font-bold">15,449</span>
                        </div>
                        <div className="flex justify-between font-mono text-xs">
                          <span className="text-text-muted text-[10px]">REVENUE:</span>
                          <span className="text-lime font-bold">₹12.6L</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider">Aggregate summaries</span>
                    </div>

                    {/* Quadrant 4: AI Recommendations Preview */}
                    <div
                      className={`
                        border border-border/40 rounded-lg p-3 bg-bg-secondary/40 flex flex-col justify-between transition-all duration-300
                        ${includedSections.includes('recommendations') ? 'opacity-100 shadow-[0_0_15px_rgba(34,197,94,0.05)] border-green/20' : 'opacity-20'}
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-green uppercase tracking-wider">AI Recommendations</span>
                        <span className="text-xs">🤖</span>
                      </div>
                      <div className="my-2 space-y-1 text-[9px] font-mono text-text-secondary leading-tight">
                        <p className="border-l border-green/40 pl-1.5">⚡ Deploy Patrol Unit Alpha to Silk Board</p>
                        <p className="border-l border-green/40 pl-1.5">⚡ Retime signal JP Nagar (Peak 18:00)</p>
                      </div>
                      <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider">Enforcement insights</span>
                    </div>
                  </motion.div>
                )}

                {generatingState === 'generating' && (
                  <motion.div
                    key="generating-animation"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center text-center gap-6"
                  >
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      {/* Animated outer ring */}
                      <div className="absolute inset-0 border-2 border-dashed border-lime/30 rounded-full animate-spin [animation-duration:8s]" />
                      {/* Animated middle ring */}
                      <div className="absolute inset-2 border border-dotted border-lime/50 rounded-full animate-spin [animation-duration:4s] [animation-direction:reverse]" />
                      {/* Central pulsing core */}
                      <div className="w-14 h-14 rounded-full bg-lime/10 border border-lime shadow-[0_0_30px_rgba(163,255,18,0.4)] flex items-center justify-center animate-pulse">
                        <span className="text-xl">🛠️</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-display font-bold text-lg text-platinum">Assembling Analytics Data</p>
                      <p className="font-mono text-xs text-text-muted mt-1 uppercase tracking-widest">
                        Rendering pages • Processing {selectedZones.length} zones
                      </p>
                    </div>
                  </motion.div>
                )}

                {generatingState === 'success' && (
                  <motion.div
                    key="success-preview"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center justify-center text-center gap-5 p-4"
                  >
                    {/* Success badge */}
                    <div className="w-20 h-20 rounded-full bg-green/10 border border-green shadow-[0_0_40px_rgba(34,197,94,0.3)] flex items-center justify-center text-3xl text-green relative">
                      ✓
                      {/* Spark particles around checkmark (simulated) */}
                      <div className="absolute w-2 h-2 rounded-full bg-green -top-2 left-6 animate-ping" />
                      <div className="absolute w-1.5 h-1.5 rounded-full bg-green top-12 -left-2 animate-ping" />
                      <div className="absolute w-2 h-2 rounded-full bg-green top-14 left-16 animate-ping" />
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-xl text-platinum uppercase tracking-wide">
                        Report Compiled Successfully
                      </h3>
                      <p className="font-mono text-xs text-text-secondary mt-1 border-t border-border/30 pt-2.5 max-w-sm mx-auto">
                        <span className="text-text-muted">FILENAME:</span> gridlock_enforcement_rep_{reportType}_{startDate}.pdf
                      </p>
                      <p className="font-mono text-xs text-text-muted mt-1">
                        <span className="text-text-muted">SIZE:</span> 2.4 MB • <span className="text-text-muted">PAGES:</span> 4 • <span className="text-text-muted">HASH:</span> SHA-256/9A4F
                      </p>
                    </div>

                    <button
                      onClick={mockDownload}
                      className="px-6 py-2.5 rounded-lg font-display font-bold text-sm bg-lime text-bg-primary hover:shadow-[0_0_20px_rgba(163,255,18,0.3)] transition-all"
                    >
                      💾 SAVE TO LOCALDISK
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── REPORT HISTORY / ARCHIVE ── */}
          <div className="glass-panel p-6 hud-corner relative space-y-4">
            <h2 className="text-text-secondary font-display font-semibold text-lg tracking-wider border-b border-border/30 pb-3 flex items-center gap-2">
              <span>🗄️</span> ARCHIVED REPORTS HISTORY
            </h2>

            <div className="space-y-3">
              {PAST_REPORTS.map((report, i) => (
                <div
                  key={report.id}
                  className="glass-card p-4 hover:border-border-bright transition-all duration-300 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {/* Document Icon */}
                    <div className="w-10 h-10 rounded-lg bg-bg-secondary/70 border border-border flex items-center justify-center text-lg text-platinum shadow-inner">
                      📄
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-sm text-platinum tracking-wide">
                        {report.title}
                      </h4>
                      <p className="font-mono text-[10px] text-text-muted mt-0.5">
                        {report.date} • {report.type.toUpperCase()} • {report.size}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      alert(`Downloading archived report: ${report.title}`)
                    }}
                    className="shrink-0 w-8 h-8 rounded-lg bg-bg-secondary hover:bg-lime/10 border border-border hover:border-lime/30 flex items-center justify-center text-xs text-text-secondary hover:text-lime transition-all duration-200"
                    title="Download Archive"
                  >
                    ⬇️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
