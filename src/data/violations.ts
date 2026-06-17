export interface Violation {
  id: string
  timestamp: string
  location: string
  hotspotId: string
  vehicleType: 'Car' | 'Scooter' | 'Auto' | 'Truck' | 'Bus'
  violationType: string
  plateNumber: string
  fineAmount: number
  status: 'Pending' | 'Paid' | 'Disputed' | 'Escalated'
  officerId: string
}

const vehicleTypes: Violation['vehicleType'][] = ['Car', 'Scooter', 'Auto', 'Truck', 'Bus']
const violationTypes = [
  'Signal Jump', 'No Helmet', 'Wrong Lane', 'Over Speed', 'No Parking',
  'Drunk Driving', 'No Seat Belt', 'Triple Riding', 'Overloading',
  'Wrong Way', 'Illegal U-Turn', 'Lane Violation', 'Tailgating',
  'Illegal Stop', 'Lane Change'
]
const statuses: Violation['status'][] = ['Pending', 'Paid', 'Disputed', 'Escalated']
const locations = [
  'Silk Board Junction', 'KR Market', 'Majestic Bus Stand', 'Marathahalli Bridge',
  'Hebbal Flyover', 'Koramangala Signal', 'Banashankari Circle', 'Jayanagar 4th Block',
  'Whitefield Main Rd', 'Yeshwanthpur Circle', 'Electronic City Toll', 'Indiranagar 100ft Rd',
  'MG Road Metro', 'Rajajinagar Entrance', 'Sarjapur Road'
]
const hotspotIds = [
  'hp-01', 'hp-02', 'hp-03', 'hp-04', 'hp-05', 'hp-06', 'hp-07', 'hp-08',
  'hp-09', 'hp-10', 'hp-11', 'hp-12', 'hp-13', 'hp-14', 'hp-15'
]

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function generatePlate(rng: () => number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const state = 'KA'
  const district = String(Math.floor(rng() * 50) + 1).padStart(2, '0')
  const series = letters[Math.floor(rng() * 26)] + letters[Math.floor(rng() * 26)]
  const num = String(Math.floor(rng() * 9999) + 1).padStart(4, '0')
  return `${state}${district}${series}${num}`
}

export function generateViolations(count: number = 500): Violation[] {
  const rng = seededRandom(42)
  const violations: Violation[] = []

  for (let i = 0; i < count; i++) {
    const locIndex = Math.floor(rng() * locations.length)
    const hour = Math.floor(rng() * 24)
    const minute = Math.floor(rng() * 60)
    const day = Math.floor(rng() * 7) + 10
    
    violations.push({
      id: `VIO-${String(i + 1).padStart(5, '0')}`,
      timestamp: `2026-06-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
      location: locations[locIndex],
      hotspotId: hotspotIds[locIndex],
      vehicleType: vehicleTypes[Math.floor(rng() * vehicleTypes.length)],
      violationType: violationTypes[Math.floor(rng() * violationTypes.length)],
      plateNumber: generatePlate(rng),
      fineAmount: [500, 1000, 1500, 2000, 2500, 5000, 10000][Math.floor(rng() * 7)],
      status: statuses[Math.floor(rng() * statuses.length)],
      officerId: `OFF-${String(Math.floor(rng() * 30) + 1).padStart(3, '0')}`,
    })
  }

  return violations.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export const violations = generateViolations(500)

// Hourly distribution for temporal analytics
export const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
  const rng = seededRandom(hour + 100)
  // Simulate realistic traffic patterns
  let base = 200
  if (hour >= 7 && hour <= 10) base = 800 + Math.floor(rng() * 400) // morning rush
  else if (hour >= 16 && hour <= 20) base = 900 + Math.floor(rng() * 500) // evening rush
  else if (hour >= 11 && hour <= 15) base = 500 + Math.floor(rng() * 200) // midday
  else if (hour >= 21 || hour <= 2) base = 300 + Math.floor(rng() * 200) // night
  else base = 150 + Math.floor(rng() * 100) // early morning
  
  return {
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    violations: base,
    severity: Math.min(100, Math.floor(base / 14)),
  }
})
