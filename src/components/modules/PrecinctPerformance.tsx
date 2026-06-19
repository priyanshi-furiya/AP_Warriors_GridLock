import { useMemo } from 'react'
import { motion } from 'motion/react'
import useLiveFeed from '@/hooks/useLiveFeed'
import { useAppStore } from '@/stores/appStore'
import { useDataStore } from '@/stores/dataStore'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
} from 'recharts'

export default function PrecinctPerformance() {
  const stationsData = useDataStore((s) => s.stations)
  const demoMode = useAppStore((s) => (s as any).demoMode)
  const feed = useLiveFeed()
  const { scatterData, topPerformers, worstPerformers } = useMemo(() => {
    // Sort stations by approval rate for rankings
    const sorted = [...stationsData].sort((a, b) => b.approvalRate - a.approvalRate)

    const top = sorted.filter((s) => s.totalViolations > 1000).slice(0, 3)
    const worst = sorted.filter((s) => s.totalViolations > 1000).reverse().slice(0, 3)

    const sData = stationsData.map((station) => ({
      name: station.name,
      approvalRate: station.approvalRate,
      volume: station.totalViolations,
      rejected: station.rejectedCount,
      // For bubble size
      z: station.totalViolations,
    }))

    return { scatterData: sData, topPerformers: top, worstPerformers: worst }
  }, [])

  const getBubbleColor = (approvalRate: number) => {
    if (approvalRate >= 75) return '#A3FF12' // Lime
    if (approvalRate >= 65) return '#FBBF24' // Amber
    return '#DC2626' // Red
  }

  return (
    <div className="relative w-full bg-bg-primary p-6 lg:p-10 overflow-y-auto" style={{ minHeight: 'calc(100vh - 3rem)' }}>
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <p className="text-text-muted text-xs tracking-[0.3em] uppercase font-mono mb-1">
          Module 11
        </p>
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-platinum">
          Precinct <span className="text-gradient-lime">Performance</span>
        </h1>
        <p className="text-text-secondary text-sm mt-1 max-w-md">
          Station leaderboard evaluating citation volume versus approval accuracy.
        </p>
        {demoMode && (
          <div className="mt-3 text-xs font-mono text-text-muted">Live events: <span className="text-lime font-bold">{feed.currentEvents.length}</span></div>
        )}
      </motion.div>

      {/* Leaderboards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Performers */}
        <motion.div
          className="glass-panel p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold tracking-wide text-platinum uppercase">Highest Accuracy</h3>
            <span className="text-xs text-lime bg-lime/10 px-2 py-1 rounded-md font-mono border border-lime/20">
              TOP 3
            </span>
          </div>
          <div className="space-y-4">
            {topPerformers.map((station, i) => (
              <div key={station.name} className="flex items-center gap-4 bg-white/5 p-4 rounded-lg border border-white/5">
                <div className="w-8 h-8 rounded-full bg-lime/20 flex items-center justify-center text-lime font-bold">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-platinum text-sm font-medium">{station.name}</h4>
                  <p className="text-xs text-text-secondary">{station.totalViolations.toLocaleString()} total citations</p>
                </div>
                <div className="text-right">
                  <div className="text-lime font-mono text-lg font-bold">{station.approvalRate}%</div>
                  <div className="text-[10px] text-text-muted uppercase">Approval Rate</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Worst Performers */}
        <motion.div
          className="glass-panel p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold tracking-wide text-platinum uppercase">Highest Rejections</h3>
            <span className="text-xs text-red-500 bg-red-500/10 px-2 py-1 rounded-md font-mono border border-red-500/20">
              BOTTOM 3
            </span>
          </div>
          <div className="space-y-4">
            {worstPerformers.map((station, i) => (
              <div key={station.name} className="flex items-center gap-4 bg-white/5 p-4 rounded-lg border border-white/5">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-bold">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-platinum text-sm font-medium">{station.name}</h4>
                  <p className="text-xs text-text-secondary">{station.rejectedCount.toLocaleString()} false positives</p>
                </div>
                <div className="text-right">
                  <div className="text-red-500 font-mono text-lg font-bold">{station.approvalRate}%</div>
                  <div className="text-[10px] text-text-muted uppercase">Approval Rate</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Main Scatter Plot Matrix */}
      <motion.div
        className="glass-panel p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h3 className="text-sm font-semibold tracking-wide text-platinum uppercase mb-2">Performance Matrix</h3>
        <p className="text-xs text-text-secondary mb-6">
          Volume of citations vs. Approval accuracy. Larger bubbles indicate more citations.
        </p>
        
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                type="number" 
                dataKey="volume" 
                name="Volume" 
                stroke="#6B7280" 
                tickFormatter={(v) => `${v / 1000}k`}
                domain={['auto', 'auto']}
              />
              <YAxis 
                type="number" 
                dataKey="approvalRate" 
                name="Approval Rate" 
                unit="%" 
                stroke="#6B7280" 
                domain={[50, 100]}
              />
              <ZAxis type="number" dataKey="z" range={[50, 400]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', borderColor: 'rgba(255,255,255,0.1)' }}
                formatter={((value: any, name: any) => {
                  const numericValue = Number(value ?? 0)
                  if (name === 'Volume') return [numericValue.toLocaleString(), 'Total Citations']
                  if (name === 'Approval Rate') return [`${numericValue}%`, 'Accuracy']
                  return numericValue
                }) as any}
                labelFormatter={() => ''}
              />
              <Scatter name="Stations" data={scatterData}>
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBubbleColor(entry.approvalRate)} fillOpacity={0.7} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  )
}
