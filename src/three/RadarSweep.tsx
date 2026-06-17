import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const RADIUS = 10
const SWEEP_SEGMENTS = 64
const SWEEP_ARC = Math.PI / 3 // 60-degree wedge

const sweepVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vAngle;

  void main() {
    vUv = uv;
    vAngle = uv.x; // UV.x maps to angle position within wedge
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const sweepFragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying float vAngle;

  uniform vec3 uColor;

  void main() {
    // Gradient: bright at leading edge (uv.x = 1), transparent at trailing (uv.x = 0)
    float alphaGradient = pow(vAngle, 2.5);

    // Fade with distance from center (uv.y = 0 is center, 1 is outer edge)
    float radialFade = smoothstep(1.0, 0.4, vUv.y) * smoothstep(0.0, 0.1, vUv.y);

    float alpha = alphaGradient * radialFade * 0.25;

    if (alpha < 0.003) discard;

    gl_FragColor = vec4(uColor, alpha);
  }
`

function createSweepGeometry(
  radius: number,
  arc: number,
  segments: number,
  radialSegments: number
): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let r = 0; r <= radialSegments; r++) {
    const rFrac = r / radialSegments
    const currentRadius = rFrac * radius

    for (let s = 0; s <= segments; s++) {
      const sFrac = s / segments
      const angle = sFrac * arc

      const x = Math.cos(angle) * currentRadius
      const z = Math.sin(angle) * currentRadius

      positions.push(x, 0, z)
      uvs.push(sFrac, rFrac)
    }
  }

  for (let r = 0; r < radialSegments; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * (segments + 1) + s
      const b = a + 1
      const c = a + (segments + 1)
      const d = c + 1

      indices.push(a, b, c)
      indices.push(b, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  return geometry
}

export default function RadarSweep() {
  const groupRef = useRef<THREE.Group>(null)
  const rotationRef = useRef(0)

  const geometry = useMemo(
    () => createSweepGeometry(RADIUS, SWEEP_ARC, SWEEP_SEGMENTS, 16),
    []
  )

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(0xa3ff12) },
    }),
    []
  )

  useFrame((_, delta) => {
    if (!groupRef.current) return

    // Full rotation every 5 seconds
    const rotationSpeed = (Math.PI * 2) / 5
    rotationRef.current += rotationSpeed * delta
    groupRef.current.rotation.y = rotationRef.current
  })

  return (
    <group ref={groupRef} position-y={0.1}>
      <mesh geometry={geometry}>
        <shaderMaterial
          vertexShader={sweepVertexShader}
          fragmentShader={sweepFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Leading edge line for extra crispness */}
      <mesh rotation-y={SWEEP_ARC}>
        <planeGeometry args={[RADIUS, 0.02]} />
        <meshBasicMaterial
          color={0xa3ff12}
          transparent
          opacity={0.3}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
