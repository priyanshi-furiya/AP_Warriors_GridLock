import { useMemo } from 'react'
import { motion } from 'motion/react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useDataStore } from '@/stores/dataStore'

const COLORS = ['#A3FF12', '#FBBF24', '#DC2626', '#FF6B35']

export default function EconomicsDashboard() {
  const violations = useDataStore((s) => s.violations)
  const { totalRevenue, potentialRevenue, statusChart, vehicleChart, topHotspots } = useMemo(() => {
    let totalRev = 0
    let potentialRev = 0
    const statusData: Record<string, number> = { Paid: 0, Pending: 0, Disputed: 0, Escalated: 0 }
    const vehicleData: Record<string, number> = {}
    const hotspotData: Record<string, number> = {}

    violations.forEach((v) => {
      potentialRev += v.fineAmount
      if (v.status === 'Paid') {
        totalRev += v.fineAmount
      }
      
      if (statusData[v.status] !== undefined) {
        statusData[v.status] += v.fineAmount
      } else {
        statusData[v.status] = v.fineAmount
      }

      vehicleData[v.vehicleType] = (vehicleData[v.vehicleType] || 0) + v.fineAmount
      hotspotData[v.location] = (hotspotData[v.location] || 0) + v.fineAmount
    })

    const sChart = Object.entries(statusData).map(([name, value]) => ({ name, value }))
    const vChart = Object.entries(vehicleData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const topH = Object.entries(hotspotData)
      .map(([location, revenue]) => ({ location, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return {
      totalRevenue: totalRev,
      potentialRevenue: potentialRev,
      statusChart: sChart,
      vehicleChart: vChart,
      topHotspots: topH,
    }
  }, [violations])

  const collectionRate = potentialRevenue > 0 ? ((totalRevenue / potentialRevenue) * 100).toFixed(1) : '0'

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
          Module 12
        </p>
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-platinum">
          Economics & <span className="text-gradient-lime">Revenue Tracker</span>
        </h1>
        <p className="text-text-secondary text-sm mt-1 max-w-md">
          Estimated financial impact of traffic enforcement based on standard Bangalore fine schedules.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          className="glass-panel p-6 border-l-4"
          style={{ borderColor: '#A3FF12' }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h3 className="text-text-muted text-xs uppercase tracking-widest mb-2">Collected Revenue</h3>
          <p className="text-3xl font-display font-bold text-lime">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-text-muted mt-1">*estimated from fine schedules</p>
        </motion.div>

        <motion.div
          className="glass-panel p-6 border-l-4"
          style={{ borderColor: '#FBBF24' }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-text-muted text-xs uppercase tracking-widest mb-2">Total Potential</h3>
          <p className="text-3xl font-display font-bold text-amber">₹{potentialRevenue.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-text-muted mt-1">*if all violations collected</p>
        </motion.div>

        <motion.div
          className="glass-panel p-6 border-l-4 border-white/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-text-muted text-xs uppercase tracking-widest mb-2">Collection Rate</h3>
          <p className="text-3xl font-display font-bold text-platinum">{collectionRate}%</p>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Distribution */}
        <motion.div
          className="glass-panel p-6 flex flex-col"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3 className="text-sm font-semibold tracking-wide text-platinum uppercase mb-6">Revenue by Status</h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', borderColor: 'rgba(255,255,255,0.1)' }}
                  itemStyle={{ color: '#E5E7EB' }}
                  formatter={((value: any) => `₹${Number(value ?? 0).toLocaleString('en-IN')}`) as any}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {statusChart.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs text-text-secondary">{entry.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Vehicle Class Revenue */}
        <motion.div
          className="glass-panel p-6 flex flex-col"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h3 className="text-sm font-semibold tracking-wide text-platinum uppercase mb-6">Revenue by Vehicle Class</h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleChart} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#6B7280" tickFormatter={(v) => `₹${v/1000}k`} />
                <YAxis dataKey="name" type="category" stroke="#6B7280" width={60} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', borderColor: 'rgba(255,255,255,0.1)' }}
                  formatter={((value: any) => `₹${Number(value ?? 0).toLocaleString('en-IN')}`) as any}
                />
                <Bar dataKey="value" fill="#A3FF12" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Top Generating Hotspots */}
      <motion.div
        className="glass-panel p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <h3 className="text-sm font-semibold tracking-wide text-platinum uppercase mb-6">Highest Revenue Locations</h3>
        <div className="space-y-4">
          {topHotspots.map((hotspot, index) => (
            <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-lime/10 flex items-center justify-center text-lime font-mono text-xs font-bold border border-lime/20">
                  {index + 1}
                </div>
                <div className="text-sm text-platinum font-medium truncate max-w-xs md:max-w-md">
                  {hotspot.location || 'Unknown Location'}
                </div>
              </div>
              <div className="font-mono text-lime font-bold">
                ₹{hotspot.revenue.toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
