import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface RoadDef {
  start: [number, number]
  end: [number, number]
  width: number
  isMajor: boolean
}

const ROADS: RoadDef[] = [
  // Main arterial cross
  { start: [-10, 0], end: [10, 0], width: 0.6, isMajor: true },
  { start: [0, -10], end: [0, 10], width: 0.6, isMajor: true },

  // Secondary horizontal roads
  { start: [-10, 3], end: [10, 3], width: 0.3, isMajor: false },
  { start: [-10, -3], end: [10, -3], width: 0.3, isMajor: false },
  { start: [-10, 6], end: [10, 6], width: 0.25, isMajor: false },
  { start: [-10, -6], end: [10, -6], width: 0.25, isMajor: false },

  // Secondary vertical roads
  { start: [3, -10], end: [3, 10], width: 0.3, isMajor: false },
  { start: [-3, -10], end: [-3, 10], width: 0.3, isMajor: false },
  { start: [6, -10], end: [6, 10], width: 0.25, isMajor: false },
  { start: [-6, -10], end: [-6, 10], width: 0.25, isMajor: false },

  // Diagonal connector
  { start: [-7, -7], end: [7, 7], width: 0.2, isMajor: false },
]

const roadVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const roadFragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;

  uniform float uTime;
  uniform float uIsMajor;

  void main() {
    vec3 limeColor = vec3(0.64, 1.0, 0.07); // #A3FF12

    // Road edge glow — brighter at center, fading at edges
    float edgeFade = 1.0 - pow(abs(vUv.y - 0.5) * 2.0, 2.0);

    // Pulse traveling along the road
    float pulseSpeed = uIsMajor > 0.5 ? 3.0 : 2.0;
    float pulseFreq = uIsMajor > 0.5 ? 1.5 : 2.5;
    float pulse = sin((vUv.x * pulseFreq - uTime * pulseSpeed) * 6.2831) * 0.5 + 0.5;
    pulse = pow(pulse, 4.0); // Sharpen the pulse

    // Base opacity
    float baseAlpha = uIsMajor > 0.5 ? 0.12 : 0.06;
    float pulseAlpha = uIsMajor > 0.5 ? 0.25 : 0.12;

    float alpha = (baseAlpha + pulse * pulseAlpha) * edgeFade;

    // Distance fade
    float dist = length(vWorldPos.xz);
    alpha *= smoothstep(14.0, 8.0, dist);

    if (alpha < 0.005) discard;

    gl_FragColor = vec4(limeColor, alpha);
  }
`

function RoadSegment({ road }: { road: RoadDef }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const { geometry, position, rotation } = useMemo(() => {
    const dx = road.end[0] - road.start[0]
    const dz = road.end[1] - road.start[1]
    const length = Math.sqrt(dx * dx + dz * dz)
    const angle = Math.atan2(dx, dz)

    const cx = (road.start[0] + road.end[0]) / 2
    const cz = (road.start[1] + road.end[1]) / 2

    return {
      geometry: new THREE.PlaneGeometry(length, road.width),
      position: new THREE.Vector3(cx, 0.01, cz),
      rotation: new THREE.Euler(-Math.PI / 2, 0, -angle + Math.PI / 2),
    }
  }, [road])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIsMajor: { value: road.isMajor ? 1.0 : 0.0 },
    }),
    [road.isMajor]
  )

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
    }
  })

  return (
    <mesh geometry={geometry} position={position} rotation={rotation}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={roadVertexShader}
        fragmentShader={roadFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export default function RoadNetwork() {
  return (
    <group>
      {ROADS.map((road, i) => (
        <RoadSegment key={i} road={road} />
      ))}
    </group>
  )
}
