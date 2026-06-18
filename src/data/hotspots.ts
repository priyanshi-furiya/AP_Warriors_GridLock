import hotspotsData from './real/hotspots.json'

export interface Hotspot {
  id: string
  name: string
  lat: number
  lng: number
  severity: number
  violationCount: number
  vehicleMix: {
    cars: number
    scooters: number
    autos: number
    trucks: number
    buses: number
  }
  peakHours: string
  peakWindow: [number, number]
  trend: number[]
  topViolations: string[]
  zone: string
  position: [number, number, number]
}

export const hotspots = hotspotsData as Hotspot[]

export function getSeverityColor(severity: number): string {
  if (severity >= 80) return '#DC2626'
  if (severity >= 60) return '#FBBF24'
  return '#22C55E'
}

export function getSeverityLevel(severity: number): 'critical' | 'medium' | 'low' {
  if (severity >= 80) return 'critical'
  if (severity >= 60) return 'medium'
  return 'low'
}
