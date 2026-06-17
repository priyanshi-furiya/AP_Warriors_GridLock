import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const gridVertexShader = /* glsl */ `
  varying vec2 vWorldPos;
  varying float vFogFactor;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xz;

    float dist = length(worldPos.xz);
    vFogFactor = smoothstep(2.0, 25.0, dist);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const gridFragmentShader = /* glsl */ `
  varying vec2 vWorldPos;
  varying float vFogFactor;

  uniform float uTime;
  uniform vec3 uColor;

  float gridLine(float coord, float width) {
    float wrappedCoord = fract(coord);
    float line = smoothstep(width, 0.0, abs(wrappedCoord - 0.5) - (0.5 - width));
    return line;
  }

  void main() {
    // Minor grid lines every 1 unit
    float minorX = gridLine(vWorldPos.x, 0.02);
    float minorZ = gridLine(vWorldPos.y, 0.02);
    float minor = max(minorX, minorZ);

    // Major grid lines every 5 units
    float majorX = gridLine(vWorldPos.x / 5.0, 0.03);
    float majorZ = gridLine(vWorldPos.y / 5.0, 0.03);
    float major = max(majorX, majorZ);

    // Combine: major lines are brighter
    float lineAlpha = minor * 0.08 + major * 0.18;

    // Fade with distance
    lineAlpha *= (1.0 - vFogFactor);

    // Subtle pulse on major lines
    float pulse = sin(uTime * 0.5) * 0.02 + 1.0;
    lineAlpha *= pulse;

    if (lineAlpha < 0.005) discard;

    gl_FragColor = vec4(uColor, lineAlpha);
  }
`

export default function FloatingGrid() {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const groupRef = useRef<THREE.Group>(null)
  const { pointer } = useThree()
  const targetOffset = useRef({ x: 0, z: 0 })

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0.64, 1.0, 0.07) }, // Electric Lime
    }),
    []
  )

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
    }

    // Mouse parallax
    if (groupRef.current) {
      targetOffset.current.x = pointer.x * 0.3
      targetOffset.current.z = pointer.y * 0.2

      groupRef.current.position.x +=
        (targetOffset.current.x - groupRef.current.position.x) * delta * 2
      groupRef.current.position.z +=
        (targetOffset.current.z - groupRef.current.position.z) * delta * 2
    }
  })

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} rotation-x={-Math.PI / 2} position-y={0}>
        <planeGeometry args={[60, 60, 1, 1]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={gridVertexShader}
          fragmentShader={gridFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
