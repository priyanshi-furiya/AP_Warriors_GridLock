import { readAllDatasets } from './dataStore.js'

const colors = ['#A3FF12', '#FF6B35', '#FBBF24', '#22C55E', '#818CF8', '#F472B6', '#06B6D4']

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('en-IN')
}

function stationMatchesQuery(station, query) {
  const name = station.name.toLowerCase()
  return (
    query.includes(name) ||
    (name === 'city market' && (query.includes('city market') || query.includes('kr market'))) ||
    (name === 'hal old airport' && (query.includes('hal') || query.includes('airport'))) ||
    (name === 'electronic city' && (query.includes('electronic') || query.includes('e-city'))) ||
    (name === 'hsr layout' && query.includes('hsr')) ||
    (name === 'indiranagar' && query.includes('indira')) ||
    (name === 'malleshwaram' && query.includes('malleswaram'))
  )
}

export function answerQuery(rawQuery) {
  const query = String(rawQuery ?? '').toLowerCase().trim()
  const data = readAllDatasets()

  if (!query) {
    const err = new Error('Query is required.')
    err.statusCode = 400
    throw err
  }

  const station = data.stations.find((entry) => stationMatchesQuery(entry, query))
  if (station) {
    const chartData = Object.entries(station.vehicleClass ?? {})
      .map(([name, count]) => ({
        name,
        count,
        percentage: station.totalViolations ? Number(((count / station.totalViolations) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    return {
      type: 'horizontal-bar',
      title: `${station.name} Police Station Profile`,
      subtitle: `Total violations: ${formatNumber(station.totalViolations)} · Approval: ${station.approvalRate}%`,
      data: chartData,
      dataKey: 'count',
      nameKey: 'name',
      insight: `${station.name} handles ${formatNumber(station.totalViolations)} violations. The leading vehicle class is ${chartData[0]?.name ?? 'unknown'}.`,
      colors,
    }
  }

  if (query.includes('approval') || query.includes('reject') || query.includes('validation')) {
    const sorted = [...data.stations].sort((a, b) => a.approvalRate - b.approvalRate).slice(0, 15)
    return {
      type: 'horizontal-bar',
      title: 'Station Approval Rates',
      subtitle: 'Lowest approval rate first',
      data: sorted.map((entry) => ({
        name: entry.name,
        approvalRate: entry.approvalRate,
        rejectedCount: entry.rejectedCount,
      })),
      dataKey: 'approvalRate',
      nameKey: 'name',
      insight: `${sorted[0]?.name ?? 'The leading station'} has the lowest approval rate at ${sorted[0]?.approvalRate ?? 0}%.`,
      colors: sorted.map((entry) => (entry.approvalRate < 63 ? '#DC2626' : entry.approvalRate < 68 ? '#FF6B35' : '#FBBF24')),
    }
  }

  if (query.includes('risk') || query.includes('danger') || query.includes('critical')) {
    const sorted = data.stations
      .map((entry) => ({
        name: entry.name,
        highRisk: entry.highRisk,
        total: entry.totalViolations,
        riskRate: entry.totalViolations ? Number(((entry.highRisk / entry.totalViolations) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.riskRate - a.riskRate)
      .slice(0, 15)

    return {
      type: 'horizontal-bar',
      title: 'High-Risk Violations by Station',
      subtitle: 'Ranked by high-risk rate',
      data: sorted,
      dataKey: 'riskRate',
      nameKey: 'name',
      insight: `${sorted[0]?.name ?? 'The top station'} has the highest high-risk share at ${sorted[0]?.riskRate ?? 0}%.`,
      colors: sorted.map((entry) => (entry.riskRate > 20 ? '#DC2626' : entry.riskRate > 10 ? '#FF6B35' : '#FBBF24')),
    }
  }

  if (query.includes('junction') || query.includes('cross') || query.includes('intersection') || query.includes('road')) {
    const junctions = [...data.junctions].sort((a, b) => b.count - a.count).slice(0, 15)
    return {
      type: 'horizontal-bar',
      title: 'Top Junctions by Violations',
      subtitle: 'Junction-tagged violation volume from processed data',
      data: junctions.map((entry) => ({
        name: entry.name,
        count: entry.count,
        topVehicle: entry.topVehicle,
      })),
      dataKey: 'count',
      nameKey: 'name',
      insight: `${junctions[0]?.name ?? 'The leading junction'} records the highest junction-tagged volume with ${formatNumber(junctions[0]?.count)} violations.`,
      colors,
    }
  }

  if (query.includes('vehicle') || query.includes('car') || query.includes('scooter') || query.includes('bike') || query.includes('bus')) {
    return {
      type: 'pie',
      title: 'Vehicle Class Distribution',
      subtitle: 'Violations grouped by vehicle class',
      data: data.vehicles.byClass.map((entry) => ({
        name: entry.vehicleClass,
        count: entry.count,
        percentage: entry.percentage,
      })),
      dataKey: 'count',
      nameKey: 'name',
      insight: `${data.vehicles.byClass[0]?.vehicleClass ?? 'The leading class'} is the most common class with ${formatNumber(data.vehicles.byClass[0]?.count)} violations.`,
      colors,
    }
  }

  if (query.includes('hour') || query.includes('time') || query.includes('night') || query.includes('when')) {
    const hourly = data.hours.hourly
    const peak = hourly.reduce((max, entry) => (entry.count > max.count ? entry : max), hourly[0])
    return {
      type: 'area',
      title: 'Hourly Violation Pattern',
      subtitle: '24-hour enforcement distribution',
      data: hourly.map((entry) => ({
        name: `${String(entry.hour).padStart(2, '0')}:00`,
        count: entry.count,
        percentage: entry.percentage,
        approvalRate: entry.approvalRate,
      })),
      dataKey: 'count',
      nameKey: 'name',
      insight: `Peak activity is at ${String(peak.hour).padStart(2, '0')}:00 with ${formatNumber(peak.count)} violations.`,
      colors,
    }
  }

  if (query.includes('month') || query.includes('trend') || query.includes('history')) {
    const peak = data.months.reduce((max, entry) => (entry.count > max.count ? entry : max), data.months[0])
    return {
      type: 'area',
      title: 'Monthly Violation Trend',
      subtitle: `${data.months[0]?.label ?? ''} to ${data.months.at(-1)?.label ?? ''}`,
      data: data.months.map((entry) => ({
        name: entry.label,
        count: entry.count,
        highRisk: entry.highRisk,
      })),
      dataKey: 'count',
      nameKey: 'name',
      insight: `${peak.label} is the peak month with ${formatNumber(peak.count)} violations.`,
      colors,
    }
  }

  if (query.includes('day') || query.includes('week') || query.includes('sunday') || query.includes('weekend')) {
    const highest = data.days.reduce((max, entry) => (entry.count > max.count ? entry : max), data.days[0])
    return {
      type: 'bar',
      title: 'Day-of-Week Pattern',
      subtitle: 'Weekday and weekend enforcement activity',
      data: data.days.map((entry) => ({
        name: entry.shortDay,
        count: entry.count,
        percentage: entry.percentage,
        approvalRate: entry.approvalRate,
      })),
      dataKey: 'count',
      nameKey: 'name',
      insight: `${highest.day} records the most violations with ${formatNumber(highest.count)} cases.`,
      colors,
    }
  }

  if (query.includes('station')) {
    const topStations = [...data.stations].sort((a, b) => b.totalViolations - a.totalViolations).slice(0, 15)
    return {
      type: 'horizontal-bar',
      title: 'Top Stations by Violations',
      subtitle: `Ranked across ${data.summary.totalStations} stations`,
      data: topStations.map((entry) => ({
        name: entry.name,
        violations: entry.totalViolations,
        approvalRate: entry.approvalRate,
      })),
      dataKey: 'violations',
      nameKey: 'name',
      insight: `${topStations[0]?.name ?? 'The leading station'} handles the highest volume with ${formatNumber(topStations[0]?.totalViolations)} violations.`,
      colors,
    }
  }

  if (query.includes('violation') || query.includes('parking') || query.includes('helmet') || query.includes('signal')) {
    const top = data.violationTypes.slice(0, 12)
    return {
      type: 'horizontal-bar',
      title: 'Top Violation Types',
      subtitle: 'Most frequent violation categories',
      data: top.map((entry) => ({
        name: entry.type,
        count: entry.count,
        percentage: entry.percentage,
      })),
      dataKey: 'count',
      nameKey: 'name',
      insight: `${top[0]?.type ?? 'The leading category'} is the most common violation type.`,
      colors,
    }
  }

  const topStations = [...data.stations].sort((a, b) => b.totalViolations - a.totalViolations).slice(0, 15)
  return {
    type: 'horizontal-bar',
    title: 'Top Stations by Violations',
    subtitle: `Ranked across ${data.summary.totalStations} stations`,
    data: topStations.map((entry) => ({
      name: entry.name,
      violations: entry.totalViolations,
      approvalRate: entry.approvalRate,
    })),
    dataKey: 'violations',
    nameKey: 'name',
    insight: `${topStations[0]?.name ?? 'The leading station'} handles the highest volume with ${formatNumber(topStations[0]?.totalViolations)} violations.`,
    colors,
  }
}
