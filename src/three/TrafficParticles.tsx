import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 2200

// Road path definitions — particles travel along these
interface RoadPath {
  axis: 'x' | 'z'
  fixedCoord: number
  range: [number, number]
  direction: 1 | -1
}

const ROAD_PATHS: RoadPath[] = [
  // Major horizontal roads
  { axis: 'x', fixedCoord: 0, range: [-10, 10], direction: 1 },
  { axis: 'x', fixedCoord: 0.15, range: [-10, 10], direction: -1 },
  { axis: 'x', fixedCoord: 3, range: [-10, 10], direction: 1 },
  { axis: 'x', fixedCoord: -3, range: [-10, 10], direction: -1 },
  { axis: 'x', fixedCoord: 6, range: [-10, 10], direction: 1 },
  { axis: 'x', fixedCoord: -6, range: [-10, 10], direction: -1 },

  // Major vertical roads
  { axis: 'z', fixedCoord: 0, range: [-10, 10], direction: 1 },
  { axis: 'z', fixedCoord: 0.15, range: [-10, 10], direction: -1 },
  { axis: 'z', fixedCoord: 3, range: [-10, 10], direction: -1 },
  { axis: 'z', fixedCoord: -3, range: [-10, 10], direction: 1 },
  { axis: 'z', fixedCoord: 6, range: [-10, 10], direction: -1 },
  { axis: 'z', fixedCoord: -6, range: [-10, 10], direction: 1 },
]

// Traffic status color
const COLOR_NORMAL = new THREE.Color(0xa3ff12) // lime
const COLOR_SLOW = new THREE.Color(0xfbbf24)   // amber
const COLOR_CONGESTED = new THREE.Color(0xdc2626) // red

interface ParticleState {
  roadIndex: number
  progress: number // 0-1 along the road
  speed: number
  laneOffset: number
  status: 0 | 1 | 2 // 0=normal, 1=slow, 2=congested
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

export default function TrafficParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const particleStates = useRef<ParticleState[]>([])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorAttr = useRef<Float32Array | null>(null)

  // Initialize particle states
  useMemo(() => {
    const states: ParticleState[] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const roadIndex = Math.floor(seededRandom(i * 7) * ROAD_PATHS.length)
      const statusRand = seededRandom(i * 13)
      let status: 0 | 1 | 2 = 0
      if (statusRand > 0.85) status = 2
      else if (statusRand > 0.7) status = 1

      const baseSpeed = status === 2 ? 0.02 : status === 1 ? 0.06 : 0.12
      states.push({
        roadIndex,
        progress: seededRandom(i * 3),
        speed: baseSpeed + seededRandom(i * 11) * 0.05,
        laneOffset: (seededRandom(i * 17) - 0.5) * 0.2,
        status,
      })
    }
    particleStates.current = states
  }, [])

  // Set up instance colors
  useEffect(() => {
    if (!meshRef.current) return

    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const states = particleStates.current

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const color =
        states[i].status === 2
          ? COLOR_CONGESTED
          : states[i].status === 1
          ? COLOR_SLOW
          : COLOR_NORMAL

      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    colorAttr.current = colors
    meshRef.current.geometry.setAttribute(
      'color',
      new THREE.InstancedBufferAttribute(colors, 3)
    )
  }, [])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    const states = particleStates.current

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const state = states[i]
      const road = ROAD_PATHS[state.roadIndex]

      // Advance progress
      state.progress += state.speed * delta * road.direction
      if (state.progress > 1) state.progress -= 1
      if (state.progress < 0) state.progress += 1

      // Calculate world position
      const rangeLen = road.range[1] - road.range[0]
      const coord = road.range[0] + state.progress * rangeLen

      if (road.axis === 'x') {
        dummy.position.set(coord, 0.06, road.fixedCoord + state.laneOffset)
      } else {
        dummy.position.set(road.fixedCoord + state.laneOffset, 0.06, coord)
      }

      dummy.scale.setScalar(0.03 + state.status * 0.005)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshBasicMaterial
        vertexColors
        toneMapped={false}
      />
    </instancedMesh>
  )
}
