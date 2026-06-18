# GridLock Data Directory

Put the original traffic violations dataset in:

```text
data/raw/
```

Recommended filename:

```text
data/raw/parking_violations_clean.parquet
```

CSV is also supported:

```text
data/raw/parking_violations_clean.csv
```

Run the processing script to generate backend-ready JSON:

```text
python scripts/process_data.py
```

Generated JSON is written to:

```text
data/processed/
```

The API reads from `data/processed` first. If that folder is empty, it falls back to the current frontend JSON in `src/data/real`.
