import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import demoStreamData from '@/data/real/demo_stream.json'
import { useDataStore } from '@/stores/dataStore'
import useLiveFeed from '@/hooks/useLiveFeed'

type DemoEvent = {
  id: string
  timestamp: string
  station: string
  hotspot: string
  location: string
  vehicleClass: string
  violationType: string
  plateNumber: string
  parkingViolation: boolean
  congestionDelayMins: number
  highRisk: boolean
  impactScore: number
  privacyTags: string[]
  position: [number, number, number]
}

type AlertState = {
  station: string
  hotspot: string
  delay: number
  parkingCount: number
  route: string
}

type QueryKey = 'delay' | 'privacy' | 'route' | 'status'

const demoStreamMeta = {
  generatedAt: (demoStreamData as any).generatedAt,
  windowSize: (demoStreamData as any).windowSize,
  delayThresholdMins: (demoStreamData as any).delayThresholdMins,
  parkingThreshold: (demoStreamData as any).parkingThreshold,
}

const HEAT_LABELS = ['Awake', 'Tracking', 'Escalating', 'Dispatching']

function formatTime(timestamp: string) {
  const value = new Date(timestamp)
  return value.toLocaleString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  })
}

function severityColor(score: number) {
  if (score >= 80) return '#DC2626'
  if (score >= 55) return '#FF6B35'
  if (score >= 30) return '#FBBF24'
  return '#A3FF12'
}

function getQueryResponse(query: QueryKey, alert: AlertState | null, recent: DemoEvent[]) {
  if (query === 'delay') {
    const last = recent[recent.length - 1]
    return last ? `Current delay is ${last.congestionDelayMins} minutes at ${last.station}.` : 'No live events yet.'
  }
  if (query === 'privacy') {
    return 'Privacy Sentinel active: plate numbers are tokenized and non-violator identity data is redacted before the event enters the live stream.'
  }
  if (query === 'route') {
    return alert
      ? `Route rerouted toward ${alert.hotspot}. ${alert.route}`
      : 'No reroute required yet. Patrol routes are standing by.'
  }
  if (query === 'status') {
    return alert
      ? `Alert active at ${alert.station}. ${alert.parkingCount} parking events and ${alert.delay}-minute delay triggered an interruption.`
      : 'Monitoring live feed. No interruption threshold reached yet.'
  }
  return 'Ready.'
}

export default function ControlRoom() {
  const patrolRoutes = useDataStore((s) => s.patrolRoutes)
  const feed = useLiveFeed()
  const visibleCount = feed.index
  const events = feed.events as DemoEvent[]

  const [recentEvents, setRecentEvents] = useState<DemoEvent[]>([])
  const [selectedQuery, setSelectedQuery] = useState<QueryKey>('status')
  const [queryText, setQueryText] = useState('What is the current delay at the hotspot?')
  const [queryAnswer, setQueryAnswer] = useState('Monitoring live feed. No interruption threshold reached yet.')
  const [activeAlert, setActiveAlert] = useState<AlertState | null>(null)

  useEffect(() => {
    if (visibleCount === 0) return

    const nextEvents = events.slice(0, visibleCount)
    setRecentEvents(nextEvents.slice(-demoStreamMeta.windowSize))

    const lastEvent = nextEvents[nextEvents.length - 1]
    if (!lastEvent) return

    const windowEvents = nextEvents
      .slice(-demoStreamMeta.windowSize)
      .filter((event) => event.station === lastEvent.station)

    const parkingCount = windowEvents.filter((event) => event.parkingViolation).length
    const shouldInterrupt = lastEvent.congestionDelayMins >= demoStreamMeta.delayThresholdMins && parkingCount >= demoStreamMeta.parkingThreshold

    if (shouldInterrupt) {
      const selectedRoute = patrolRoutes.find((route) => route.hotspots.includes(lastEvent.hotspot)) ?? patrolRoutes[0]
      setActiveAlert({
        station: lastEvent.station,
        hotspot: lastEvent.hotspot,
        delay: lastEvent.congestionDelayMins,
        parkingCount,
        route: `${selectedRoute.name} rerouted to ${lastEvent.hotspot} with ${selectedRoute.hotspots.length} linked hotspots covered.`,
      })
    }
  }, [visibleCount, events, patrolRoutes])

  const liveStream = useMemo(() => events.slice(0, visibleCount), [events, visibleCount])
  const heatValue = useMemo(() => {
    const avg = liveStream.length
      ? liveStream.reduce((sum, event) => sum + event.impactScore, 0) / liveStream.length
      : 0
    return Math.round(avg)
  }, [liveStream])

  const stationCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const event of liveStream) {
      counts.set(event.station, (counts.get(event.station) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([station, count]) => ({ station, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [liveStream])

  const escalationPreview = useMemo(() => {
    const topStation = stationCounts[0]
    if (activeAlert || visibleCount < 6 || !topStation) return null

    const previewEvents = liveStream.filter((event) => event.station === topStation.station)
    const parkingCount = previewEvents.filter((event) => event.parkingViolation).length
    const peakDelay = previewEvents.reduce((max, event) => Math.max(max, event.congestionDelayMins), 0)

    return {
      station: topStation.station,
      parkingCount,
      delay: peakDelay,
      route: patrolRoutes[0].name,
    }
  }, [activeAlert, liveStream, stationCounts, visibleCount, patrolRoutes])

  const heatColor = severityColor(heatValue)
  const response = getQueryResponse(selectedQuery, activeAlert, liveStream)

  const handleRunQuery = () => {
    const normalized = queryText.toLowerCase()
    const key: QueryKey = normalized.includes('privacy')
      ? 'privacy'
      : normalized.includes('route')
        ? 'route'
        : normalized.includes('delay') || normalized.includes('current')
          ? 'delay'
          : 'status'
    setSelectedQuery(key)
    setQueryAnswer(getQueryResponse(key, activeAlert, liveStream))
  }

  return (
    <div className="w-full h-[calc(100vh-3rem)] bg-bg-primary p-5 lg:p-8 flex flex-col overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-2 shrink-0"
      >
        <span className="text-lime text-[10px] font-mono font-bold tracking-[0.3em] uppercase">
          Continuous Sensing Demo
        </span>
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-platinum">
          Control <span className="text-gradient-lime">Room</span>
        </h1>
        <p className="text-text-secondary text-sm max-w-2xl">
          A live CSV-to-stream simulation that keeps the interaction layer responsive while the background model aggregates heat, privacy, and dispatch signals.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5 flex-1 min-h-0">
        <div className="flex flex-col gap-5 overflow-y-auto xl:overflow-hidden">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-5 hud-corner shrink-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-text-muted text-[10px] uppercase tracking-[0.25em]">Live Stream</p>
                <h2 className="text-platinum font-semibold text-lg">Micro-turn ingestion</h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-lime animate-pulse-glow" />
                <span className="text-lime">{HEAT_LABELS[Math.min(3, Math.floor(visibleCount / Math.max(1, events.length / 4)))]}</span>
                <span className="text-text-muted">{visibleCount}/{events.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
              <div className="rounded-xl border border-border bg-bg-secondary/40 p-4 min-h-[260px] relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-45"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px),
                      radial-gradient(circle at 18% 20%, rgba(163,255,18,0.18), transparent 18%),
                      radial-gradient(circle at 76% 28%, rgba(255,107,53,0.16), transparent 16%),
                      radial-gradient(circle at 54% 74%, rgba(251,191,36,0.14), transparent 18%)
                    `,
                    backgroundSize: '32px 32px, 32px 32px, auto, auto, auto',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="absolute inset-x-4 top-4 z-20 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-text-muted text-[10px] uppercase tracking-[0.25em] block">Dynamic Heatmap</span>
                    <span className="font-mono text-xs" style={{ color: heatColor }}>Impact {heatValue}/100</span>
                  </div>
                  {activeAlert ? (
                    <div className="px-3 py-1.5 rounded-full border border-red/30 bg-red/10 text-red text-[10px] font-mono uppercase tracking-[0.25em]">
                      Alert active
                    </div>
                  ) : escalationPreview ? (
                    <div className="px-3 py-1.5 rounded-full border border-amber/30 bg-amber/10 text-amber text-[10px] font-mono uppercase tracking-[0.25em]">
                      Escalation building
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-full border border-lime/30 bg-lime/10 text-lime text-[10px] font-mono uppercase tracking-[0.25em]">
                      Continuous sensing
                    </div>
                  )}
                </div>

                <div className="absolute inset-0 z-10">
                  {liveStream.slice(-18).map((event, index) => {
                    const x = ((event.position[0] + 6) / 12) * 100
                    const y = ((event.position[2] + 5) / 11) * 100
                    const glow = severityColor(event.impactScore)
                    return (
                      <motion.div
                        key={event.id}
                        className="absolute rounded-full"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          width: `${10 + Math.min(18, event.impactScore / 4)}px`,
                          height: `${10 + Math.min(18, event.impactScore / 4)}px`,
                          marginLeft: `${-(10 + Math.min(18, event.impactScore / 4)) / 2}px`,
                          marginTop: `${-(10 + Math.min(18, event.impactScore / 4)) / 2}px`,
                          backgroundColor: `${glow}cc`,
                          boxShadow: `0 0 0 1px ${glow}40, 0 0 18px ${glow}40`,
                        }}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: [0.9, 1.1, 0.95], opacity: 1 }}
                        transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.05 }}
                      />
                    )
                  })}
                  {liveStream.slice(-6).map((event, index) => {
                    const x = ((event.position[0] + 6) / 12) * 100
                    const y = ((event.position[2] + 5) / 11) * 100
                    return (
                      <div
                        key={`${event.id}-label`}
                        className="absolute px-2 py-1 rounded-md bg-bg-primary/80 border border-white/10 text-[10px] font-mono text-text-muted backdrop-blur-sm"
                        style={{
                          left: `${Math.min(84, x + 2)}%`,
                          top: `${Math.min(88, y + 2)}%`,
                        }}
                      >
                        {event.station}
                      </div>
                    )
                  })}
                </div>

                <div className="absolute inset-x-4 bottom-4 z-20 grid grid-cols-2 gap-3">
                  <div className="glass-card p-3 rounded-lg">
                    <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1">Privacy Sentinel</p>
                    <p className="text-platinum font-mono text-sm">PII redaction on</p>
                  </div>
                  <div className="glass-card p-3 rounded-lg">
                    <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1">Background Model</p>
                    <p className="text-platinum font-mono text-sm">Aggregating {visibleCount} turns</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="glass-card p-4 rounded-xl">
                  <p className="text-text-muted text-[10px] uppercase tracking-widest mb-2">Top Stations</p>
                  <div className="space-y-2">
                    {stationCounts.map((entry, index) => (
                      <div key={entry.station} className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-text-muted w-5">{index + 1}</span>
                        <span className="text-sm text-platinum flex-1 truncate">{entry.station}</span>
                        <span className="font-mono text-xs text-lime">{entry.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {activeAlert && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      className="glass-panel p-4 border-l-4 border-l-red"
                    >
                      <p className="text-red text-xs font-mono uppercase tracking-[0.25em] mb-2">Agent Alert</p>
                      <p className="text-platinum text-sm font-semibold mb-2">
                        Severe spillover parking detected at {activeAlert.hotspot}
                      </p>
                      <p className="text-text-secondary text-xs leading-relaxed">
                        {activeAlert.delay}-minute delay and {activeAlert.parkingCount} parking events triggered a graceful interruption.
                      </p>
                      <p className="text-lime text-xs font-mono mt-3">{activeAlert.route}</p>
                    </motion.div>
                  )}
                  {!activeAlert && escalationPreview && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      className="glass-panel p-4 border-l-4 border-l-amber"
                    >
                      <p className="text-amber text-xs font-mono uppercase tracking-[0.25em] mb-2">Interruption preview</p>
                      <p className="text-platinum text-sm font-semibold mb-2">
                        Escalation building at {escalationPreview.station}
                      </p>
                      <p className="text-text-secondary text-xs leading-relaxed">
                        {escalationPreview.parkingCount} parking events are clustering in the current stream window. The next high-delay turn will trigger dispatch.
                      </p>
                      <p className="text-lime text-xs font-mono mt-3">
                        {escalationPreview.route} standing by · peak delay {escalationPreview.delay}m
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-5 hud-corner flex-1 flex flex-col min-h-0"
          >
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <p className="text-text-muted text-[10px] uppercase tracking-[0.25em]">Live Events</p>
                <h2 className="text-platinum font-semibold text-lg">Streaming incidents</h2>
              </div>
              <span className="font-mono text-xs text-text-muted">{demoStreamMeta.generatedAt}</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {liveStream.slice().reverse().map((event) => (
                <div key={event.id} className="glass-card p-4 rounded-xl border border-white/5 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: severityColor(event.impactScore), boxShadow: `0 0 10px ${severityColor(event.impactScore)}55` }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-platinum font-medium">{event.station}</span>
                      <span className="text-text-muted text-xs font-mono">{formatTime(event.timestamp)}</span>
                      <span className="text-text-muted text-xs">{event.vehicleClass}</span>
                    </div>
                    <p className="text-text-secondary text-sm truncate">{event.violationType} at {event.location}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2 py-1 rounded-full bg-lime/10 text-lime border border-lime/20">{event.plateNumber}</span>
                    <span className="px-2 py-1 rounded-full bg-white/5 text-text-muted border border-white/10">{event.congestionDelayMins}m delay</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto xl:overflow-hidden">
          <motion.section
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-5 hud-corner shrink-0"
          >
            <p className="text-text-muted text-[10px] uppercase tracking-[0.25em] mb-2">Interactive Command Center</p>
            <h2 className="text-platinum font-semibold text-lg mb-4">Stay present while the stream keeps moving</h2>

            <div className="flex flex-wrap gap-2 mb-4">
              {[
                ['delay', 'Current delay'],
                ['privacy', 'Privacy status'],
                ['route', 'Reroute plan'],
                ['status', 'Alert status'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    const next = key as QueryKey
                    setSelectedQuery(next)
                    setQueryText(label)
                    setQueryAnswer(getQueryResponse(next, activeAlert, liveStream))
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-mono border border-border text-text-secondary hover:text-platinum hover:border-lime/30 hover:bg-lime/5 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>

            <textarea
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              className="w-full min-h-[90px] bg-bg-secondary/50 border border-border rounded-xl p-3 text-sm text-platinum placeholder:text-text-muted focus:outline-none focus:border-lime/40"
              placeholder="Ask the control room something live..."
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-text-muted text-[10px] uppercase tracking-[0.2em]">Graceful interruption enabled</span>
              <button
                onClick={handleRunQuery}
                className="px-4 py-2 rounded-lg bg-lime text-bg-primary font-semibold text-sm hover:shadow-[0_0_20px_rgba(163,255,18,0.25)] transition-shadow"
              >
                Run query
              </button>
            </div>

            <div className="mt-4 glass-card p-4 rounded-xl border border-white/5">
              <p className="text-text-muted text-[10px] uppercase tracking-[0.25em] mb-2">Response</p>
              <p className="text-platinum text-sm leading-relaxed">{queryAnswer}</p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-text-muted font-mono">
                Live mode: {selectedQuery}
              </p>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-5 hud-corner shrink-0"
          >
            <p className="text-text-muted text-[10px] uppercase tracking-[0.25em] mb-2">Two-Model Narrative</p>
            <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
              <p><span className="text-lime font-semibold">Interaction model:</span> accepts live questions and interruptions without blocking the feed.</p>
              <p><span className="text-amber font-semibold">Background model:</span> accumulates the arriving turns into a heat surface, trigger logic, and dispatch context.</p>
              <p><span className="text-platinum font-semibold">Privacy sentinel:</span> converts raw identifiers into tokens before the event reaches the dashboard, keeping the demo safe to show publicly.</p>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}