import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { type Violation } from '@/data/violations'
import { useDataStore } from '@/stores/dataStore'
import useLiveFeed from '@/hooks/useLiveFeed'
import { useAppStore } from '@/stores/appStore'

/* ── Constants ── */
const ITEMS_PER_PAGE = 20
const INITIAL_COUNT = 50

const VEHICLE_TYPES: Violation['vehicleType'][] = ['Car', 'Scooter', 'Auto', 'Truck', 'Bus']
const STATUSES: Violation['status'][] = ['Pending', 'Paid', 'Disputed', 'Escalated']

const VEHICLE_EMOJIS: Record<Violation['vehicleType'], string> = {
  Car: '🚗',
  Scooter: '🛵',
  Auto: '🛺',
  Truck: '🚛',
  Bus: '🚌',
}

const STATUS_COLORS: Record<Violation['status'], string> = {
  Pending: '#FBBF24',
  Paid: '#22C55E',
  Disputed: '#FF6B35',
  Escalated: '#DC2626',
}

const SEVERITY_MAP: Record<string, { color: string; level: number }> = {
  'Drunk Driving': { color: '#DC2626', level: 5 },
  'Over Speed': { color: '#DC2626', level: 4 },
  'Signal Jump': { color: '#FF6B35', level: 4 },
  'Wrong Way': { color: '#FF6B35', level: 4 },
  'No Helmet': { color: '#FBBF24', level: 3 },
  'No Seat Belt': { color: '#FBBF24', level: 3 },
  'Triple Riding': { color: '#FBBF24', level: 3 },
  'Wrong Lane': { color: '#FBBF24', level: 3 },
  'No Parking': { color: '#22C55E', level: 2 },
  'Overloading': { color: '#FF6B35', level: 3 },
  'Lane Violation': { color: '#FBBF24', level: 2 },
  'Illegal U-Turn': { color: '#FBBF24', level: 2 },
  'Tailgating': { color: '#FF6B35', level: 3 },
  'Illegal Stop': { color: '#22C55E', level: 2 },
  'Lane Change': { color: '#FBBF24', level: 2 },
}

type SortKey = 'time' | 'amount' | 'severity'

function getRelativeTime(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}

/* ── Filter Chip ── */
function FilterChip({
  label,
  isActive,
  color,
  onToggle,
}: {
  label: string
  isActive: boolean
  color?: string
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`
        px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border
        ${
          isActive
            ? 'border-lime/30 text-lime bg-lime/10'
            : 'border-[rgba(255,255,255,0.08)] text-text-muted bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)]'
        }
      `}
      style={isActive && color ? { borderColor: `${color}40`, color, background: `${color}15` } : {}}
    >
      {isActive && <span className="mr-1">✕</span>}
      {label}
    </button>
  )
}

/* ── Violation Card ── */
function ViolationCard({ violation }: { violation: Violation }) {
  const severity = SEVERITY_MAP[violation.violationType] ?? { color: '#9CA3AF', level: 1 }
  const statusColor = STATUS_COLORS[violation.status]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="glass-card p-4 flex flex-col gap-3 hover:translate-y-[-2px] transition-transform duration-200 group cursor-default"
      style={{
        boxShadow: 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      whileHover={{
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px ${severity.color}20`,
      }}
    >
      {/* Header: Violation type + severity indicator */}
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-8 rounded-full shrink-0"
          style={{ backgroundColor: severity.color }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-platinum truncate">
            {violation.violationType}
          </p>
          <p className="text-[10px] font-mono text-text-muted">{violation.id}</p>
        </div>
        <span className="text-text-muted text-xs font-mono shrink-0">
          {getRelativeTime(violation.timestamp)}
        </span>
      </div>

      {/* Vehicle + plate */}
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none">{VEHICLE_EMOJIS[violation.vehicleType]}</span>
        <span className="font-mono text-sm text-platinum tracking-wider font-medium">
          {violation.plateNumber}
        </span>
      </div>

      {/* Location */}
      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 opacity-50">
          <path d="M8 0a5.53 5.53 0 0 0-5.5 5.5c0 4.13 5.5 10.5 5.5 10.5s5.5-6.37 5.5-10.5A5.53 5.53 0 0 0 8 0zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
        </svg>
        <span className="truncate">{violation.location}</span>
      </div>

      {/* Fine + Status */}
      <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.05)]">
        <span className="font-mono text-lg font-bold text-platinum">
          ₹{violation.fineAmount.toLocaleString('en-IN')}
        </span>
        <span
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono"
          style={{
            color: statusColor,
            backgroundColor: `${statusColor}15`,
            border: `1px solid ${statusColor}30`,
          }}
        >
          {violation.status}
        </span>
      </div>
    </motion.div>
  )
}

/* ── Main Component ── */
export default function IncidentExplorer() {
  const violations = useDataStore((s) => s.violations)
  const demoMode = useAppStore((s) => (s as any).demoMode)
  const feed = useLiveFeed()
  const [searchQuery, setSearchQuery] = useState('')
  const [vehicleFilters, setVehicleFilters] = useState<Set<Violation['vehicleType']>>(new Set())
  const [statusFilters, setStatusFilters] = useState<Set<Violation['status']>>(new Set())
  const [sortBy, setSortBy] = useState<SortKey>('time')
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)

  const toggleVehicle = useCallback((type: Violation['vehicleType']) => {
    setVehicleFilters((prev) => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
    setVisibleCount(INITIAL_COUNT)
  }, [])

  const toggleStatus = useCallback((status: Violation['status']) => {
    setStatusFilters((prev) => {
      const next = new Set(prev)
      next.has(status) ? next.delete(status) : next.add(status)
      return next
    })
    setVisibleCount(INITIAL_COUNT)
  }, [])

  const clearAllFilters = useCallback(() => {
    setVehicleFilters(new Set())
    setStatusFilters(new Set())
    setSearchQuery('')
    setVisibleCount(INITIAL_COUNT)
  }, [])

  const filteredViolations = useMemo(() => {
    let filtered = violations

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (v) =>
          v.plateNumber.toLowerCase().includes(q) ||
          v.location.toLowerCase().includes(q) ||
          v.violationType.toLowerCase().includes(q) ||
          v.id.toLowerCase().includes(q),
      )
    }

    if (vehicleFilters.size > 0) {
      filtered = filtered.filter((v) => vehicleFilters.has(v.vehicleType))
    }

    if (statusFilters.size > 0) {
      filtered = filtered.filter((v) => statusFilters.has(v.status))
    }

    // Sort
    const sorted = [...filtered]
    switch (sortBy) {
      case 'time':
        sorted.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        break
      case 'amount':
        sorted.sort((a, b) => b.fineAmount - a.fineAmount)
        break
      case 'severity':
        sorted.sort((a, b) => {
          const sA = SEVERITY_MAP[a.violationType]?.level ?? 1
          const sB = SEVERITY_MAP[b.violationType]?.level ?? 1
          return sB - sA
        })
        break
    }

    return sorted
  }, [searchQuery, vehicleFilters, statusFilters, sortBy, violations])

  const displayedViolations = filteredViolations.slice(0, visibleCount)
  const hasMore = visibleCount < filteredViolations.length
  const hasActiveFilters = vehicleFilters.size > 0 || statusFilters.size > 0 || searchQuery.trim().length > 0
  const totalFines = filteredViolations.reduce((s, v) => s + v.fineAmount, 0)

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {demoMode && feed.currentEvents.length > 0 && (
        <div className="mx-4 mt-4 glass-panel px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted uppercase tracking-widest">Live Events</span>
            <div className="font-mono text-sm font-bold text-lime">{feed.currentEvents.length}</div>
          </div>
          <div className="flex-1 text-sm text-text-secondary">
            {feed.currentEvents.slice(-3).map((e) => (
              <span key={e.id} className="mr-4">{e.plateNumber} @ {e.hotspot} · {e.violationType}</span>
            ))}
          </div>
          <div className="ml-auto text-xs text-text-muted">Realtime demo</div>
        </div>
      )}
      {/* ── Stats Bar ── */}
      <motion.div
        className="shrink-0 mx-4 mt-4 glass-panel px-6 py-3 flex items-center gap-6"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted uppercase tracking-widest">Records</span>
          <span className="font-mono text-sm font-bold text-lime">
            {filteredViolations.length}
          </span>
          <span className="text-text-muted text-xs">/</span>
          <span className="font-mono text-sm text-text-secondary">{violations.length}</span>
        </div>
        <div className="w-px h-6 bg-[rgba(255,255,255,0.08)]" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted uppercase tracking-widest">Total Fines</span>
          <span className="font-mono text-sm font-bold text-amber">
            ₹{totalFines.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex-1" />
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-text-muted hover:text-red transition-colors px-2 py-1 rounded border border-transparent hover:border-red/20"
          >
            Clear all filters
          </button>
        )}
      </motion.div>

      {/* ── Search + Filters ── */}
      <motion.div
        className="shrink-0 mx-4 mt-3 flex flex-col gap-3"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Search bar */}
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search by plate, location, violation type, or ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setVisibleCount(INITIAL_COUNT)
            }}
            className="w-full h-12 pl-12 pr-4 rounded-xl text-sm text-platinum placeholder-text-muted
              bg-bg-glass border border-border outline-none
              focus:border-lime/40 focus:shadow-[0_0_20px_rgba(163,255,18,0.08)] transition-all duration-300"
            style={{ backdropFilter: 'blur(16px)' }}
          />
        </div>

        {/* Filter rows */}
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] uppercase tracking-widest text-text-muted self-center mr-1">
            Vehicle
          </span>
          {VEHICLE_TYPES.map((type) => (
            <FilterChip
              key={type}
              label={`${VEHICLE_EMOJIS[type]} ${type}`}
              isActive={vehicleFilters.has(type)}
              onToggle={() => toggleVehicle(type)}
            />
          ))}
          <div className="w-px h-6 bg-[rgba(255,255,255,0.08)] self-center mx-1" />
          <span className="text-[10px] uppercase tracking-widest text-text-muted self-center mr-1">
            Status
          </span>
          {STATUSES.map((status) => (
            <FilterChip
              key={status}
              label={status}
              isActive={statusFilters.has(status)}
              color={STATUS_COLORS[status]}
              onToggle={() => toggleStatus(status)}
            />
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-text-muted">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-text-secondary
                text-xs rounded-lg px-3 py-1.5 outline-none focus:border-lime/30 cursor-pointer font-mono"
            >
              <option value="time">By Time</option>
              <option value="amount">By Amount</option>
              <option value="severity">By Severity</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* ── Cards Grid ── */}
      <div className="flex-1 overflow-y-auto mt-3 px-4 pb-4">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
          layout
        >
          <AnimatePresence mode="popLayout">
            {displayedViolations.map((v) => (
              <ViolationCard key={v.id} violation={v} />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty state */}
        {filteredViolations.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center py-20 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-4xl">🔍</span>
            <p className="text-text-muted text-sm">No violations match your filters</p>
            <button
              onClick={clearAllFilters}
              className="text-xs text-lime hover:text-lime/80 transition-colors"
            >
              Clear all filters
            </button>
          </motion.div>
        )}

        {/* Load more */}
        {hasMore && (
          <motion.div
            className="flex justify-center pt-6 pb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button
              onClick={() => setVisibleCount((c) => c + ITEMS_PER_PAGE)}
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-lime border border-lime/20
                bg-lime/5 hover:bg-lime/10 transition-all duration-200 font-mono"
              style={{ boxShadow: '0 0 16px rgba(163,255,18,0.06)' }}
            >
              Load {Math.min(ITEMS_PER_PAGE, filteredViolations.length - visibleCount)} more ({filteredViolations.length - visibleCount} remaining)
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
