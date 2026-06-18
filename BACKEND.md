# GridLock Backend

The backend is a dependency-free Node.js API server in `server/`.

## Run

```text
npm run dev
```

This starts both the backend API and the Vite frontend.

Backend only:

```text
npm run api
```

Default URL:

```text
http://127.0.0.1:4174
```

The Vite dev server proxies `/api` to this backend, so frontend code can call `/api/...` while `npm run dev` is running.

## Data Folders

Put the original dataset here:

```text
data/raw/
```

Use one of these names:

```text
data/raw/parking_violations_clean.parquet
data/raw/parking_violations_clean.csv
```

Then generate processed API JSON:

```text
python scripts/process_data.py
```

Generated JSON goes here:

```text
data/processed/
```

The API reads `data/processed` first and falls back to the existing frontend data in `src/data/real` when processed data is not present yet.

## Endpoints

```text
GET  /api/health
GET  /api/datasets
GET  /api/dashboard
GET  /api/summary
GET  /api/stations
GET  /api/stations/:name
GET  /api/vehicles
GET  /api/temporal
GET  /api/junctions
GET  /api/violations/types
GET  /api/geo-points
GET  /api/insights
GET  /api/hotspots
GET  /api/zones
GET  /api/incidents
GET  /api/predictions/junctions
POST /api/query
```

Useful query parameters:

```text
/api/stations?limit=15&vehicleClass=2W&dayType=weekend
/api/junctions?limit=10&search=market
/api/temporal?grain=hour
/api/violations/types?limit=12
/api/geo-points?limit=1000
/api/hotspots?limit=20
/api/incidents?limit=100
```

Natural language query example:

```text
POST /api/query
Content-Type: application/json

{"query":"top stations by violations"}
```
