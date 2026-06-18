import incidentsData from './real/incidents.json'

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

export const violations = incidentsData as Violation[]

export const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
  const count = violations.filter((violation) => new Date(violation.timestamp).getHours() === hour).length
  return {
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    violations: count,
    severity: Math.min(100, Math.floor(count / 2)),
  }
})
