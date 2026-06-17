import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

interface HolographicTextProps {
  text: string
  position: [number, number, number]
  color?: string
  fontSize?: number
  animate?: boolean
  anchorX?: 'left' | 'center' | 'right'
  anchorY?: 'top' | 'middle' | 'bottom'
}

export default function HolographicText({
  text,
  position,
  color = '#A3FF12',
  fontSize = 0.3,
  animate = true,
  anchorX = 'center',
  anchorY = 'middle',
}: HolographicTextProps) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const baseY = useRef(position[1])

  useFrame((state) => {
    if (!animate) return

    // Subtle Y bobbing
    if (groupRef.current) {
      groupRef.current.position.y =
        baseY.current + Math.sin(state.clock.elapsedTime * 1.5) * 0.05
    }

    // Subtle opacity flicker
    if (materialRef.current) {
      const flicker =
        0.85 +
        Math.sin(state.clock.elapsedTime * 12) * 0.05 +
        Math.sin(state.clock.elapsedTime * 7.3) * 0.05 +
        Math.sin(state.clock.elapsedTime * 23.7) * 0.03
      materialRef.current.opacity = Math.max(0.6, Math.min(1, flicker))
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <Text
        fontSize={fontSize}
        anchorX={anchorX}
        anchorY={anchorY}
        font="https://fonts.gstatic.com/s/jetbrainsmono/v20/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjOVGPsVQ.woff2"
        outlineWidth={fontSize * 0.04}
        outlineColor="#000000"
      >
        {text}
        <meshBasicMaterial
          ref={materialRef}
          color={color}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </Text>
    </group>
  )
}
