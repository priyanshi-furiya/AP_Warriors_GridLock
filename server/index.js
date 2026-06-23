import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getActiveDataDirectory, getDataDirectories, listDatasets, readAllDatasets, readDataset } from './dataStore.js'
import { answerQuery } from './queryEngine.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const distDir = path.join(projectRoot, 'dist')
const port = Number(process.env.PORT ?? process.env.GRIDLOCK_API_PORT ?? 4174)
const host = process.env.HOST ?? '127.0.0.1'

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, jsonHeaders)
  res.end(JSON.stringify(payload))
}

function parsePositiveInt(value, fallback, max = 10000) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

function sortRows(rows, key, order = 'desc') {
  if (!key) return rows
  const direction = order === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = a[key]
    const right = b[key]
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction
    return String(left ?? '').localeCompare(String(right ?? '')) * direction
  })
}

function filterStations(stations, searchParams) {
  const search = searchParams.get('search')?.trim().toLowerCase()
  const vehicleClass = searchParams.get('vehicleClass')
  const dayType = searchParams.get('dayType')
  const sort = searchParams.get('sort') ?? (vehicleClass ? 'filteredViolations' : 'totalViolations')
  const order = searchParams.get('order') ?? 'desc'
  const limit = parsePositiveInt(searchParams.get('limit'), stations.length)

  let rows = stations.map((station) => {
    let filteredViolations = station.totalViolations

    if (vehicleClass) {
      filteredViolations = station.vehicleClass?.[vehicleClass] ?? 0
    }

    if (dayType === 'weekday' || dayType === 'weekend') {
      const totalDays = (station.weekdayCount ?? 0) + (station.weekendCount ?? 0)
      const ratio = totalDays ? (dayType === 'weekday' ? station.weekdayCount : station.weekendCount) / totalDays : 0
      filteredViolations = Math.round(filteredViolations * ratio)
    }

    return {
      ...station,
      filteredViolations,
    }
  })

  if (search) {
    rows = rows.filter((station) => station.name.toLowerCase().includes(search))
  }

  return sortRows(rows, sort, order).slice(0, limit)
}

function filterJunctions(junctions, searchParams) {
  const search = searchParams.get('search')?.trim().toLowerCase()
  const limit = parsePositiveInt(searchParams.get('limit'), junctions.length)
  let rows = junctions
  if (search) rows = rows.filter((entry) => entry.name.toLowerCase().includes(search))
  return sortRows(rows, searchParams.get('sort') ?? 'count', searchParams.get('order') ?? 'desc').slice(0, limit)
}

function createDashboardPayload(searchParams) {
  const data = readAllDatasets()
  return {
    summary: data.summary,
    stations: filterStations(data.stations, searchParams),
    vehicles: data.vehicles,
    temporal: {
      hourly: data.hours.hourly,
      heatmap: data.hours.heatmap,
      days: data.days,
      months: data.months,
    },
    insights: data.insights,
  }
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return {}
  return JSON.parse(raw)
}

function sendStatic(req, res, pathname) {
  if (!existsSync(distDir)) return false

  const requested = pathname === '/' ? 'index.html' : pathname.slice(1)
  const filePath = path.resolve(distDir, requested)
  if (!filePath.startsWith(distDir)) return false

  const target = existsSync(filePath) && statSync(filePath).isFile()
    ? filePath
    : path.join(distDir, 'index.html')

  const ext = path.extname(target)
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
  }[ext] ?? 'application/octet-stream'

  res.writeHead(200, { 'Content-Type': contentType })
  res.end(readFileSync(target))
  return true
}

async function route(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, jsonHeaders)
    res.end()
    return
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  const pathname = url.pathname.replace(/\/+$/, '') || '/'

  if (req.method === 'GET' && pathname === '/api') {
    sendJson(res, 200, {
      name: 'GridLock API',
      version: '1.0.0',
      endpoints: [
        'GET /api/health',
        'GET /api/datasets',
        'GET /api/dashboard',
        'GET /api/summary',
        'GET /api/stations',
        'GET /api/stations/:name',
        'GET /api/vehicles',
        'GET /api/temporal',
        'GET /api/junctions',
        'GET /api/violations/types',
        'GET /api/geo-points',
        'GET /api/insights',
        'GET /api/hotspots',
        'GET /api/zones',
        'GET /api/incidents',
        'GET /api/predictions/junctions',
        'POST /api/query',
      ],
    })
    return
  }

  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      activeDataDirectory: getActiveDataDirectory(),
      dataDirectories: getDataDirectories(),
    })
    return
  }

  if (req.method === 'GET' && pathname === '/api/datasets') {
    sendJson(res, 200, { dataDirectory: getActiveDataDirectory(), datasets: listDatasets() })
    return
  }

  if (req.method === 'GET' && pathname === '/api/dashboard') {
    sendJson(res, 200, createDashboardPayload(url.searchParams))
    return
  }

  if (req.method === 'GET' && pathname === '/api/summary') {
    sendJson(res, 200, readDataset('summary'))
    return
  }

  if (req.method === 'GET' && pathname === '/api/stations') {
    sendJson(res, 200, filterStations(readDataset('stations'), url.searchParams))
    return
  }

  if (req.method === 'GET' && pathname.startsWith('/api/stations/')) {
    const stationName = decodeURIComponent(pathname.slice('/api/stations/'.length)).toLowerCase()
    const station = readDataset('stations').find((entry) => entry.name.toLowerCase() === stationName)
    if (!station) {
      sendJson(res, 404, { error: 'Station not found.' })
      return
    }
    sendJson(res, 200, station)
    return
  }

  if (req.method === 'GET' && pathname === '/api/vehicles') {
    sendJson(res, 200, readDataset('vehicles'))
    return
  }

  if (req.method === 'GET' && pathname === '/api/temporal') {
    const grain = url.searchParams.get('grain') ?? 'all'
    const payload = {
      hourly: readDataset('hours').hourly,
      heatmap: readDataset('hours').heatmap,
      days: readDataset('days'),
      months: readDataset('months'),
    }
    const grainMap = {
      hour: { hourly: payload.hourly, heatmap: payload.heatmap },
      day: payload.days,
      month: payload.months,
      all: payload,
    }
    sendJson(res, 200, grainMap[grain] ?? payload)
    return
  }

  if (req.method === 'GET' && pathname === '/api/junctions') {
    sendJson(res, 200, filterJunctions(readDataset('junctions'), url.searchParams))
    return
  }

  if (req.method === 'GET' && pathname === '/api/violations/types') {
    const limit = parsePositiveInt(url.searchParams.get('limit'), 1000)
    sendJson(res, 200, readDataset('violationTypes').slice(0, limit))
    return
  }

  if (req.method === 'GET' && pathname === '/api/geo-points') {
    const limit = parsePositiveInt(url.searchParams.get('limit'), 5000, 5000)
    sendJson(res, 200, readDataset('geoPoints').slice(0, limit))
    return
  }

  if (req.method === 'GET' && pathname === '/api/insights') {
    const limit = parsePositiveInt(url.searchParams.get('limit'), 1000)
    sendJson(res, 200, readDataset('insights').slice(0, limit))
    return
  }

  if (req.method === 'GET' && pathname === '/api/hotspots') {
    const limit = parsePositiveInt(url.searchParams.get('limit'), 1000)
    sendJson(res, 200, readDataset('hotspots').slice(0, limit))
    return
  }

  if (req.method === 'GET' && pathname === '/api/zones') {
    sendJson(res, 200, readDataset('zones'))
    return
  }

  if (req.method === 'GET' && pathname === '/api/incidents') {
    const limit = parsePositiveInt(url.searchParams.get('limit'), 500)
    sendJson(res, 200, readDataset('incidents').slice(0, limit))
    return
  }

  if (req.method === 'GET' && pathname === '/api/predictions/junctions') {
    sendJson(res, 200, readDataset('predictionJunctions'))
    return
  }

  if (req.method === 'POST' && pathname === '/api/query') {
    const body = await readJsonBody(req)
    sendJson(res, 200, answerQuery(body.query))
    return
  }

  if (req.method === 'GET' && sendStatic(req, res, pathname)) return

  sendJson(res, 404, { error: 'Route not found.' })
}

export default async function handler(req, res) {
  try {
    await route(req, res)
  } catch (error) {
    const statusCode = error.statusCode ?? (error instanceof SyntaxError ? 400 : 500)
    sendJson(res, statusCode, {
      error: statusCode === 500 ? 'Internal server error.' : error.message,
    })
    if (statusCode === 500) console.error(error)
  }
}

if (!process.env.VERCEL) {
  const server = createServer(handler)
  server.listen(port, host, () => {
    console.log(`GridLock API listening at http://${host}:${port}`)
    console.log(`Data directory: ${getActiveDataDirectory()}`)
  })
}
