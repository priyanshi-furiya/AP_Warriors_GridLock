import pyarrow.parquet as pq
import pandas as pd

df = pq.read_table('d:/Projects/Gridlock/parking_violations_clean.csv').to_pandas()

print('=== VEHICLE TYPES ===')
print(df['vehicle_type_clean'].value_counts().head(15).to_string())

print('\n=== POLICE STATIONS (top 20) ===')
print(df['police_station'].value_counts().head(20).to_string())

print('\n=== VIOLATION TYPES (top 15) ===')
print(df['violation_type'].value_counts().head(15).to_string())

print('\n=== VEHICLE CLASS ===')
print(df['vehicle_class'].value_counts().to_string())

print('\n=== DAY NAME ===')
print(df['day_name'].value_counts().to_string())

print('\n=== VALIDATION STATUS ===')
print(df['validation_status'].value_counts().to_string())

print('\n=== DATE RANGE ===')
mn = df['date'].min()
mx = df['date'].max()
print(f'Min: {mn}, Max: {mx}')

print('\n=== JUNCTION NAMES (top 15) ===')
jn = df[df['junction_name'] != 'No Junction']['junction_name'].value_counts().head(15)
print(jn.to_string())

print('\n=== HOUR DISTRIBUTION ===')
print(df['hour_of_day'].value_counts().sort_index().to_string())

print('\n=== WEEKEND vs WEEKDAY ===')
print(df['is_weekend'].value_counts().to_string())

print('\n=== PEAK HOUR ===')
print(df['is_peak_hour'].value_counts().to_string())

print('\n=== HIGH RISK VIOLATION ===')
print(df['is_high_risk_violation'].value_counts().to_string())

print('\n=== MONTHLY TREND ===')
monthly = df.groupby(['year', 'month']).size().reset_index(name='count')
print(monthly.to_string())

print('\n=== TOP LOCATIONS by violation count ===')
print(df['location'].value_counts().head(10).to_string())

print('\n=== LAT/LNG RANGE ===')
print(f'Lat: {df["latitude"].min():.4f} to {df["latitude"].max():.4f}')
print(f'Lng: {df["longitude"].min():.4f} to {df["longitude"].max():.4f}')
