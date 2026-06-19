import { create } from 'zustand'
import summaryData from '@/data/real/summary.json'
import stationData from '@/data/real/by_station.json'
import vehicleData from '@/data/real/by_vehicle.json'
import hourlyData from '@/data/real/by_hour.json'
import monthlyData from '@/data/real/by_month.json'
import dayData from '@/data/real/by_day.json'
import insightsData from '@/data/real/insights.json'
import { hotspots as initialHotspots } from '@/data/hotspots'
import { zones as initialZones, patrolRoutes as initialPatrolRoutes } from '@/data/zones'
import { violations as initialViolations, type Violation } from '@/data/violations'
import type { LiveEvent } from './liveStreamStore'

type StationData = typeof stationData
type VehicleData = typeof vehicleData
type HourlyData = typeof hourlyData
type MonthlyData = typeof monthlyData
type DayData = typeof dayData
type SummaryData = typeof summaryData

export interface DataState {
  summary: SummaryData
  stations: StationData
  vehicles: VehicleData
  hourly: HourlyData
  monthly: MonthlyData
  days: DayData
  insights: typeof insightsData
  hotspots: typeof initialHotspots
  zones: typeof initialZones
  patrolRoutes: typeof initialPatrolRoutes
  violations: typeof initialViolations
  addIncident: (event: LiveEvent) => void
}

export const useDataStore = create<DataState>((set) => ({
  summary: JSON.parse(JSON.stringify(summaryData)),
  stations: JSON.parse(JSON.stringify(stationData)),
  vehicles: JSON.parse(JSON.stringify(vehicleData)),
  hourly: JSON.parse(JSON.stringify(hourlyData)),
  monthly: JSON.parse(JSON.stringify(monthlyData)),
  days: JSON.parse(JSON.stringify(dayData)),
  insights: JSON.parse(JSON.stringify(insightsData)),
  hotspots: JSON.parse(JSON.stringify(initialHotspots)),
  zones: JSON.parse(JSON.stringify(initialZones)),
  patrolRoutes: JSON.parse(JSON.stringify(initialPatrolRoutes)),
  violations: JSON.parse(JSON.stringify(initialViolations)),

  addIncident: (event: LiveEvent) => set((state) => {
    // Deep clone to safely mutate
    const summary = JSON.parse(JSON.stringify(state.summary)) as SummaryData
    const stations = JSON.parse(JSON.stringify(state.stations)) as StationData
    const vehicles = JSON.parse(JSON.stringify(state.vehicles)) as VehicleData
    const hourly = JSON.parse(JSON.stringify(state.hourly)) as HourlyData
    const days = JSON.parse(JSON.stringify(state.days)) as DayData
    const monthly = JSON.parse(JSON.stringify(state.monthly)) as MonthlyData
    const hotspots = JSON.parse(JSON.stringify(state.hotspots)) as typeof initialHotspots
    const zones = JSON.parse(JSON.stringify(state.zones)) as typeof initialZones
    const patrolRoutes = JSON.parse(JSON.stringify(state.patrolRoutes)) as typeof initialPatrolRoutes
    const violations = JSON.parse(JSON.stringify(state.violations)) as typeof initialViolations

    // 1. Update summary
    summary.totalViolations += 1

    // 2. Update stations
    const stationIndex = stations.findIndex(s => s.name === event.station)
    if (stationIndex !== -1) {
      stations[stationIndex].totalViolations += 1
      const vClass = event.vehicleClass as keyof typeof stations[0]['vehicleClass']
      if (vClass && stations[stationIndex].vehicleClass[vClass] !== undefined) {
        stations[stationIndex].vehicleClass[vClass] += 1
      }
    }

    // 3. Update vehicles
    const vClassIndex = vehicles.byClass.findIndex(v => v.vehicleClass === event.vehicleClass)
    if (vClassIndex !== -1) {
      vehicles.byClass[vClassIndex].count += 1
    }

    // 4. Update hourly
    const eventDate = new Date(event.timestamp)
    const hour = eventDate.getHours()
    const hourIndex = hourly.hourly.findIndex(h => h.hour === hour)
    if (hourIndex !== -1) {
      hourly.hourly[hourIndex].count += 1
    }
    
    // 5. Update days
    const day = eventDate.getDay() // 0 is Sunday
    // map to shortDay: 'Sun', 'Mon' etc
    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const shortDay = daysMap[day]
    const dayIndex = days.findIndex(d => d.shortDay === shortDay)
    if (dayIndex !== -1) {
      days[dayIndex].count += 1
    }

    // 6. Update violations (add to top)
    const newViolation: Violation = {
      id: event.id,
      timestamp: event.timestamp,
      location: event.location || 'Unknown Location',
      hotspotId: event.hotspot || 'unknown-hotspot', // map from hotspot name to ID or use as is
      vehicleType: event.vehicleClass === '2W' ? 'Scooter' : event.vehicleClass === '3W' ? 'Auto' : event.vehicleClass === 'CAR' ? 'Car' : event.vehicleClass === 'HV' ? 'Truck' : 'Bus',
      violationType: event.violationType || 'Unknown Violation',
      plateNumber: event.plateNumber || 'UNKNOWN',
      fineAmount: 500, // mock fine
      status: 'Pending',
      officerId: 'SYS-AUTO'
    }
    violations.unshift(newViolation)
    if (violations.length > 500) violations.pop() // keep last 500 to avoid memory leak

    // 7. Update hotspots
    const hotspotIndex = hotspots.findIndex(h => h.name === event.hotspot || h.id === event.hotspot)
    if (hotspotIndex !== -1) {
      hotspots[hotspotIndex].violationCount += 1
      const vTypeLower = newViolation.vehicleType.toLowerCase() + 's'
      if (hotspots[hotspotIndex].vehicleMix[vTypeLower as keyof typeof hotspots[0]['vehicleMix']] !== undefined) {
        hotspots[hotspotIndex].vehicleMix[vTypeLower as keyof typeof hotspots[0]['vehicleMix']] += 1
      }
      hotspots[hotspotIndex].severity = Math.min(100, hotspots[hotspotIndex].severity + 0.1)
    }

    // 8. Update zones
    const zoneIndex = zones.findIndex(z => z.stationName === event.station)
    if (zoneIndex !== -1) {
      zones[zoneIndex].stats.totalViolations += 1
      const vTypeLower = newViolation.vehicleType.toLowerCase() + 's'
      if (zones[zoneIndex].vehicleComposition[vTypeLower as keyof typeof zones[0]['vehicleComposition']] !== undefined) {
        zones[zoneIndex].vehicleComposition[vTypeLower as keyof typeof zones[0]['vehicleComposition']] += 1
      }
    }

    // 9. Update patrol routes
    if (hotspotIndex !== -1) {
      const hName = hotspots[hotspotIndex].name
      patrolRoutes.forEach(route => {
        if (route.hotspots.includes(hName)) {
          route.predictedRevenue += 500
        }
      })
    }

    return {
      summary,
      stations,
      vehicles,
      hourly,
      days,
      monthly,
      hotspots,
      zones,
      patrolRoutes,
      violations
    }
  })
}))
