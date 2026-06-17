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

export const zones: Zone[] = [
  {
    id: 'zone-01',
    name: 'Central',
    stationName: 'Cubbon Park PS',
    color: '#FF6B35',
    stats: { totalViolations: 4230, activeHotspots: 6, patrolUnits: 3, approvalRate: 87, revenue: 845000 },
    vehicleComposition: { cars: 35, scooters: 30, autos: 20, trucks: 8, buses: 7 },
    trend: [3800, 3900, 4050, 4100, 4200, 4150, 4230],
    position: [0, 0, 0.5],
    scale: [2.5, 1, 2.5],
  },
  {
    id: 'zone-02',
    name: 'South',
    stationName: 'Jayanagar PS',
    color: '#A3FF12',
    stats: { totalViolations: 3670, activeHotspots: 5, patrolUnits: 2, approvalRate: 82, revenue: 734000 },
    vehicleComposition: { cars: 40, scooters: 32, autos: 16, trucks: 6, buses: 6 },
    trend: [3200, 3350, 3400, 3500, 3600, 3580, 3670],
    position: [-1, 0, -3],
    scale: [3, 1, 2.5],
  },
  {
    id: 'zone-03',
    name: 'East',
    stationName: 'Whitefield PS',
    color: '#E5E7EB',
    stats: { totalViolations: 3420, activeHotspots: 4, patrolUnits: 2, approvalRate: 79, revenue: 684000 },
    vehicleComposition: { cars: 48, scooters: 25, autos: 12, trucks: 10, buses: 5 },
    trend: [3000, 3100, 3200, 3250, 3350, 3380, 3420],
    position: [4, 0, 0.5],
    scale: [2.5, 1, 3],
  },
  {
    id: 'zone-04',
    name: 'North',
    stationName: 'Hebbal PS',
    color: '#FBBF24',
    stats: { totalViolations: 2890, activeHotspots: 3, patrolUnits: 2, approvalRate: 85, revenue: 578000 },
    vehicleComposition: { cars: 38, scooters: 28, autos: 15, trucks: 12, buses: 7 },
    trend: [2500, 2600, 2700, 2750, 2800, 2850, 2890],
    position: [0, 0, 4],
    scale: [3, 1, 2],
  },
  {
    id: 'zone-05',
    name: 'West',
    stationName: 'Rajajinagar PS',
    color: '#14B8A6',
    stats: { totalViolations: 2540, activeHotspots: 3, patrolUnits: 2, approvalRate: 81, revenue: 508000 },
    vehicleComposition: { cars: 32, scooters: 35, autos: 20, trucks: 7, buses: 6 },
    trend: [2200, 2300, 2350, 2400, 2450, 2500, 2540],
    position: [-4, 0, 1.5],
    scale: [2.5, 1, 3],
  },
  {
    id: 'zone-06',
    name: 'Southeast',
    stationName: 'Electronic City PS',
    color: '#DC2626',
    stats: { totalViolations: 2310, activeHotspots: 3, patrolUnits: 1, approvalRate: 76, revenue: 462000 },
    vehicleComposition: { cars: 50, scooters: 22, autos: 10, trucks: 13, buses: 5 },
    trend: [1900, 2000, 2100, 2150, 2200, 2270, 2310],
    position: [2, 0, -4],
    scale: [2.5, 1, 2],
  },
  {
    id: 'zone-07',
    name: 'Southwest',
    stationName: 'Banashankari PS',
    color: '#8B5CF6',
    stats: { totalViolations: 1980, activeHotspots: 2, patrolUnits: 1, approvalRate: 83, revenue: 396000 },
    vehicleComposition: { cars: 34, scooters: 38, autos: 18, trucks: 5, buses: 5 },
    trend: [1700, 1750, 1800, 1850, 1900, 1940, 1980],
    position: [-4, 0, -2.5],
    scale: [2, 1, 2.5],
  },
  {
    id: 'zone-08',
    name: 'Northeast',
    stationName: 'Yelahanka PS',
    color: '#06B6D4',
    stats: { totalViolations: 1640, activeHotspots: 2, patrolUnits: 1, approvalRate: 88, revenue: 328000 },
    vehicleComposition: { cars: 36, scooters: 30, autos: 18, trucks: 10, buses: 6 },
    trend: [1400, 1450, 1500, 1540, 1580, 1610, 1640],
    position: [3, 0, 4],
    scale: [2, 1, 2],
  },
]

export const predictions = {
  junctions: [
    { id: 'jn-01', name: 'KR Market', hotspotId: 'hp-02' },
    { id: 'jn-02', name: 'Silk Board Junction', hotspotId: 'hp-01' },
    { id: 'jn-03', name: 'Marathahalli Bridge', hotspotId: 'hp-04' },
    { id: 'jn-04', name: 'Hebbal Flyover', hotspotId: 'hp-05' },
    { id: 'jn-05', name: 'Majestic Bus Stand', hotspotId: 'hp-03' },
  ],
  predict: (junctionId: string, hour: number): {
    violations: number
    blockageProbability: number
    congestionLevel: number
    features: { name: string; importance: number }[]
  } => {
    const rng = ((junctionId.charCodeAt(3) * 17 + hour * 31) % 100) / 100
    const isRush = (hour >= 7 && hour <= 10) || (hour >= 16 && hour <= 20)
    const base = isRush ? 250 + Math.floor(rng * 150) : 80 + Math.floor(rng * 100)

    return {
      violations: base,
      blockageProbability: Math.min(95, Math.floor(base / 4.2)),
      congestionLevel: Math.min(100, Math.floor(base / 3.8)),
      features: [
        { name: 'Time of Day', importance: 0.28 + rng * 0.1 },
        { name: 'Day of Week', importance: 0.18 + rng * 0.05 },
        { name: 'Weather', importance: 0.15 + rng * 0.08 },
        { name: 'Events Nearby', importance: 0.12 + rng * 0.06 },
        { name: 'Historical Avg', importance: 0.10 + rng * 0.04 },
        { name: 'Road Capacity', importance: 0.08 + rng * 0.03 },
        { name: 'Signal Timing', importance: 0.05 + rng * 0.02 },
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

export const patrolRoutes: PatrolRoute[] = [
  {
    id: 'patrol-a',
    name: 'Patrol Alpha',
    color: '#FF6B35',
    hotspots: ['Silk Board Junction', 'Koramangala Signal', 'BTM Layout Signal'],
    estimatedTime: '2h 15m',
    coverage: 87,
    predictedRevenue: 456000,
    waypoints: [
      [2.5, 0.2, -1.2], [2.0, 0.2, -1.8], [1.8, 0.2, -2.5], [1.0, 0.2, -3.2], [0.5, 0.2, -3.8]
    ],
  },
  {
    id: 'patrol-b',
    name: 'Patrol Bravo',
    color: '#A3FF12',
    hotspots: ['KR Market', 'Majestic Bus Stand', 'Rajajinagar Entrance'],
    estimatedTime: '1h 45m',
    coverage: 82,
    predictedRevenue: 389000,
    waypoints: [
      [-1.8, 0.2, 0.5], [-2.0, 0.2, 1.2], [-2.2, 0.2, 1.8], [-2.4, 0.2, 2.2], [-2.5, 0.2, 2.5]
    ],
  },
  {
    id: 'patrol-c',
    name: 'Patrol Charlie',
    color: '#FBBF24',
    hotspots: ['Marathahalli Bridge', 'Whitefield Main Rd', 'Indiranagar 100ft Rd'],
    estimatedTime: '2h 30m',
    coverage: 78,
    predictedRevenue: 367000,
    waypoints: [
      [4.0, 0.2, 0.2], [4.5, 0.2, 0.8], [5.0, 0.2, 1.2], [5.5, 0.2, 1.5], [4.0, 0.2, 1.8], [3.0, 0.2, 2.0]
    ],
  },
]
