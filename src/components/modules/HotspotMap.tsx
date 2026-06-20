import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAppStore } from '@/stores/appStore'
import { getSeverityColor, getSeverityLevel } from '@/data/hotspots'
import type { Hotspot } from '@/data/hotspots'
import { useDataStore } from '@/stores/dataStore'
import useLiveFeed from '@/hooks/useLiveFeed'

// ─── Types ───────────────────────────────────────────
type TimeRange = '1H' | '6H' | '24H' | '7D'
type SeverityFilter = 'critical' | 'medium' | 'low'

// ─── Severity Bar ────────────────────────────────────
function SeverityBar({ severity }: { severity: number }) {
  const color = getSeverityColor(severity)
  return (
    <div className="relative h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${severity}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}

// ─── Intelligence Panel ──────────────────────────────
function IntelligencePanel({ hotspot }: { hotspot: Hotspot }) {
  const color = getSeverityColor(hotspot.severity)
  const mix = hotspot.vehicleMix
  const total = mix.cars + mix.scooters + mix.autos + mix.trucks + mix.buses

  const vehicleData = [
    { label: 'Cars', value: mix.cars, color: '#A3FF12' },
    { label: 'Scooters', value: mix.scooters, color: '#FF6B35' },
    { label: 'Autos', value: mix.autos, color: '#FBBF24' },
    { label: 'Trucks', value: mix.trucks, color: '#DC2626' },
    { label: 'Buses', value: mix.buses, color: '#22C55E' },
  ]

  const trend = hotspot.trend
  const maxT = Math.max(...trend)
  const minT = Math.min(...trend)
  const range = maxT - minT || 1
  const points = trend.map((v, i) => {
    const x = (i / (trend.length - 1)) * 200
    const y = 40 - ((v - minT) / range) * 36
    return `${x},${y}`
  })
  const sparklinePath = `M${points.join(' L')}`

  return (
    <motion.div
      className="glass-panel p-5 flex flex-col gap-4"
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-platinum text-base font-semibold tracking-wide">
            {hotspot.name}
          </h3>
          <span className="text-text-secondary text-xs font-mono">{hotspot.zone}</span>
        </div>
        <div
          className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold"
          style={{
            backgroundColor: `${color}20`,
            color: color,
            border: `1px solid ${color}40`,
          }}
        >
          {hotspot.severity}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-3 rounded-lg">
          <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1">Violations</p>
          <p className="font-mono text-lg text-platinum font-semibold">
            {hotspot.violationCount.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-3 rounded-lg">
          <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1">Peak Hours</p>
          <p className="font-mono text-sm text-platinum font-medium">{hotspot.peakHours}</p>
        </div>
      </div>

      <div>
        <p className="text-text-muted text-[10px] uppercase tracking-widest mb-2">Vehicle Mix</p>
        <div className="flex h-3 rounded-full overflow-hidden gap-px">
          {vehicleData.map((v) => (
            <motion.div
              key={v.label}
              className="rounded-sm"
              style={{ backgroundColor: v.color }}
              initial={{ flex: 0 }}
              animate={{ flex: v.value / total }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {vehicleData.map((v) => (
            <span key={v.label} className="flex items-center gap-1 text-[10px] text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: v.color }} />
              {v.label} {v.value}%
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-text-muted text-[10px] uppercase tracking-widest mb-2">7-Day Trend</p>
        <svg viewBox="0 0 200 44" className="w-full h-10">
          <defs>
            <linearGradient id={`spark-grad-${hotspot.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={`${sparklinePath} L200,44 L0,44 Z`} fill={`url(#spark-grad-${hotspot.id})`} />
          <path d={sparklinePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div>
        <p className="text-text-muted text-[10px] uppercase tracking-widest mb-2">Top Violations</p>
        <div className="flex flex-wrap gap-1.5">
          {hotspot.topViolations.map((v) => (
            <span
              key={v}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium border"
              style={{
                borderColor: `${color}30`,
                backgroundColor: `${color}10`,
                color: color,
              }}
            >
              {v}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Sidebar Item ────────────────────────────────────
function SidebarItem({
  hotspot,
  rank,
  isSelected,
  onSelect,
  index,
}: {
  hotspot: Hotspot
  rank: number
  isSelected: boolean
  onSelect: () => void
  index: number
}) {
  const color = getSeverityColor(hotspot.severity)

  return (
    <motion.button
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors duration-200 group relative
        ${isSelected ? 'bg-white/[0.06]' : 'bg-transparent hover:bg-white/[0.03]'}`}
      style={{
        borderLeft: isSelected ? `2px solid ${color}` : '2px solid transparent',
        boxShadow: isSelected ? `inset 0 0 30px ${color}08, 0 0 15px ${color}06` : 'none',
      }}
      onClick={onSelect}
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ x: 4 }}
    >
      <div className="flex items-center gap-3">
        <span
          className="font-mono text-xs font-bold w-6 text-center shrink-0"
          style={{ color: rank <= 3 ? color : '#6B7280' }}
        >
          {String(rank).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-platinum text-sm font-medium truncate pr-2">
              {hotspot.name}
            </span>
            <span className="font-mono text-xs font-semibold shrink-0" style={{ color }}>
              {hotspot.violationCount.toLocaleString()}
            </span>
          </div>
          <SeverityBar severity={hotspot.severity} />
        </div>
      </div>
    </motion.button>
  )
}

// ─── Map Auto-Center ─────────────────────────────────
function MapAutoCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  map.setView([lat, lng], map.getZoom())
  return null
}

// ─── Main Component ──────────────────────────────────
export default function HotspotMap() {
  const hotspots = useDataStore((s) => s.hotspots)
  const { selectedHotspotId, setSelectedHotspot } = useAppStore()
  const demoMode = useAppStore((s) => (s as any).demoMode)
  const feed = useLiveFeed()
  const [timeRange, setTimeRange] = useState<TimeRange>('24H')
  const [severityFilters, setSeverityFilters] = useState<Set<SeverityFilter>>(new Set())

  const timeRanges: TimeRange[] = ['1H', '6H', '24H', '7D']
  const severityOptions: { key: SeverityFilter; label: string; color: string }[] = [
    { key: 'critical', label: 'Critical', color: '#DC2626' },
    { key: 'medium', label: 'Medium', color: '#FBBF24' },
    { key: 'low', label: 'Low', color: '#22C55E' },
  ]

  const toggleSeverity = (s: SeverityFilter) => {
    setSeverityFilters((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const filteredHotspots = useMemo(() => {
    if (severityFilters.size === 0) return hotspots
    return hotspots.filter((h) => severityFilters.has(getSeverityLevel(h.severity)))
  }, [severityFilters, hotspots])

  const selectedHotspot = hotspots.find((h) => h.id === selectedHotspotId) || null

  // Bangalore center coordinates
  const BANGALORE_CENTER: [number, number] = [12.9716, 77.5946]

  return (
    <div className="w-full h-[calc(100vh-3rem)] p-4 flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <motion.div
        className="glass-panel px-4 py-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 shrink-0"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-text-muted">
            Bengaluru Traffic Violations
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-platinum mt-1">Bengaluru Hotspot Map</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-text-muted text-xs uppercase tracking-widest mr-2">Range</span>
            {timeRanges.map((t) => (
              <button
                key={t}
                className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all duration-200 ${
                  timeRange === t
                    ? 'bg-lime/15 text-lime border border-lime/25'
                    : 'text-text-secondary hover:text-platinum hover:bg-white/5 border border-transparent'
                }`}
                onClick={() => setTimeRange(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted text-xs uppercase tracking-widest mr-1">Severity</span>
            {severityOptions.map((s) => {
              const active = severityFilters.has(s.key)
              return (
                <button
                  key={s.key}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-200 border"
                  style={{
                    backgroundColor: active ? `${s.color}20` : 'transparent',
                    borderColor: active ? `${s.color}50` : 'rgba(255,255,255,0.08)',
                    color: active ? s.color : '#6B7280',
                  }}
                  onClick={() => toggleSeverity(s.key)}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_300px] gap-3 flex-1 min-h-0">
        {/* Sidebar Rankings */}
        <motion.div
          className="glass-panel flex flex-col overflow-hidden"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between shrink-0">
            <h2 className="font-display text-base font-semibold text-platinum tracking-wide uppercase">
              Hotspot Rankings
            </h2>
            <span className="font-mono text-xs text-lime bg-lime/10 px-2 py-0.5 rounded-full">
              {filteredHotspots.length} active
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {filteredHotspots.map((hotspot, i) => (
              <SidebarItem
                key={hotspot.id}
                hotspot={hotspot}
                rank={i + 1}
                isSelected={selectedHotspotId === hotspot.id}
                onSelect={() => setSelectedHotspot(selectedHotspotId === hotspot.id ? null : hotspot.id)}
                index={i}
              />
            ))}
          </div>
        </motion.div>

        {/* Leaflet Map */}
        <motion.div
          className="glass-panel relative overflow-hidden rounded-xl"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.15 }}
        >
          <MapContainer
            center={BANGALORE_CENTER}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            className="rounded-xl"
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {filteredHotspots.map((hotspot) => {
              const color = getSeverityColor(hotspot.severity)
              const isSelected = hotspot.id === selectedHotspotId
              return (
                <CircleMarker
                  key={hotspot.id}
                  center={[hotspot.lat, hotspot.lng]}
                  radius={isSelected ? 14 : 8 + hotspot.severity * 0.06}
                  pathOptions={{
                    color: isSelected ? '#E5E7EB' : color,
                    fillColor: color,
                    fillOpacity: 0.8,
                    weight: isSelected ? 2 : 1,
                  }}
                  eventHandlers={{
                    click: () => setSelectedHotspot(isSelected ? null : hotspot.id),
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'monospace', color: '#1a1a1a' }}>
                      <strong>{hotspot.name}</strong><br />
                      <span>Zone: {hotspot.zone}</span><br />
                      <span>Violations: {hotspot.violationCount.toLocaleString()}</span><br />
                      <span>Peak: {hotspot.peakHours}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
            {demoMode &&
              feed.currentEvents.map((e) => {
                const match = hotspots.find((h) => h.name === e.hotspot || h.id === e.hotspot)
                if (!match) return null
                const color = '#FF6B35'
                const radius = Math.max(8, Math.min(30, (e.impactScore ?? 10) / 2))
                return (
                  <CircleMarker
                    key={`live-${e.id}`}
                    center={[match.lat, match.lng]}
                    radius={radius}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.18, weight: 2 }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'monospace', color: '#1a1a1a' }}>
                        <strong>{e.violationType}</strong><br />
                        <span>{e.plateNumber}</span><br />
                        <span>{e.hotspot}</span>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            {selectedHotspot && (
              <MapAutoCenter lat={selectedHotspot.lat} lng={selectedHotspot.lng} />
            )}
          </MapContainer>

          <div className="absolute bottom-4 left-4 z-[1000] glass-card px-4 py-3 flex items-center gap-4 pointer-events-none">
            {[
              { label: 'Critical', color: '#DC2626' },
              { label: 'Medium', color: '#FBBF24' },
              { label: 'Low', color: '#22C55E' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-text-secondary text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Intelligence Panel */}
        <AnimatePresence mode="wait">
          {selectedHotspot ? (
            <motion.div
              key={selectedHotspot.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.3 }}
              className="overflow-y-auto"
            >
              <IntelligencePanel hotspot={selectedHotspot} />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="glass-panel p-5 flex flex-col justify-center"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
            >
              <span className="font-mono text-xs text-text-muted uppercase tracking-[0.25em]">
                No hotspot selected
              </span>
              <p className="text-text-secondary text-sm mt-2">
                Click any map marker or ranking row to inspect violation details, vehicle mix, peak window, and violation categories.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
