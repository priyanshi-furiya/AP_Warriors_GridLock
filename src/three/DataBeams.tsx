import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface DataBeamsProps {
  startPositions: [number, number, number][]
  centerTarget?: [number, number, number]
}

const LIME = new THREE.Color(0xa3ff12)
const ORANGE = new THREE.Color(0xff6b35)
const DOT_COUNT_PER_BEAM = 5

function createCurve(
  start: THREE.Vector3,
  end: THREE.Vector3
): THREE.QuadraticBezierCurve3 {
  const midY = Math.max(start.y, end.y) + 2 + Math.random() * 1.5
  const mid = new THREE.Vector3(
    (start.x + end.x) / 2 + (Math.random() - 0.5) * 1.5,
    midY,
    (start.z + end.z) / 2 + (Math.random() - 0.5) * 1.5
  )
  return new THREE.QuadraticBezierCurve3(start, mid, end)
}

function BeamLine({
  start,
  center,
  index,
}: {
  start: [number, number, number]
  center: THREE.Vector3
  index: number
}) {
  const lineRef = useRef<any>(null)
  const dotsRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const { curve, lineGeometry, color } = useMemo(() => {
    const startVec = new THREE.Vector3(...start)
    startVec.y = 0.5 // Raise start slightly above ground
    const c = createCurve(startVec, center)
    const points = c.getPoints(64)
    const geom = new THREE.BufferGeometry().setFromPoints(points)
    const col = index % 2 === 0 ? LIME : ORANGE

    return { curve: c, lineGeometry: geom, color: col }
  }, [start, center, index])

  const lineObject = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      toneMapped: false,
    })
    return new THREE.Line(lineGeometry, mat)
  }, [lineGeometry, color])

  const dotProgress = useRef<number[]>(
    Array.from({ length: DOT_COUNT_PER_BEAM }, (_, i) => i / DOT_COUNT_PER_BEAM)
  )

  useFrame((_, delta) => {
    if (!dotsRef.current) return

    const progs = dotProgress.current
    for (let i = 0; i < DOT_COUNT_PER_BEAM; i++) {
      progs[i] += delta * (0.3 + index * 0.02)
      if (progs[i] > 1) progs[i] -= 1

      const point = curve.getPoint(progs[i])
      dummy.position.copy(point)
      dummy.scale.setScalar(0.04)
      dummy.updateMatrix()
      dotsRef.current!.setMatrixAt(i, dummy.matrix)
    }
    dotsRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      {/* The curved beam line */}
      <primitive object={lineObject} ref={lineRef} />

      {/* Traveling dots */}
      <instancedMesh ref={dotsRef} args={[undefined, undefined, DOT_COUNT_PER_BEAM]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial
          color={color}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  )
}

export default function DataBeams({
  startPositions,
  centerTarget = [0, 3, 0],
}: DataBeamsProps) {
  const center = useMemo(
    () => new THREE.Vector3(...centerTarget),
    [centerTarget]
  )

  return (
    <group>
      {startPositions.map((pos, i) => (
        <BeamLine key={i} start={pos} center={center} index={i} />
      ))}
    </group>
  )
}
