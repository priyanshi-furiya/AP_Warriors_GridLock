import zonesData from './real/zones.json'
import hotspotsData from './real/hotspots.json'
import predictionJunctionsData from './real/prediction_junctions.json'
import type { Hotspot } from './hotspots'

export interface Zone {
  id: string
  name: string
  stationName: string
  color: string
  stats: {
    totalViolations: number
    activeHotspots: number
    patrolUnits: number
    approvalRate: number
    revenue: number
  }
  vehicleComposition: {
    cars: number
    scooters: number
    autos: number
    trucks: number
    buses: number
  }
  trend: number[]
  position: [number, number, number]
  scale: [number, number, number]
}

interface PredictionJunction {
  id: string
  name: string
  hotspotId: string
  baseViolations: number
  hourlyPattern: number[]
}

export const zones = zonesData as Zone[]

const predictionJunctions = predictionJunctionsData as PredictionJunction[]

export const predictions = {
  junctions: predictionJunctions.map(({ id, name, hotspotId }) => ({ id, name, hotspotId })),
  predict: (junctionId: string, hour: number): {
    violations: number
    blockageProbability: number
    congestionLevel: number
    features: { name: string; importance: number }[]
  } => {
    const junction = predictionJunctions.find((entry) => entry.id === junctionId) ?? predictionJunctions[0]
    const hourlyPattern = junction?.hourlyPattern ?? Array(24).fill(0)
    const maxHourly = Math.max(...hourlyPattern, 1)
    const avgHourly = hourlyPattern.reduce((sum, value) => sum + value, 0) / Math.max(hourlyPattern.length, 1)
    const violations = hourlyPattern[hour] || Math.round(avgHourly)
    const congestionLevel = Math.min(100, Math.round((violations / maxHourly) * 100))
    const blockageProbability = Math.min(95, Math.round(congestionLevel * 0.82))
    const isPeak = violations >= maxHourly * 0.75

    return {
      violations,
      blockageProbability,
      congestionLevel,
      features: [
        { name: 'Historical Hour Count', importance: 0.34 },
        { name: 'Junction Total Volume', importance: Math.min(0.3, (junction?.baseViolations ?? 0) / 60000) },
        { name: 'Peak Hour Match', importance: isPeak ? 0.22 : 0.08 },
        { name: 'Recent Processed Dataset', importance: 0.16 },
        { name: 'Station Hotspot Density', importance: 0.1 },
      ].sort((a, b) => b.importance - a.importance),
    }
  },
}

export interface PatrolRoute {
  id: string
  name: string
  color: string
  hotspots: string[]
  estimatedTime: string
  coverage: number
  predictedRevenue: number
  waypoints: [number, number, number][]
}

const hotspots = hotspotsData as Hotspot[]
const routeColors = ['#FF6B35', '#A3FF12', '#FBBF24']

export const patrolRoutes: PatrolRoute[] = Array.from({ length: 3 }, (_, routeIndex) => {
  const routeHotspots = hotspots.slice(routeIndex * 3, routeIndex * 3 + 3)
  const violationTotal = routeHotspots.reduce((sum, hotspot) => sum + hotspot.violationCount, 0)
  const avgSeverity = routeHotspots.length
    ? Math.round(routeHotspots.reduce((sum, hotspot) => sum + hotspot.severity, 0) / routeHotspots.length)
    : 0

  return {
    id: `patrol-${String.fromCharCode(97 + routeIndex)}`,
    name: `Patrol ${String.fromCharCode(65 + routeIndex)}`,
    color: routeColors[routeIndex],
    hotspots: routeHotspots.map((hotspot) => hotspot.name),
    estimatedTime: `${Math.max(1, routeHotspots.length)}h ${String((violationTotal % 45) + 15).padStart(2, '0')}m`,
    coverage: avgSeverity,
    predictedRevenue: violationTotal * 500,
    waypoints: routeHotspots.map((hotspot) => hotspot.position),
  }
})
