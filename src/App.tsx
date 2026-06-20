import { Suspense, lazy, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAppStore, type ModuleId } from '@/stores/appStore'

// Lazy load modules for code splitting
const HotspotMap = lazy(() => import('@/components/modules/HotspotMap'))
const CommandDashboard = lazy(() => import('@/components/modules/CommandDashboard'))
const ControlRoom = lazy(() => import('@/components/modules/ControlRoom'))
const HotspotIntelligence = lazy(() => import('@/components/modules/HotspotIntelligence'))
const EnforcementRoutes = lazy(() => import('@/components/modules/EnforcementRoutes'))
const IncidentExplorer = lazy(() => import('@/components/modules/IncidentExplorer'))
const TemporalAnalytics = lazy(() => import('@/components/modules/TemporalAnalytics'))
const CongestionPredictor = lazy(() => import('@/components/modules/CongestionPredictor'))
const ZoneDeepDive = lazy(() => import('@/components/modules/ZoneDeepDive'))
const ReportGenerator = lazy(() => import('@/components/modules/ReportGenerator'))
const PrecinctPerformance = lazy(() => import('@/components/modules/PrecinctPerformance'))
const EconomicsDashboard = lazy(() => import('@/components/modules/EconomicsDashboard'))

// Layout
const StatusBar = lazy(() => import('@/components/layout/StatusBar'))
const CommandDock = lazy(() => import('@/components/layout/CommandDock'))
const LiveSupervisor = lazy(() => import('@/components/shared/LiveSupervisor'))
const AlertPanel = lazy(() => import('@/components/shared/AlertPanel'))

const NlpQueryModule = lazy(() => import('@/components/modules/NLPDashboard'))
const LandingSequence = lazy(() => import('@/components/landing/LandingSequence'))
const CityScene = lazy(() => import('@/three/CityScene'))

function ModuleRenderer({ moduleId }: { moduleId: ModuleId }) {
  switch (moduleId) {
    case 'map':
      return <HotspotMap />
    case 'dashboard':
      return <CommandDashboard />
    case 'controlRoom':
      return <ControlRoom />
    case 'hotspots':
      return <HotspotIntelligence />
    case 'patrols':
      return <EnforcementRoutes />
    case 'incidents':
      return <IncidentExplorer />
    case 'temporal':
      return <TemporalAnalytics />
    case 'predictor':
      return <CongestionPredictor />
    case 'zones':
      return <ZoneDeepDive />
    case 'reports':
      return <ReportGenerator />
    case 'nlpQuery':
      return <NlpQueryModule />
    case 'precincts':
      return <PrecinctPerformance />
    case 'economics':
      return <EconomicsDashboard />
    default:
      return <CommandDashboard />
  }
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-bg-primary z-40">
      <div className="text-center">
        <motion.div
          className="w-12 h-12 border-2 border-lime/20 border-t-lime rounded-full mx-auto mb-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <p className="text-text-muted text-sm font-mono tracking-wider">LOADING MODULE</p>
      </div>
    </div>
  )
}

// Animated background grid that's always present
function BackgroundGrid() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Base grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(163, 255, 18, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(163, 255, 18, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
      {/* Major grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(163, 255, 18, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(163, 255, 18, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '400px 400px',
        }}
      />
      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, #07070B 70%)',
        }}
      />
    </div>
  )
}

export default function App() {
  const activeModule = useAppStore((s) => s.activeModule)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const setIsTransitioning = useAppStore((s) => s.setIsTransitioning)
  const hasSeenIntro = useAppStore((s) => s.hasSeenIntro)

  const sidebarWidth = sidebarCollapsed ? 64 : 260

  const handleAnimationComplete = useCallback(() => {
    setIsTransitioning(false)
  }, [setIsTransitioning])

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary overflow-x-hidden">
      <BackgroundGrid />
      <Suspense fallback={null}>
        <CityScene />
      </Suspense>

      {/* Landing sequence */}
      <AnimatePresence>
        {!hasSeenIntro && (
          <Suspense fallback={<LoadingScreen />}>
            <LandingSequence />
          </Suspense>
        )}
      </AnimatePresence>

      {hasSeenIntro && (
        <>
          {/* Sidebar Navigation */}
          <Suspense fallback={null}>
            <CommandDock />
          </Suspense>

          {/* Status Bar */}
          <Suspense fallback={null}>
            <StatusBar />
          </Suspense>

          {/* Live supervisor & alerts (global) */}
          <Suspense fallback={null}>
            <LiveSupervisor />
            <AlertPanel />
          </Suspense>

          {/* Main Content Area */}
          <main
            className="pt-12 min-h-screen relative z-10"
            style={{
              marginLeft: sidebarWidth,
              transition: 'margin-left 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <AnimatePresence mode="wait" onExitComplete={handleAnimationComplete}>
              <motion.div
                key={activeModule}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="min-h-[calc(100vh-3rem)]"
              >
                <Suspense fallback={<LoadingScreen />}>
                  <ModuleRenderer moduleId={activeModule} />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>
        </>
      )}
    </div>
  )
}
