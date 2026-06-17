import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore, type ModuleId } from '@/stores/appStore'

interface NavItem {
  id: ModuleId
  icon: string
  label: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'dashboard', icon: '⬡', label: 'Dashboard' },
      { id: 'nlpQuery', icon: '💬', label: 'Ask GridLock' },
    ],
  },
  {
    title: 'ENFORCEMENT',
    items: [
      { id: 'map', icon: '◎', label: 'Map' },
      { id: 'hotspots', icon: '◆', label: 'Hotspots' },
      { id: 'incidents', icon: '☰', label: 'Incidents' },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      { id: 'temporal', icon: '◷', label: 'Temporal' },
      { id: 'zones', icon: '⬢', label: 'Zones' },
      { id: 'predictor', icon: '◈', label: 'Predictor' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { id: 'patrols', icon: '▲', label: 'Patrols' },
      { id: 'reports', icon: '◳', label: 'Reports' },
    ],
  },
]

function NavButton({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const [hovered, setHovered] = useState(false)
  const activeModule = useAppStore((s) => s.activeModule)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const isActive = activeModule === item.id

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setActiveModule(item.id)}
        className={[
          'relative flex items-center w-full rounded-lg',
          'transition-all duration-200 ease-out',
          'font-mono text-[13px] tracking-wide',
          collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
          isActive
            ? 'text-lime bg-lime/5'
            : 'text-text-muted hover:text-platinum hover:bg-white/[0.03]',
        ].join(' ')}
      >
        {/* Active left border indicator */}
        {isActive && (
          <motion.div
            layoutId="sidebar-active-indicator"
            className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-lime shadow-[0_0_8px_rgba(163,255,18,0.5)]"
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        )}

        {/* Icon */}
        <span
          className={[
            'text-base flex-shrink-0 w-5 text-center',
            isActive ? 'glow-text-lime' : '',
          ].join(' ')}
        >
          {item.icon}
        </span>

        {/* Label - only when expanded */}
        {!collapsed && (
          <span className="whitespace-nowrap overflow-hidden">
            {item.label}
          </span>
        )}
      </button>

      {/* Tooltip when collapsed */}
      <AnimatePresence>
        {collapsed && hovered && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[60]
                       px-3 py-1.5 rounded-md
                       bg-bg-secondary border border-border
                       text-xs font-mono text-platinum tracking-wide whitespace-nowrap
                       shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          >
            {item.label}
            {/* Tooltip arrow */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0
                            border-t-[5px] border-t-transparent
                            border-r-[5px] border-r-border
                            border-b-[5px] border-b-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CommandDock() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

  return (
    <motion.nav
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 bottom-0 z-50 flex flex-col
                 bg-[rgba(10,10,18,0.92)] backdrop-blur-[24px]
                 border-r border-r-[rgba(163,255,18,0.1)]
                 shadow-[1px_0_24px_rgba(0,0,0,0.4),inset_1px_0_0_rgba(163,255,18,0.06)]"
      style={{
        width: sidebarCollapsed ? 64 : 260,
        transition: 'width 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* ── Logo Section ── */}
      <div className="h-14 flex items-center border-b border-b-[rgba(163,255,18,0.08)] flex-shrink-0 overflow-hidden"
           style={{ padding: sidebarCollapsed ? '0 12px' : '0 20px' }}>
        {sidebarCollapsed ? (
          <div className="w-full flex justify-center">
            <span className="font-display text-lg font-bold text-lime glow-text-lime">G</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="font-display text-lg font-bold tracking-wider text-platinum">
              GRIDLOCK
            </span>
            <span className="font-display text-lg font-bold tracking-wider text-lime glow-text-lime">
              AI
            </span>
            <span className="ml-2 text-[9px] font-mono text-text-muted tracking-widest border border-border rounded px-1.5 py-0.5">
              v2
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation Groups ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-thin"
           style={{ padding: sidebarCollapsed ? '16px 8px' : '16px 12px' }}>
        {navGroups.map((group, groupIndex) => (
          <div key={group.title} className={groupIndex > 0 ? 'mt-6' : ''}>
            {/* Section header */}
            {!sidebarCollapsed && (
              <div className="px-3 mb-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-text-muted/60">
                  {group.title}
                </span>
              </div>
            )}
            {sidebarCollapsed && groupIndex > 0 && (
              <div className="mx-auto mb-3 w-6 h-px bg-border" />
            )}

            {/* Nav items */}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavButton key={item.id} item={item} collapsed={sidebarCollapsed} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Collapse Toggle ── */}
      <div className="flex-shrink-0 border-t border-t-[rgba(163,255,18,0.08)] p-3">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center py-2 rounded-lg
                     text-text-muted hover:text-platinum hover:bg-white/[0.03]
                     transition-colors duration-200"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="transition-transform duration-300"
            style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {!sidebarCollapsed && (
            <span className="ml-2 text-xs font-mono tracking-wider">Collapse</span>
          )}
        </button>
      </div>
    </motion.nav>
  )
}
