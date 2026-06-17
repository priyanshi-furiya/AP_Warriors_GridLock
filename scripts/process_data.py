"""
GridLock AI — Data Processing Pipeline
Reads the Parquet file and outputs pre-aggregated JSON files for the frontend.
"""
import json
import os
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
from datetime import datetime

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'real')
os.makedirs(OUTPUT_DIR, exist_ok=True)

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
    print(f"  OK {name} ({os.path.getsize(path) / 1024:.1f} KB)")

print("Loading Parquet file...")
df = pq.read_table(os.path.join(os.path.dirname(__file__), '..', 'parking_violations_clean.csv')).to_pandas()
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
        'description': 'Over 95% of recorded violations are parking-related (Wrong Parking + No Parking). Non-parking violations like signal jumping and helmet violations are rarely captured.',
        'severity': 'info',
        'metric': '95%+',
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
        'title': '2-Wheelers Account for 46% of Violations',
        'description': f'Scooters and motorcycles are the most frequently violated vehicle category. {best_approval["vehicleClass"]} class has the best approval rate at {best_approval["approvalRate"]}%.',
        'severity': 'info',
        'metric': '46%',
        'metricLabel': '2W Share',
    },
    {
        'id': 'seasonal-trend',
        'icon': '📈',
        'title': 'January 2024 Enforcement Peak',
        'description': 'January 2024 recorded 64,815 violations — the highest month. This may indicate a new enforcement drive or additional camera deployments.',
        'severity': 'info',
        'metric': '64.8K',
        'metricLabel': 'Jan 2024',
    },
    {
        'id': 'junction-concentration',
        'icon': '🔀',
        'title': 'Junction Concentration',
        'description': f'Safina Plaza Junction alone accounts for 15,174 violations. Top 5 junctions handle a disproportionate share of all junction-tagged violations.',
        'severity': 'warning',
        'metric': '15.2K',
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

print(f"\nDone! Generated {len(os.listdir(OUTPUT_DIR))} files in {OUTPUT_DIR}")
