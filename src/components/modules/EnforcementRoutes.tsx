import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { patrolRoutes, type PatrolRoute } from '@/data/zones'
import { hotspots, getSeverityColor } from '@/data/hotspots'

/* ── SVG road network (simplified Bangalore grid) ── */
const roadPaths = [
  // Main arteries
  'M 80,50 L 80,550',    // North-South spine
  'M 50,200 L 550,200',  // East-West arterial
  'M 50,350 L 550,350',  // Second E-W
  'M 250,50 L 250,550',  // Second N-S
  'M 420,50 L 420,550',  // Third N-S
  // Diagonals
  'M 50,50 L 300,300',
  'M 550,50 L 300,300',
  'M 300,300 L 50,550',
  'M 300,300 L 550,550',
  // Ring road
  'M 120,100 Q 50,300 120,500 Q 300,580 480,500 Q 550,300 480,100 Q 300,20 120,100',
  // Inner connectors
  'M 150,150 L 450,150',
  'M 150,450 L 450,450',
  'M 150,150 L 150,450',
  'M 450,150 L 450,450',
]

/* ── Convert 3D waypoints to 2D SVG coords ── */
function waypointToSVG(wp: [number, number, number]): [number, number] {
  // Map world coords roughly: x [-6,6] -> [50,550], z [-5,6] -> [50,550]
  const x = ((wp[0] + 6) / 12) * 500 + 50
  const y = ((wp[2] + 5) / 11) * 500 + 50
  return [x, y]
}

function hotspotToSVG(pos: [number, number, number]): [number, number] {
  const x = ((pos[0] + 6) / 12) * 500 + 50
  const y = ((pos[2] + 5) / 11) * 500 + 50
  return [x, y]
}

function waypointsToPath(waypoints: [number, number, number][]): string {
  const pts = waypoints.map(waypointToSVG)
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    // Smooth curves between points
    if (i < pts.length - 1) {
      const cpx = (pts[i][0] + pts[i + 1][0]) / 2
      const cpy = (pts[i][1] + pts[i + 1][1]) / 2
      d += ` Q ${pts[i][0]},${pts[i][1]} ${cpx},${cpy}`
    } else {
      d += ` L ${pts[i][0]},${pts[i][1]}`
    }
  }
  return d
}

/* ── Circular Gauge ── */
function CoverageGauge({ value, color }: { value: number; color: string }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg width="96" height="96" viewBox="0 0 96 96" className="rotate-[-90deg]">
        <circle
          cx="48" cy="48" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="5"
        />
        <motion.circle
          cx="48" cy="48" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
        />
      </svg>
      <span
        className="absolute font-mono text-lg font-bold"
        style={{ color }}
      >
        {value}%
      </span>
    </div>
  )
}

/* ── FlipCounter ── */
function FlipCounter({ value }: { value: string }) {
  return (
    <div className="flex gap-0.5">
      {value.split('').map((char, i) => (
        <motion.span
          key={`${i}-${char}`}
          className="font-mono text-2xl font-bold text-lime inline-block"
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: i * 0.06 }}
          style={{ textShadow: '0 0 12px rgba(163,255,18,0.5)' }}
        >
          {char}
        </motion.span>
      ))}
    </div>
  )
}

/* ── Animated dot along path ── */
function AnimatedDot({ pathId, color, duration }: { pathId: string; color: string; duration: number }) {
  return (
    <>
      <circle r="5" fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
        <animateMotion
          dur={`${duration}s`}
          repeatCount="indefinite"
          rotate="auto"
        >
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>
      <circle r="10" fill={color} opacity="0.2">
        <animateMotion
          dur={`${duration}s`}
          repeatCount="indefinite"
          rotate="auto"
        >
          <mpath href={`#${pathId}`} />
        </animateMotion>
        <animate attributeName="r" values="6;14;6" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.05;0.3" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </>
  )
}

/* ── Route Card ── */
function RouteCard({
  route,
  isSelected,
  onSelect,
}: {
  route: PatrolRoute
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <motion.button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg transition-all duration-300 border ${
        isSelected
          ? 'border-border-bright bg-[rgba(163,255,18,0.06)]'
          : 'border-transparent bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)]'
      }`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{
            backgroundColor: route.color,
            boxShadow: isSelected ? `0 0 12px ${route.color}80` : 'none',
          }}
        />
        <span className="font-display font-semibold text-sm text-platinum">
          {route.name}
        </span>
        <span className="ml-auto font-mono text-xs text-text-muted">
          {route.estimatedTime}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-text-secondary">
          {route.hotspots.length} hotspots
        </span>
        <span className="text-text-muted text-xs">•</span>
        <span className="font-mono text-xs" style={{ color: route.color }}>
          {route.coverage}% coverage
        </span>
      </div>
    </motion.button>
  )
}

/* ── Main Component ── */
export default function EnforcementRoutes() {
  const [selectedRouteId, setSelectedRouteId] = useState(patrolRoutes[0].id)
  const [isAnimated, setIsAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const selectedRoute = useMemo(
    () => patrolRoutes.find((r) => r.id === selectedRouteId) ?? patrolRoutes[0],
    [selectedRouteId],
  )

  // Resolve hotspot severity for route's hotspots
  const coveredHotspots = useMemo(
    () =>
      selectedRoute.hotspots.map((name) => {
        const hs = hotspots.find((h) => h.name === name)
        return { name, severity: hs?.severity ?? 50, violationCount: hs?.violationCount ?? 0 }
      }),
    [selectedRoute],
  )

  const totalCoverage = Math.round(
    patrolRoutes.reduce((s, r) => s + r.coverage, 0) / patrolRoutes.length,
  )
  const combinedRevenue = patrolRoutes.reduce((s, r) => s + r.predictedRevenue, 0)
  const activeUnits = patrolRoutes.length

  const formatRevenue = (v: number) => `₹${(v / 100000).toFixed(1)}L`

  return (
    <div className="w-full h-full flex flex-col">
      {/* ── Top ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── SVG Route Map ── */}
        <div className="flex-1 relative p-4">
          <div className="glass-panel w-full h-full relative overflow-hidden">
            {/* Subtle grid */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(163,255,18,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(163,255,18,0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            <svg
              viewBox="0 0 600 600"
              className="w-full h-full"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              <defs>
                {/* Route path definitions for animateMotion */}
                {patrolRoutes.map((route) => (
                  <path
                    key={`def-${route.id}`}
                    id={`route-path-${route.id}`}
                    d={waypointsToPath(route.waypoints)}
                    fill="none"
                  />
                ))}
              </defs>

              {/* Road network */}
              {roadPaths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ))}

              {/* Patrol routes */}
              {patrolRoutes.map((route) => {
                const pathD = waypointsToPath(route.waypoints)
                const isActive = route.id === selectedRouteId
                return (
                  <g key={route.id} style={{ opacity: isActive ? 1 : 0.4 }}>
                    {/* Glow under */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={route.color}
                      strokeWidth={isActive ? 6 : 3}
                      strokeLinecap="round"
                      opacity={0.15}
                      style={{ filter: `blur(6px)` }}
                    />
                    {/* Main line with dash animation */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={route.color}
                      strokeWidth={isActive ? 3 : 1.5}
                      strokeLinecap="round"
                      strokeDasharray="12 6"
                      style={{
                        strokeDashoffset: isAnimated ? 0 : 1000,
                        transition: 'stroke-dashoffset 2s ease-out',
                      }}
                    />
                    {/* Animated moving dot */}
                    <AnimatedDot
                      pathId={`route-path-${route.id}`}
                      color={route.color}
                      duration={isActive ? 4 : 6}
                    />
                    {/* Waypoint dots */}
                    {route.waypoints.map((wp, wi) => {
                      const [sx, sy] = waypointToSVG(wp)
                      return (
                        <circle
                          key={wi}
                          cx={sx}
                          cy={sy}
                          r={wi === 0 || wi === route.waypoints.length - 1 ? 4 : 2.5}
                          fill={route.color}
                          opacity={0.7}
                        />
                      )
                    })}
                  </g>
                )
              })}

              {/* Hotspot markers */}
              {hotspots.slice(0, 12).map((hs) => {
                const [sx, sy] = hotspotToSVG(hs.position)
                const color = getSeverityColor(hs.severity)
                const isOnRoute = selectedRoute.hotspots.includes(hs.name)
                return (
                  <g key={hs.id}>
                    {/* Pulse ring for on-route hotspots */}
                    {isOnRoute && (
                      <circle cx={sx} cy={sy} r="12" fill="none" stroke={color} strokeWidth="1" opacity="0.4">
                        <animate attributeName="r" values="8;18;8" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle
                      cx={sx}
                      cy={sy}
                      r={isOnRoute ? 6 : 4}
                      fill={color}
                      opacity={isOnRoute ? 1 : 0.5}
                      style={{ filter: isOnRoute ? `drop-shadow(0 0 6px ${color})` : 'none' }}
                    />
                    {isOnRoute && (
                      <text
                        x={sx}
                        y={sy - 12}
                        textAnchor="middle"
                        fill="rgba(229,231,235,0.8)"
                        fontSize="8"
                        fontFamily="Inter"
                      >
                        {hs.name}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Map legend */}
            <div className="absolute bottom-4 left-4 glass-card p-3 flex gap-4 text-xs text-text-secondary">
              {patrolRoutes.map((r) => (
                <div key={r.id} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: r.color }}
                  />
                  <span>{r.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <motion.div
          className="w-[380px] shrink-0 p-4 pl-0 flex flex-col gap-4 overflow-y-auto"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* AI badge */}
          <div className="flex items-center gap-2 px-1">
            <div
              className="px-3 py-1 rounded-full text-xs font-semibold font-mono text-lime border border-lime/20"
              style={{
                boxShadow: '0 0 16px rgba(163,255,18,0.15), 0 0 4px rgba(163,255,18,0.3)',
                background: 'rgba(163,255,18,0.06)',
              }}
            >
              ⚡ AI OPTIMIZED
            </div>
            <span className="text-text-muted text-xs">Routes auto-generated</span>
          </div>

          {/* Route selector */}
          <div className="glass-panel p-4 flex flex-col gap-2">
            <h3 className="font-display text-xs uppercase tracking-widest text-text-muted mb-2">
              Patrol Routes
            </h3>
            {patrolRoutes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                isSelected={route.id === selectedRouteId}
                onSelect={() => setSelectedRouteId(route.id)}
              />
            ))}
          </div>

          {/* Selected route detail */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRouteId}
              className="glass-panel p-5 flex flex-col gap-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.06)] pb-4">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: selectedRoute.color,
                    boxShadow: `0 0 10px ${selectedRoute.color}60`,
                  }}
                />
                <div>
                  <h3 className="font-display font-semibold text-platinum text-lg">
                    {selectedRoute.name}
                  </h3>
                  <span className="font-mono text-xs text-text-muted">
                    EST. {selectedRoute.estimatedTime}
                  </span>
                </div>
              </div>

              {/* Coverage gauge */}
              <div className="flex items-center gap-6">
                <CoverageGauge value={selectedRoute.coverage} color={selectedRoute.color} />
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-text-muted uppercase tracking-wider">
                    Coverage
                  </span>
                  <span className="font-mono text-sm text-text-secondary">
                    {selectedRoute.hotspots.length} hotspots covered
                  </span>
                </div>
              </div>

              {/* Covered hotspots */}
              <div>
                <span className="text-xs text-text-muted uppercase tracking-wider block mb-2">
                  Covered Hotspots
                </span>
                <div className="flex flex-col gap-1.5">
                  {coveredHotspots.map((hs) => (
                    <div
                      key={hs.name}
                      className="flex items-center gap-2 px-3 py-2 rounded-md bg-[rgba(255,255,255,0.03)]"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getSeverityColor(hs.severity) }}
                      />
                      <span className="text-sm text-text-secondary flex-1">{hs.name}</span>
                      <span className="font-mono text-xs text-text-muted">
                        {hs.violationCount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Predicted revenue */}
              <div className="border-t border-[rgba(255,255,255,0.06)] pt-4">
                <span className="text-xs text-text-muted uppercase tracking-wider block mb-2">
                  Predicted Revenue
                </span>
                <FlipCounter value={formatRevenue(selectedRoute.predictedRevenue)} />
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Bottom Metrics Bar ── */}
      <motion.div
        className="h-[72px] shrink-0 mx-4 mb-4 glass-panel flex items-center justify-around px-8"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {[
          { label: 'Total Coverage', value: `${totalCoverage}%`, color: '#A3FF12' },
          { label: 'Combined Revenue', value: formatRevenue(combinedRevenue), color: '#FBBF24' },
          { label: 'Active Units', value: String(activeUnits), color: '#FF6B35' },
          { label: 'Routes Active', value: `${patrolRoutes.length}/3`, color: '#E5E7EB' },
        ].map((m) => (
          <div key={m.label} className="flex flex-col items-center gap-1">
            <span className="text-[10px] uppercase tracking-widest text-text-muted">
              {m.label}
            </span>
            <span
              className="font-mono text-xl font-bold"
              style={{ color: m.color, textShadow: `0 0 10px ${m.color}40` }}
            >
              {m.value}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
