import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { useAppStore } from '@/stores/appStore'
import { hotspots } from '@/data/hotspots'
import FloatingGrid from './FloatingGrid'
import Buildings from './Buildings'
import RoadNetwork from './RoadNetwork'
import TrafficParticles from './TrafficParticles'
import RadarSweep from './RadarSweep'
import HotspotPillar from './HotspotPillar'
import DataBeams from './DataBeams'

export default function CityScene() {
  const selectedHotspotId = useAppStore((s) => s.selectedHotspotId)

  // Extract beam start positions from hotspot coordinates
  const beamPositions = hotspots.map((h) => h.position)

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-[#07070B] pointer-events-none">
      <Canvas
        camera={{ position: [0, 8, 12], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#07070B']} />

        {/* Ambient & Directional Lights */}
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[10, 15, 5]}
          intensity={0.6}
          color="#A3FF12"
        />
        <directionalLight
          position={[-10, 10, -5]}
          intensity={0.3}
          color="#FF6B35"
        />

        {/* 3D City Layout */}
        <FloatingGrid />
        <Buildings />
        <RoadNetwork />
        <TrafficParticles />
        <RadarSweep />

        {/* Data connection lines */}
        <DataBeams startPositions={beamPositions} />

        {/* Active Hotspot Pillars */}
        <group>
          {hotspots.map((hotspot) => (
            <HotspotPillar
              key={hotspot.id}
              position={hotspot.position}
              severity={hotspot.severity}
              label={hotspot.name}
              count={hotspot.violationCount}
              isSelected={selectedHotspotId === hotspot.id}
            />
          ))}
        </group>

        {/* Cinematic Post-Processing Bloom & Vignette */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.5}
            luminanceSmoothing={0.9}
            intensity={1.2}
            mipmapBlur
          />
          <Vignette offset={0.5} darkness={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
