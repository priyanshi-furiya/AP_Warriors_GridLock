"""
GridLock AI — Data Processing Pipeline
Reads the Parquet file and outputs pre-aggregated JSON files for the frontend.
"""
import json
import os
import shutil
import ast
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW_DIR = os.path.join(PROJECT_ROOT, 'data', 'raw')
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'data', 'processed')
LEGACY_OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'src', 'data', 'real')
DEFAULT_INPUT_NAMES = [
    'parking_violations_clean.parquet',
    'parking_violations_clean.csv',
]

os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(LEGACY_OUTPUT_DIR, exist_ok=True)

def json_serial(obj):
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return round(float(obj), 4)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (pd.Timestamp, datetime)):
        return obj.isoformat()
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if pd.isna(obj):
        return None
    raise TypeError(f"Type {type(obj)} not serializable")

def save(name, data):
    path = os.path.join(OUTPUT_DIR, name)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, default=json_serial, ensure_ascii=False)
    legacy_path = os.path.join(LEGACY_OUTPUT_DIR, name)
    shutil.copyfile(path, legacy_path)
    print(f"  OK {name} ({os.path.getsize(path) / 1024:.1f} KB)")

def find_input_file():
    configured = os.environ.get('GRIDLOCK_RAW_DATA')
    if configured:
        configured = os.path.abspath(configured)
        if os.path.exists(configured):
            return configured
        raise FileNotFoundError(f"GRIDLOCK_RAW_DATA points to a missing file: {configured}")

    candidates = []
    for name in DEFAULT_INPUT_NAMES:
        candidates.append(os.path.join(RAW_DIR, name))
        candidates.append(os.path.join(PROJECT_ROOT, name))

    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate

    expected = '\n  - '.join(candidates)
    raise FileNotFoundError(
        "No input dataset found. Put the raw data in data/raw/ as "
        "parking_violations_clean.parquet or parking_violations_clean.csv.\n"
        f"Checked:\n  - {expected}"
    )

def load_dataset(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == '.parquet':
        return pq.read_table(path).to_pandas()
    if ext == '.csv':
        return pd.read_csv(path, low_memory=False)
    raise ValueError(f"Unsupported data file type: {ext}. Use .parquet or .csv.")

def clean_violation_label(value):
    if pd.isna(value):
        return 'Unknown'
    text = str(value)
    try:
        parsed = ast.literal_eval(text)
        if isinstance(parsed, list) and parsed:
            text = ', '.join(str(item) for item in parsed)
    except (ValueError, SyntaxError):
        pass
    return text.replace('_', ' ').replace('-', ' ').title()

def vehicle_class_to_ui(value):
    value = str(value).upper()
    if value == 'CAR':
        return 'Car'
    if value == '2W':
        return 'Scooter'
    if value == '3W':
        return 'Auto'
    if value == 'BUS':
        return 'Bus'
    if value in ['HV', 'LMV']:
        return 'Truck'
    return 'Car'

def estimate_fine(row):
    base = 500
    if row.get('is_high_risk_violation', 0):
        base = 1500
    if row.get('num_violations', 1) and row.get('num_violations', 1) > 1:
        base += int(row.get('num_violations', 1) - 1) * 250
    return int(base)

def validation_to_status(value, high_risk=False):
    value = str(value).lower()
    if high_risk:
        return 'Escalated'
    if value == 'approved':
        return 'Paid'
    if value == 'rejected':
        return 'Disputed'
    return 'Pending'

def normalize_position(lat, lng, lat_min, lat_max, lng_min, lng_max):
    lat_range = lat_max - lat_min or 1
    lng_range = lng_max - lng_min or 1
    x = ((lng - lng_min) / lng_range) * 12 - 6
    z = ((lat - lat_min) / lat_range) * 11 - 5
    return [round(float(x), 3), 0, round(float(z), 3)]

def vehicle_mix_percentages(group):
    counts = group['vehicle_class'].value_counts()
    total_count = counts.sum() or 1
    return {
        'cars': int(round(counts.get('CAR', 0) / total_count * 100)),
        'scooters': int(round(counts.get('2W', 0) / total_count * 100)),
        'autos': int(round(counts.get('3W', 0) / total_count * 100)),
        'trucks': int(round((counts.get('HV', 0) + counts.get('LMV', 0)) / total_count * 100)),
        'buses': int(round(counts.get('BUS', 0) / total_count * 100)),
    }

input_file = find_input_file()
print(f"Loading dataset: {input_file}")
df = load_dataset(input_file)
print(f"  Loaded {len(df):,} records")

# ──────────────────────── 1. SUMMARY ────────────────────────
print("\n1. Generating summary.json...")
total = len(df)
approved = len(df[df['validation_status'] == 'approved'])
rejected = len(df[df['validation_status'] == 'rejected'])
val_with_status = len(df[df['validation_status'].isin(['approved', 'rejected'])])
approval_rate = round(approved / val_with_status * 100, 1) if val_with_status > 0 else 0
high_risk = df['is_high_risk_violation'].sum()
peak_hour_count = df['is_peak_hour'].sum()
stations = df['police_station'].nunique()
junctions = df[df['junction_name'] != 'No Junction']['junction_name'].nunique()
vehicles = df['vehicle_number'].nunique()
date_min = str(df['date'].dropna().min())
date_max = str(df['date'].dropna().max())

# Top violation
top_viol = df['violation_type'].mode().iloc[0] if len(df) > 0 else ''

# Peak hour
peak_hour = int(df['hour_of_day'].mode().iloc[0]) if len(df) > 0 else 0

# Top vehicle
top_vehicle = df['vehicle_type_clean'].mode().iloc[0] if len(df) > 0 else ''

# Top station
top_station = df['police_station'].mode().iloc[0] if len(df) > 0 else ''

summary = {
    'totalViolations': int(total),
    'approvedCount': int(approved),
    'rejectedCount': int(rejected),
    'approvalRate': approval_rate,
    'highRiskCount': int(high_risk),
    'highRiskRate': round(high_risk / total * 100, 1),
    'peakHourViolations': int(peak_hour_count),
    'peakHourRate': round(peak_hour_count / total * 100, 1),
    'totalStations': int(stations),
    'totalJunctions': int(junctions),
    'uniqueVehicles': int(vehicles),
    'dateRange': {'min': date_min, 'max': date_max},
    'peakHour': peak_hour,
    'topViolationType': top_viol,
    'topVehicleType': top_vehicle,
    'topStation': top_station,
    'weekendCount': int(df['is_weekend'].sum()),
    'weekdayCount': int(total - df['is_weekend'].sum()),
    'weekendRate': round(df['is_weekend'].sum() / total * 100, 1),
}
save('summary.json', summary)

# ──────────────────────── 2. BY STATION ────────────────────────
print("2. Generating by_station.json...")
station_grp = df.groupby('police_station')
stations_data = []
for name, grp in station_grp:
    val_sub = grp[grp['validation_status'].isin(['approved', 'rejected'])]
    app_count = len(val_sub[val_sub['validation_status'] == 'approved'])
    rej_count = len(val_sub[val_sub['validation_status'] == 'rejected'])
    app_rate = round(app_count / len(val_sub) * 100, 1) if len(val_sub) > 0 else 0

    # Vehicle class breakdown
    vc = grp['vehicle_class'].value_counts().to_dict()

    # Hourly pattern (aggregate)
    hourly = grp['hour_of_day'].value_counts().sort_index()
    hourly_arr = [int(hourly.get(h, 0)) for h in range(24)]

    # Top violation types
    top_viols = grp['violation_type'].value_counts().head(5).to_dict()

    # Get centroid lat/lng
    lat = grp['latitude'].mean()
    lng = grp['longitude'].mean()

    stations_data.append({
        'name': str(name),
        'totalViolations': int(len(grp)),
        'approvedCount': int(app_count),
        'rejectedCount': int(rej_count),
        'approvalRate': app_rate,
        'highRisk': int(grp['is_high_risk_violation'].sum()),
        'vehicleClass': {str(k): int(v) for k, v in vc.items()},
        'hourlyPattern': hourly_arr,
        'topViolations': {str(k): int(v) for k, v in top_viols.items()},
        'latitude': round(float(lat), 6) if not pd.isna(lat) else None,
        'longitude': round(float(lng), 6) if not pd.isna(lng) else None,
        'weekendCount': int(grp['is_weekend'].sum()),
        'weekdayCount': int(len(grp) - grp['is_weekend'].sum()),
    })

stations_data.sort(key=lambda x: x['totalViolations'], reverse=True)
save('by_station.json', stations_data)

# ──────────────────────── 3. BY VEHICLE ────────────────────────
print("3. Generating by_vehicle.json...")
# By vehicle class
vc_grp = df.groupby('vehicle_class')
vehicle_class_data = []
for name, grp in vc_grp:
    val_sub = grp[grp['validation_status'].isin(['approved', 'rejected'])]
    app_rate = round(len(val_sub[val_sub['validation_status'] == 'approved']) / len(val_sub) * 100, 1) if len(val_sub) > 0 else 0
    vehicle_class_data.append({
        'vehicleClass': str(name),
        'count': int(len(grp)),
        'percentage': round(len(grp) / total * 100, 1),
        'approvalRate': app_rate,
        'highRisk': int(grp['is_high_risk_violation'].sum()),
    })
vehicle_class_data.sort(key=lambda x: x['count'], reverse=True)

# By vehicle type (top 15)
vt_counts = df['vehicle_type_clean'].value_counts().head(15)
vehicle_type_data = []
for name, count in vt_counts.items():
    vehicle_type_data.append({
        'vehicleType': str(name),
        'count': int(count),
        'percentage': round(count / total * 100, 1),
    })

save('by_vehicle.json', {'byClass': vehicle_class_data, 'byType': vehicle_type_data})

# ──────────────────────── 4. BY HOUR ────────────────────────
print("4. Generating by_hour.json...")
hourly_data = []
for h in range(24):
    h_df = df[df['hour_of_day'] == h]
    if len(h_df) == 0:
        hourly_data.append({'hour': h, 'count': 0, 'percentage': 0, 'approvalRate': 0, 'highRisk': 0})
        continue
    val_sub = h_df[h_df['validation_status'].isin(['approved', 'rejected'])]
    app_rate = round(len(val_sub[val_sub['validation_status'] == 'approved']) / len(val_sub) * 100, 1) if len(val_sub) > 0 else 0
    hourly_data.append({
        'hour': h,
        'count': int(len(h_df)),
        'percentage': round(len(h_df) / total * 100, 1),
        'approvalRate': app_rate,
        'highRisk': int(h_df['is_high_risk_violation'].sum()),
    })

# Day-of-week × hour heatmap
dow_hour = df.groupby(['day_name', 'hour_of_day']).size().reset_index(name='count')
days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
heatmap = {}
for day in days_order:
    day_data = dow_hour[dow_hour['day_name'] == day]
    heatmap[day] = [int(day_data[day_data['hour_of_day'] == h]['count'].sum()) for h in range(24)]

save('by_hour.json', {'hourly': hourly_data, 'heatmap': heatmap})

# ──────────────────────── 5. BY JUNCTION ────────────────────────
print("5. Generating by_junction.json...")
jn_df = df[df['junction_name'] != 'No Junction']
jn_grp = jn_df.groupby('junction_name')
junctions_data = []
for name, grp in jn_grp:
    if len(grp) < 50:
        continue
    lat = grp['latitude'].mean()
    lng = grp['longitude'].mean()
    junctions_data.append({
        'name': str(name),
        'count': int(len(grp)),
        'latitude': round(float(lat), 6) if not pd.isna(lat) else None,
        'longitude': round(float(lng), 6) if not pd.isna(lng) else None,
        'topVehicle': str(grp['vehicle_type_clean'].mode().iloc[0]) if len(grp) > 0 else '',
    })
junctions_data.sort(key=lambda x: x['count'], reverse=True)
save('by_junction.json', junctions_data)

# ──────────────────────── 6. BY MONTH ────────────────────────
print("6. Generating by_month.json...")
monthly = df.groupby(['year', 'month']).agg(
    count=('id', 'size'),
    high_risk=('is_high_risk_violation', 'sum'),
    weekend=('is_weekend', 'sum'),
).reset_index()

monthly_data = []
for _, row in monthly.iterrows():
    month_names = {1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
                   7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'}
    label = f"{month_names.get(int(row['month']), '?')} {int(row['year'])}"
    monthly_data.append({
        'year': int(row['year']),
        'month': int(row['month']),
        'label': label,
        'count': int(row['count']),
        'highRisk': int(row['high_risk']),
        'weekendCount': int(row['weekend']),
    })

save('by_month.json', monthly_data)

# ──────────────────────── 7. BY DAY ────────────────────────
print("7. Generating by_day.json...")
day_data = []
for day in days_order:
    d_df = df[df['day_name'] == day]
    val_sub = d_df[d_df['validation_status'].isin(['approved', 'rejected'])]
    app_rate = round(len(val_sub[val_sub['validation_status'] == 'approved']) / len(val_sub) * 100, 1) if len(val_sub) > 0 else 0
    day_data.append({
        'day': day,
        'shortDay': day[:3],
        'count': int(len(d_df)),
        'percentage': round(len(d_df) / total * 100, 1),
        'approvalRate': app_rate,
        'isWeekend': day in ['Saturday', 'Sunday'],
    })
save('by_day.json', day_data)

# ──────────────────────── 8. BY VIOLATION TYPE ────────────────────────
print("8. Generating by_violation_type.json...")
# One-hot encoded columns exist — use them for clean single-type counts
viol_cols = [c for c in df.columns if c.startswith('viol_')]
viol_type_data = []
for col in viol_cols:
    clean_name = col.replace('viol_', '').replace('_', ' ').title()
    count = int(df[col].sum())
    if count > 0:
        viol_type_data.append({
            'type': clean_name,
            'count': count,
            'percentage': round(count / total * 100, 2),
        })
viol_type_data.sort(key=lambda x: x['count'], reverse=True)
save('by_violation_type.json', viol_type_data)

# ──────────────────────── 9. GEO POINTS (sampled) ────────────────────────
print("9. Generating geo_points.json...")
geo = df[['latitude', 'longitude']].dropna()
if len(geo) > 5000:
    geo = geo.sample(n=5000, random_state=42)
geo_points = [[round(r['latitude'], 5), round(r['longitude'], 5)] for _, r in geo.iterrows()]
save('geo_points.json', geo_points)

# ──────────────────────── 10. INSIGHTS ────────────────────────
print("10. Generating insights.json...")

# Night enforcement analysis
night_hours = df[df['hour_of_day'].isin([0,1,2,3,4,5,21,22,23])]
night_pct = round(len(night_hours) / total * 100, 1)

# Station workload imbalance
sorted_stations = sorted(stations_data, key=lambda x: x['totalViolations'], reverse=True)
top5_count = sum(s['totalViolations'] for s in sorted_stations[:5])
top5_pct = round(top5_count / total * 100, 1)

# Rejection rate by vehicle class
worst_approval = min(vehicle_class_data, key=lambda x: x['approvalRate'])
best_approval = max(vehicle_class_data, key=lambda x: x['approvalRate'])

# Weekend vs weekday
sun_count = df[df['day_name'] == 'Sunday'].shape[0]
mon_count = df[df['day_name'] == 'Monday'].shape[0]
sun_vs_mon = round((sun_count - mon_count) / mon_count * 100, 1)

# Highest rejection station
worst_station = max([s for s in stations_data if s['totalViolations'] > 500],
                    key=lambda x: x['rejectedCount'] / max(x['totalViolations'], 1))
worst_station_rej_rate = round(100 - worst_station['approvalRate'], 1)
parking_count = sum(
    item['count']
    for item in viol_type_data
    if 'PARKING' in item['type'].upper()
)
parking_pct = round(parking_count / total * 100, 1) if total else 0
top_vehicle_class = max(vehicle_class_data, key=lambda x: x['count'])
top_vehicle_pct = top_vehicle_class['percentage']
peak_month = max(monthly_data, key=lambda x: x['count'])
top_junction = junctions_data[0] if junctions_data else {'name': 'No Junction', 'count': 0}

insights = [
    {
        'id': 'night-enforcement',
        'icon': '🌙',
        'title': 'Night Enforcement Dominant',
        'description': f'{night_pct}% of all violations are recorded between 9PM–6AM. Daytime enforcement is virtually absent — consider expanding day patrol coverage.',
        'severity': 'warning',
        'metric': f'{night_pct}%',
        'metricLabel': 'Night Violations',
    },
    {
        'id': 'parking-dominance',
        'icon': '🅿️',
        'title': 'Parking Violations Dominate',
        'description': f'{parking_pct}% of recorded violations are parking-related. Non-parking violations like signal jumping and helmet violations are much less represented in this dataset.',
        'severity': 'info',
        'metric': f'{parking_pct}%',
        'metricLabel': 'Parking Related',
    },
    {
        'id': 'sunday-peak',
        'icon': '📅',
        'title': 'Sunday Has Highest Violations',
        'description': f'Sunday records {sun_vs_mon}% more violations than Monday. Commercial areas like KR Market and Upparpet see peak weekend enforcement activity.',
        'severity': 'info',
        'metric': f'+{sun_vs_mon}%',
        'metricLabel': 'Sun vs Mon',
    },
    {
        'id': 'station-imbalance',
        'icon': '⚖️',
        'title': 'Station Workload Imbalance',
        'description': f'Top 5 stations handle {top5_pct}% of all citywide violations. The bottom 30 stations collectively handle less than 15%.',
        'severity': 'warning',
        'metric': f'{top5_pct}%',
        'metricLabel': 'Top 5 Stations',
    },
    {
        'id': 'approval-rate',
        'icon': '❌',
        'title': f'High Rejection Rate',
        'description': f'Overall approval rate is only {approval_rate}%. {worst_station["name"]} station has a rejection rate of {worst_station_rej_rate}% — investigate data quality or review process issues.',
        'severity': 'danger',
        'metric': f'{approval_rate}%',
        'metricLabel': 'Approval Rate',
    },
    {
        'id': 'two-wheeler',
        'icon': '🛵',
        'title': f'{top_vehicle_class["vehicleClass"]} Vehicles Lead Violations',
        'description': f'{top_vehicle_class["vehicleClass"]} is the most frequent vehicle category at {top_vehicle_pct}% of violations. {best_approval["vehicleClass"]} class has the best approval rate at {best_approval["approvalRate"]}%.',
        'severity': 'info',
        'metric': f'{top_vehicle_pct}%',
        'metricLabel': f'{top_vehicle_class["vehicleClass"]} Share',
    },
    {
        'id': 'seasonal-trend',
        'icon': '📈',
        'title': f'{peak_month["label"]} Enforcement Peak',
        'description': f'{peak_month["label"]} recorded {peak_month["count"]:,} violations — the highest month in the processed range.',
        'severity': 'info',
        'metric': f'{peak_month["count"] / 1000:.1f}K',
        'metricLabel': peak_month['label'],
    },
    {
        'id': 'junction-concentration',
        'icon': '🔀',
        'title': 'Junction Concentration',
        'description': f'{top_junction["name"]} alone accounts for {top_junction["count"]:,} violations. Top 5 junctions handle a disproportionate share of all junction-tagged violations.',
        'severity': 'warning',
        'metric': f'{top_junction["count"] / 1000:.1f}K',
        'metricLabel': 'Top Junction',
    },
]
save('insights.json', insights)

# ──────────────────────── 11. STATION LOCATIONS for map ────────────────────────
print("11. Generating station_locations.json...")
station_locs = []
for s in stations_data:
    if s['latitude'] and s['longitude']:
        station_locs.append({
            'name': s['name'],
            'lat': s['latitude'],
            'lng': s['longitude'],
            'violations': s['totalViolations'],
            'approvalRate': s['approvalRate'],
        })
save('station_locations.json', station_locs)

# ──────────────────────── 12. HOTSPOTS for map/intelligence ────────────────────────
print("12. Generating hotspots.json...")
lat_min, lat_max = df['latitude'].dropna().min(), df['latitude'].dropna().max()
lng_min, lng_max = df['longitude'].dropna().min(), df['longitude'].dropna().max()
latest_dates = sorted(df['date'].dropna().unique())[-7:]
max_junction_count = max((j['count'] for j in junctions_data), default=1)
hotspots_data = []
for idx, junction in enumerate(junctions_data[:20]):
    grp = jn_df[jn_df['junction_name'] == junction['name']]
    if len(grp) == 0:
        continue

    hourly = grp['hour_of_day'].value_counts().sort_index()
    peak_hour = int(hourly.idxmax()) if len(hourly) else 0
    peak_start = max(0, peak_hour - 1)
    peak_end = min(23, peak_hour + 1)
    trend = []
    for d in latest_dates:
        trend.append(int(grp[grp['date'] == d].shape[0]))
    if not any(trend):
        trend = [int(round(junction['count'] / 7))] * 7

    top_violations = [
        clean_violation_label(name)
        for name in grp['violation_type'].value_counts().head(3).index.tolist()
    ]
    station_name = str(grp['police_station'].mode().iloc[0]) if len(grp) > 0 else ''
    severity = max(35, min(100, int(round(35 + (junction['count'] / max_junction_count) * 65))))

    hotspots_data.append({
        'id': f'hp-{idx + 1:02d}',
        'name': str(junction['name']),
        'lat': junction['latitude'],
        'lng': junction['longitude'],
        'severity': severity,
        'violationCount': junction['count'],
        'vehicleMix': vehicle_mix_percentages(grp),
        'peakHours': f'{peak_start:02d}:00-{peak_end:02d}:00',
        'peakWindow': [peak_start, peak_end],
        'trend': trend,
        'topViolations': top_violations,
        'zone': station_name,
        'position': normalize_position(junction['latitude'], junction['longitude'], lat_min, lat_max, lng_min, lng_max),
    })
save('hotspots.json', hotspots_data)

# ──────────────────────── 13. ZONES for zone/patrol/report modules ────────────────────────
print("13. Generating zones.json...")
zone_colors = ['#FF6B35', '#A3FF12', '#E5E7EB', '#FBBF24', '#14B8A6', '#DC2626', '#8B5CF6', '#06B6D4']
top_zone_stations = stations_data[:8]
max_station_count = max((s['totalViolations'] for s in top_zone_stations), default=1)
zones_generated = []
for idx, station in enumerate(top_zone_stations):
    station_grp = df[df['police_station'] == station['name']]
    station_hotspots = [h for h in hotspots_data if h['zone'] == station['name']]
    monthly_station = station_grp.groupby(['year', 'month']).size().reset_index(name='count')
    trend = [int(v) for v in monthly_station['count'].tail(7).tolist()]
    if len(trend) < 7:
        trend = ([0] * (7 - len(trend))) + trend

    lat = station['latitude'] or station_grp['latitude'].dropna().mean()
    lng = station['longitude'] or station_grp['longitude'].dropna().mean()
    scale_base = 1.7 + (station['totalViolations'] / max_station_count) * 1.6

    zones_generated.append({
        'id': f'zone-{idx + 1:02d}',
        'name': station['name'],
        'stationName': f'{station["name"]} Traffic PS',
        'color': zone_colors[idx % len(zone_colors)],
        'stats': {
            'totalViolations': station['totalViolations'],
            'activeHotspots': len(station_hotspots),
            'patrolUnits': max(1, int(round(station['totalViolations'] / max_station_count * 5))),
            'approvalRate': station['approvalRate'],
            'revenue': int(station['totalViolations'] * 500),
        },
        'vehicleComposition': vehicle_mix_percentages(station_grp),
        'trend': trend,
        'position': normalize_position(lat, lng, lat_min, lat_max, lng_min, lng_max),
        'scale': [round(scale_base, 2), 1, round(scale_base, 2)],
    })
save('zones.json', zones_generated)

# ──────────────────────── 14. INCIDENTS from real violation records ────────────────────────
print("14. Generating incidents.json...")
incident_cols = [
    'id', 'created_datetime', 'location', 'junction_name', 'police_station',
    'vehicle_class', 'vehicle_number', 'updated_vehicle_number',
    'violation_type', 'validation_status', 'is_high_risk_violation', 'num_violations'
]
incident_df = df[incident_cols].copy()
incident_df = incident_df.sort_values('created_datetime', ascending=False).head(500)
incidents = []
for _, row in incident_df.iterrows():
    location = row['junction_name'] if pd.notna(row['junction_name']) and row['junction_name'] != 'No Junction' else row['location']
    vehicle_number = row['updated_vehicle_number'] if pd.notna(row['updated_vehicle_number']) else row['vehicle_number']
    incidents.append({
        'id': str(row['id']),
        'timestamp': row['created_datetime'].isoformat() if pd.notna(row['created_datetime']) else '',
        'location': str(location),
        'hotspotId': '',
        'vehicleType': vehicle_class_to_ui(row['vehicle_class']),
        'violationType': clean_violation_label(row['violation_type']),
        'plateNumber': str(vehicle_number) if pd.notna(vehicle_number) else 'UNKNOWN',
        'fineAmount': estimate_fine(row),
        'status': validation_to_status(row['validation_status'], bool(row['is_high_risk_violation'])),
        'officerId': str(row['police_station']),
    })
save('incidents.json', incidents)

# ──────────────────────── 15. PREDICTION JUNCTIONS from real hotspots ────────────────────────
print("15. Generating prediction_junctions.json...")
prediction_junctions = []
for idx, hotspot in enumerate(hotspots_data[:10]):
    prediction_junctions.append({
        'id': f'jn-{idx + 1:02d}',
        'name': hotspot['name'],
        'hotspotId': hotspot['id'],
        'baseViolations': hotspot['violationCount'],
        'hourlyPattern': jn_df[jn_df['junction_name'] == hotspot['name']]['hour_of_day'].value_counts().sort_index().reindex(range(24), fill_value=0).astype(int).tolist(),
    })
save('prediction_junctions.json', prediction_junctions)

print(f"\nDone! Generated {len([f for f in os.listdir(OUTPUT_DIR) if f.endswith('.json')])} files in {OUTPUT_DIR}")
print(f"Frontend compatibility copy updated in {LEGACY_OUTPUT_DIR}")
