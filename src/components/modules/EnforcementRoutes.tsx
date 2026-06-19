import { useState, useEffect, useMemo } from 'react'
import useLiveFeed from '@/hooks/useLiveFeed'
import { useAppStore } from '@/stores/appStore'
import { motion, AnimatePresence } from 'motion/react'
import { type PatrolRoute } from '@/data/zones'
import { getSeverityColor } from '@/data/hotspots'
import { useDataStore } from '@/stores/dataStore'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

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

function MapAutoCenter({ bounds }: { bounds: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds as any, { padding: [50, 50], maxZoom: 14 })
    }
  }, [bounds, map])
  return null
}

/* ── Main Component ── */
export default function EnforcementRoutes() {
  const hotspots = useDataStore((s) => s.hotspots)
  const patrolRoutes = useDataStore((s) => s.patrolRoutes)
  const demoMode = useAppStore((s) => (s as any).demoMode)
  const feed = useLiveFeed()
  const liveCount = demoMode ? feed.currentEvents.length : 0
  const [selectedRouteId, setSelectedRouteId] = useState(patrolRoutes[0].id)
  const [routeGeometries, setRouteGeometries] = useState<Record<string, [number, number][]>>({})

  // Inject actual coordinates into routes
  const routesWithCoords = useMemo(() => {
    return patrolRoutes.map(route => {
      const coords = route.hotspots.map(hName => {
        const hs = hotspots.find(h => h.name === hName)
        return hs ? [hs.lat, hs.lng] as [number, number] : null
      }).filter(Boolean) as [number, number][]
      return { ...route, coords }
    })
  }, [])

  const selectedRoute = useMemo(
    () => routesWithCoords.find((r) => r.id === selectedRouteId) ?? routesWithCoords[0],
    [selectedRouteId, routesWithCoords],
  )

  useEffect(() => {
    // Fetch realistic roads for all routes
    routesWithCoords.forEach(async (route) => {
      try {
        const coordString = route.coords.map(c => `${c[1]},${c[0]}`).join(';')
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`)
        const data = await res.json()
        if (data.code === 'Ok') {
          const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]])
          setRouteGeometries(prev => ({ ...prev, [route.id]: coords }))
        }
      } catch (err) {
        console.error("OSRM fetch failed", err)
      }
    })
  }, [routesWithCoords])

  // Resolve hotspot severity for route's hotspots
  const coveredHotspots = useMemo(
    () =>
      selectedRoute.hotspots.map((name) => {
        const hs = hotspots.find((h) => h.name === name)
        return { name, severity: hs?.severity ?? 50, violationCount: hs?.violationCount ?? 0, lat: hs?.lat ?? 12.97, lng: hs?.lng ?? 77.59 }
      }),
    [selectedRoute],
  )

  const totalCoverage = Math.round(
    routesWithCoords.reduce((s, r) => s + r.coverage, 0) / routesWithCoords.length,
  )
  const combinedRevenue = routesWithCoords.reduce((s, r) => s + r.predictedRevenue, 0)
  const activeUnits = routesWithCoords.length

  const formatRevenue = (v: number) => `₹${(v / 100000).toFixed(1)}L`
  const BANGALORE_CENTER: [number, number] = [12.9716, 77.5946]

  return (
    <div className="w-full flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>
      {/* ── Top ── */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        {/* ── Leaflet Route Map ── */}
        <div className="flex-1 relative p-4 min-h-[400px]">
          <div className="glass-panel w-full h-full relative overflow-hidden rounded-xl">
            <MapContainer
              center={BANGALORE_CENTER}
              zoom={12}
              style={{ width: '100%', height: '100%' }}
              className="rounded-xl z-0"
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />
              
              {/* Other inactive routes */}
              {routesWithCoords.map((route) => {
                if (route.id === selectedRouteId) return null
                const positions = routeGeometries[route.id] || route.coords
                return (
                  <Polyline 
                    key={route.id}
                    positions={positions}
                    color={route.color}
                    weight={3}
                    opacity={0.3}
                    dashArray="5, 10"
                  />
                )
              })}

              {/* Active Route Glow */}
              <Polyline 
                positions={routeGeometries[selectedRoute.id] || selectedRoute.coords}
                color={selectedRoute.color}
                weight={8}
                opacity={0.2}
              />
              {/* Active Route Main */}
              <Polyline 
                positions={routeGeometries[selectedRoute.id] || selectedRoute.coords}
                color={selectedRoute.color}
                weight={4}
                opacity={1}
                dashArray="10, 10"
                className="animate-[dash_20s_linear_infinite]"
              />

              {/* Route Markers */}
              {selectedRoute.coords.map((coord, i) => (
                <CircleMarker
                  key={`marker-${i}`}
                  center={coord}
                  radius={6}
                  pathOptions={{
                    color: '#1a1a1a',
                    fillColor: selectedRoute.color,
                    fillOpacity: 1,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'monospace', color: '#1a1a1a' }}>
                      <strong>{selectedRoute.hotspots[i]}</strong>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

              <MapAutoCenter bounds={selectedRoute.coords} />
            </MapContainer>

            {/* Map legend */}
            <div className="absolute bottom-4 left-4 z-[1000] glass-card p-3 flex flex-wrap gap-4 text-xs text-text-secondary pointer-events-none">
              {routesWithCoords.map((r) => (
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
          className="w-full xl:w-[380px] shrink-0 p-4 xl:pl-0 flex flex-col gap-4 overflow-y-auto"
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
            {routesWithCoords.map((route) => (
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
                  <span className="font-display font-bold text-platinum text-lg">
                    {selectedRoute.coverage}% Optimal
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    Dynamic pathing applied
                  </span>
                </div>
              </div>

              {/* Stops list */}
              <div>
                <h4 className="text-[10px] uppercase tracking-widest text-text-muted mb-3">
                  Designated Stops
                </h4>
                <div className="flex flex-col gap-2">
                  {coveredHotspots.map((hs, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-text-secondary" />
                      <span className="text-platinum flex-1 truncate">{hs.name}</span>
                      <span
                        className="font-mono text-xs px-2 py-0.5 rounded"
                        style={{
                          color: getSeverityColor(hs.severity),
                          backgroundColor: `${getSeverityColor(hs.severity)}15`,
                        }}
                      >
                        {hs.violationCount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Bottom Stats ── */}
      <motion.div
        className="shrink-0 p-4 pt-0"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="glass-panel p-4 flex flex-wrap gap-x-12 gap-y-4 justify-around items-center">
          <div className="flex flex-col gap-1 text-center">
            <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
              Active Units
            </span>
            <FlipCounter value={String(activeUnits).padStart(2, '0')} />
          </div>
          <div className="w-px h-10 bg-[rgba(255,255,255,0.06)]" />
          <div className="flex flex-col gap-1 text-center">
            <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
              Avg Coverage
            </span>
            <FlipCounter value={`${totalCoverage}`} />
          </div>
          <div className="w-px h-10 bg-[rgba(255,255,255,0.06)]" />
          <div className="flex flex-col gap-1 text-center">
            <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
              Predicted Recovery
            </span>
            <span className="font-mono text-2xl font-bold glow-text-lime text-lime">
              {formatRevenue(combinedRevenue)}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
