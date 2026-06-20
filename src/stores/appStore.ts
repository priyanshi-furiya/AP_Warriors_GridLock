import { create } from 'zustand'

export type ModuleId =
  | 'landing'
  | 'controlRoom'
  | 'map'
  | 'dashboard'
  | 'hotspots'
  | 'patrols'
  | 'incidents'
  | 'temporal'
  | 'predictor'
  | 'zones'
  | 'reports'
  | 'nlpQuery'
  | 'precincts'
  | 'economics'

export interface GlobalFilters {
  dateRange: [string, string]
  selectedStations: string[]
  selectedVehicleClasses: string[]
}

interface AppState {
  activeModule: ModuleId
  hasSeenIntro: boolean
  demoMode: boolean
  alerts: Array<{ id: string; title: string; message: string; level: 'info' | 'warning' | 'critical'; timestamp: string; seen?: boolean }>
  selectedHotspotId: string | null
  selectedZoneId: string | null
  isTransitioning: boolean
  dockExpanded: boolean
  sidebarCollapsed: boolean
  mobileMenuOpen: boolean
  globalFilters: GlobalFilters

  setActiveModule: (module: ModuleId) => void
  setHasSeenIntro: (seen: boolean) => void
  setSelectedHotspot: (id: string | null) => void
  setSelectedZone: (id: string | null) => void
  setIsTransitioning: (transitioning: boolean) => void
  setDockExpanded: (expanded: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setDemoMode: (v: boolean) => void
  addAlert: (a: { id?: string; title: string; message: string; level?: 'info' | 'warning' | 'critical' }) => void
  dismissAlert: (id: string) => void
  clearAlerts: () => void
  setMobileMenuOpen: (open: boolean) => void
  toggleMobileMenu: () => void
  setGlobalFilters: (filters: Partial<GlobalFilters>) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeModule: 'landing',
  hasSeenIntro: false,
  demoMode: true,
  alerts: [],
  selectedHotspotId: null,
  selectedZoneId: null,
  isTransitioning: false,
  dockExpanded: false,
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  globalFilters: {
    dateRange: ['2023-11-01', '2024-04-30'],
    selectedStations: [],
    selectedVehicleClasses: [],
  },

  setActiveModule: (module) => set({ activeModule: module, isTransitioning: true }),
  setHasSeenIntro: (seen) => set({ hasSeenIntro: seen }),
  setDemoMode: (v: boolean) => set({ demoMode: v }),
  addAlert: (a) =>
    set((state) => {
      const id = a.id ?? `alert-${Date.now()}`
      const next = [
        { id, title: a.title, message: a.message, level: a.level ?? 'info', timestamp: new Date().toISOString(), seen: false },
        ...state.alerts,
      ]
      return { alerts: next }
    }),
  dismissAlert: (id) => set((state) => ({ alerts: state.alerts.filter((x) => x.id !== id) })),
  clearAlerts: () => set({ alerts: [] }),
  setSelectedHotspot: (id) => set({ selectedHotspotId: id }),
  setSelectedZone: (id) => set({ selectedZoneId: id }),
  setIsTransitioning: (transitioning) => set({ isTransitioning: transitioning }),
  setDockExpanded: (expanded) => set({ dockExpanded: expanded }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  setGlobalFilters: (filters) =>
    set((state) => ({
      globalFilters: { ...state.globalFilters, ...filters },
    })),
}))
