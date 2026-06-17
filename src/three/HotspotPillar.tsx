import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

interface HotspotPillarProps {
  position: [number, number, number]
  severity: number // 0-100
  label: string
  count: number
  isSelected: boolean
}

function getSeverityColor(severity: number): THREE.Color {
  if (severity >= 80) return new THREE.Color(0xdc2626) // red
  if (severity >= 60) return new THREE.Color(0xfbbf24) // amber
  return new THREE.Color(0x22c55e) // green
}

function PulsingRing({
  color,
  delay,
  radius,
}: {
  color: THREE.Color
  delay: number
  radius: number
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const elapsed = useRef(delay)

  useFrame((_, delta) => {
    if (!ringRef.current || !materialRef.current) return

    elapsed.current += delta
    const cycle = (elapsed.current % 2.0) / 2.0 // 0 to 1 over 2 seconds

    const scale = radius + cycle * 1.5
    ringRef.current.scale.set(scale, scale, 1)

    // Fade out as it expands
    materialRef.current.opacity = (1 - cycle) * 0.5
  })

  return (
    <mesh ref={ringRef} rotation-x={-Math.PI / 2} position-y={0.02}>
      <ringGeometry args={[0.9, 1.0, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}

export default function HotspotPillar({
  position,
  severity,
  label,
  count,
  isSelected,
}: HotspotPillarProps) {
  const groupRef = useRef<THREE.Group>(null)
  const beamRef = useRef<THREE.Mesh>(null)
  const beamMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const textRef = useRef<THREE.Group>(null)
  const currentScale = useRef(1)

  const color = useMemo(() => getSeverityColor(severity), [severity])

  const beamHeight = useMemo(() => {
    return 1.5 + (severity / 100) * 4
  }, [severity])

  useFrame((state, delta) => {
    // Scale animation
    const targetScale = isSelected ? 1.4 : 1.0
    currentScale.current +=
      (targetScale - currentScale.current) * delta * 5
    if (groupRef.current) {
      groupRef.current.scale.setScalar(currentScale.current)
    }

    // Beam pulse
    if (beamMaterialRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 0.4
      beamMaterialRef.current.opacity = pulse
    }

    // Text float
    if (textRef.current) {
      textRef.current.position.y =
        beamHeight + 0.6 + Math.sin(state.clock.elapsedTime * 2) * 0.08
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Light beam pillar */}
      <mesh
        ref={beamRef}
        position-y={beamHeight / 2}
      >
        <cylinderGeometry args={[0.04, 0.15, beamHeight, 8, 1, true]} />
        <meshBasicMaterial
          ref={beamMaterialRef}
          color={color}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Top cap glow */}
      <mesh position-y={beamHeight}>
        <sphereGeometry args={[0.08, 12, 8]} />
        <meshBasicMaterial
          color={color}
          toneMapped={false}
        />
      </mesh>

      {/* Pulsing concentric rings */}
      <PulsingRing color={color} delay={0} radius={0.3} />
      <PulsingRing color={color} delay={0.66} radius={0.3} />
      <PulsingRing color={color} delay={1.33} radius={0.3} />

      {/* Base glow disc */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Floating text — violation count */}
      <group ref={textRef} position-y={beamHeight + 0.6}>
        <Text
          fontSize={0.25}
          color={color.getStyle()}
          anchorX="center"
          anchorY="bottom"
          font="https://fonts.gstatic.com/s/jetbrainsmono/v20/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjOVGPsVQ.woff2"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {count.toLocaleString()}
        </Text>

        <Text
          fontSize={0.12}
          color="#9CA3AF"
          anchorX="center"
          anchorY="top"
          position-y={-0.05}
          font="https://fonts.gstatic.com/s/jetbrainsmono/v20/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjOVGPsVQ.woff2"
        >
          {label}
        </Text>
      </group>
    </group>
  )
}
