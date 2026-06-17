import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Seeded pseudo-random for deterministic building placement
function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

interface BuildingData {
  position: THREE.Vector3
  scale: THREE.Vector3
  windowEmissive: number
}

function generateBuildings(): BuildingData[] {
  const buildings: BuildingData[] = []
  const roadGap = 0.8 // gap for roads at center

  let seed = 42
  for (let gx = -8; gx <= 8; gx += 1.0) {
    for (let gz = -8; gz <= 8; gz += 1.0) {
      // Leave gap for central road cross
      if (Math.abs(gx) < roadGap || Math.abs(gz) < roadGap) continue

      // Skip some slots for variety
      seed++
      if (seededRandom(seed) < 0.35) continue

      const jitterX = (seededRandom(seed * 2) - 0.5) * 0.3
      const jitterZ = (seededRandom(seed * 3) - 0.5) * 0.3
      const height = 1 + seededRandom(seed * 4) * 7
      const widthX = 0.3 + seededRandom(seed * 5) * 0.4
      const widthZ = 0.3 + seededRandom(seed * 6) * 0.4
      const windowBrightness = 0.05 + seededRandom(seed * 7) * 0.15

      buildings.push({
        position: new THREE.Vector3(gx + jitterX, height / 2, gz + jitterZ),
        scale: new THREE.Vector3(widthX, height, widthZ),
        windowEmissive: windowBrightness,
      })
    }
  }
  return buildings
}

// Custom shader for buildings with window-like emissive pattern
const buildingVertexShader = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec3 vNormal;

  void main() {
    vLocalPos = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const buildingFragmentShader = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec3 vNormal;

  uniform float uTime;

  void main() {
    // Base dark glass color
    vec3 baseColor = vec3(0.051, 0.051, 0.078); // #0D0D14

    // Window grid pattern on side faces (not top/bottom)
    float isSide = 1.0 - abs(vNormal.y);

    // Create window grid using world position
    float windowX = step(0.1, fract(vWorldPos.x * 3.0)) * step(fract(vWorldPos.x * 3.0), 0.6);
    float windowY = step(0.1, fract(vWorldPos.y * 4.0)) * step(fract(vWorldPos.y * 4.0), 0.5);
    float windowZ = step(0.1, fract(vWorldPos.z * 3.0)) * step(fract(vWorldPos.z * 3.0), 0.6);

    // Combine for side faces — use whichever axis is the "facing" direction
    float windowMask = windowY * max(windowX, windowZ) * isSide;

    // Random on/off per window using world position
    float hash = fract(sin(dot(floor(vec2(vWorldPos.x * 3.0, vWorldPos.y * 4.0)), vec2(127.1, 311.7))) * 43758.5453);
    float windowOn = step(0.55, hash);

    // Subtle flicker
    float flicker = 0.85 + 0.15 * sin(uTime * 2.0 + hash * 40.0);

    // Window emissive color — warm white/yellow
    vec3 windowColor = mix(
      vec3(0.6, 0.55, 0.3),
      vec3(0.4, 0.6, 0.9),
      step(0.7, hash)
    );

    vec3 emissive = windowColor * windowMask * windowOn * flicker * 0.3;

    // Subtle edge highlight
    float edgeFresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0) * 0.03;

    vec3 finalColor = baseColor + emissive + vec3(edgeFresnel);

    // Distance fade
    float dist = length(vWorldPos.xz);
    float fade = smoothstep(14.0, 8.0, dist);

    gl_FragColor = vec4(finalColor, fade * 0.95);
  }
`

export default function Buildings() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const buildings = useMemo(() => generateBuildings(), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  )

  useEffect(() => {
    if (!meshRef.current) return

    buildings.forEach((b, i) => {
      dummy.position.copy(b.position)
      dummy.scale.copy(b.scale)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [buildings, dummy])

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, buildings.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={buildingVertexShader}
        fragmentShader={buildingFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite
        side={THREE.FrontSide}
      />
    </instancedMesh>
  )
}
