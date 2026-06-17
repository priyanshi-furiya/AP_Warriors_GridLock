import { create } from 'zustand'

export type ModuleId =
  | 'landing'
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

export interface GlobalFilters {
  dateRange: [string, string]
  selectedStations: string[]
  selectedVehicleClasses: string[]
}

interface AppState {
  activeModule: ModuleId
  hasSeenIntro: boolean
  selectedHotspotId: string | null
  selectedZoneId: string | null
  isTransitioning: boolean
  dockExpanded: boolean
  sidebarCollapsed: boolean
  globalFilters: GlobalFilters

  setActiveModule: (module: ModuleId) => void
  setHasSeenIntro: (seen: boolean) => void
  setSelectedHotspot: (id: string | null) => void
  setSelectedZone: (id: string | null) => void
  setIsTransitioning: (transitioning: boolean) => void
  setDockExpanded: (expanded: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setGlobalFilters: (filters: Partial<GlobalFilters>) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeModule: 'landing',
  hasSeenIntro: false,
  selectedHotspotId: null,
  selectedZoneId: null,
  isTransitioning: false,
  dockExpanded: false,
  sidebarCollapsed: false,
  globalFilters: {
    dateRange: ['2023-11-01', '2024-04-30'],
    selectedStations: [],
    selectedVehicleClasses: [],
  },

  setActiveModule: (module) => set({ activeModule: module, isTransitioning: true }),
  setHasSeenIntro: (seen) => set({ hasSeenIntro: seen }),
  setSelectedHotspot: (id) => set({ selectedHotspotId: id }),
  setSelectedZone: (id) => set({ selectedZoneId: id }),
  setIsTransitioning: (transitioning) => set({ isTransitioning: transitioning }),
  setDockExpanded: (expanded) => set({ dockExpanded: expanded }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setGlobalFilters: (filters) =>
    set((state) => ({
      globalFilters: { ...state.globalFilters, ...filters },
    })),
}))
