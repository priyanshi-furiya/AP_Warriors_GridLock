import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const configuredDataDir = process.env.GRIDLOCK_DATA_DIR
  ? path.resolve(process.env.GRIDLOCK_DATA_DIR)
  : null

const dataDirs = [
  configuredDataDir,
  path.join(projectRoot, 'data', 'processed'),
  path.join(projectRoot, 'src', 'data', 'real'),
].filter(Boolean)

const datasets = {
  summary: 'summary.json',
  stations: 'by_station.json',
  vehicles: 'by_vehicle.json',
  hours: 'by_hour.json',
  months: 'by_month.json',
  days: 'by_day.json',
  junctions: 'by_junction.json',
  violationTypes: 'by_violation_type.json',
  geoPoints: 'geo_points.json',
  insights: 'insights.json',
  stationLocations: 'station_locations.json',
  hotspots: 'hotspots.json',
  zones: 'zones.json',
  incidents: 'incidents.json',
  predictionJunctions: 'prediction_junctions.json',
}

const cache = new Map()

export function getDataDirectories() {
  return dataDirs.map((dir) => ({
    path: dir,
    exists: existsSync(dir),
  }))
}

export function getActiveDataDirectory() {
  return dataDirs.find((dir) => existsSync(dir) && readdirSync(dir).some((name) => name.endsWith('.json'))) ?? dataDirs[0]
}

function resolveDatasetPath(datasetName) {
  const filename = datasets[datasetName]
  if (!filename) {
    const known = Object.keys(datasets).join(', ')
    const err = new Error(`Unknown dataset "${datasetName}". Known datasets: ${known}`)
    err.statusCode = 404
    throw err
  }

  for (const dir of dataDirs) {
    const candidate = path.join(dir, filename)
    if (existsSync(candidate)) return candidate
  }

  const err = new Error(`Dataset file "${filename}" was not found in configured data directories.`)
  err.statusCode = 503
  throw err
}

export function readDataset(datasetName) {
  const filePath = resolveDatasetPath(datasetName)
  const stats = statSync(filePath)
  const cached = cache.get(filePath)

  if (cached && cached.mtimeMs === stats.mtimeMs) {
    return cached.value
  }

  const value = JSON.parse(readFileSync(filePath, 'utf8'))
  cache.set(filePath, { mtimeMs: stats.mtimeMs, value })
  return value
}

export function readAllDatasets() {
  return {
    summary: readDataset('summary'),
    stations: readDataset('stations'),
    vehicles: readDataset('vehicles'),
    hours: readDataset('hours'),
    months: readDataset('months'),
    days: readDataset('days'),
    junctions: readDataset('junctions'),
    violationTypes: readDataset('violationTypes'),
    geoPoints: readDataset('geoPoints'),
    insights: readDataset('insights'),
    stationLocations: readDataset('stationLocations'),
    hotspots: readDataset('hotspots'),
    zones: readDataset('zones'),
    incidents: readDataset('incidents'),
    predictionJunctions: readDataset('predictionJunctions'),
  }
}

export function listDatasets() {
  return Object.entries(datasets).map(([name, filename]) => {
    let filePath = null
    let sizeBytes = null
    let updatedAt = null

    for (const dir of dataDirs) {
      const candidate = path.join(dir, filename)
      if (existsSync(candidate)) {
        const stats = statSync(candidate)
        filePath = candidate
        sizeBytes = stats.size
        updatedAt = stats.mtime.toISOString()
        break
      }
    }

    return {
      name,
      filename,
      available: Boolean(filePath),
      path: filePath,
      sizeBytes,
      updatedAt,
    }
  })
}
