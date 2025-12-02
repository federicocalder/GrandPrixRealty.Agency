# GPR AVM ETL - Trestle Historical Data Loader

Loads historical closed sales data from Trestle MLS API into the AVM database.

## Overview

This ETL script:
- Fetches ~500K+ closed sales from 2013-present from the Las Vegas MLS
- Loads data into `avm.properties` and `avm.sales_history` tables
- Supports resume capability for interrupted loads
- Processes data month-by-month for progress tracking
- Rate-limited to respect API limits

## Setup

### 1. Install dependencies

```bash
cd avm-etl
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

Edit `.env` file:
- Trestle credentials are pre-configured
- **UPDATE** `DATABASE_URL` with your actual Supabase password

```bash
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@5.78.131.81:5432/postgres
```

## Usage

### Full historical load (12-24 hours)

```bash
# First, count how many records we'll be loading
python etl_runner.py --count-only

# Run the full load (use screen/tmux for long-running process)
screen -S avm-etl
python etl_runner.py

# Detach: Ctrl+A, D
# Reattach: screen -r avm-etl
```

### Resume after interruption

```bash
python etl_runner.py --resume
```

### Load specific month

```bash
python etl_runner.py --month 2024-06
```

### Dry run (fetch but don't insert)

```bash
python etl_runner.py --dry-run --month 2024-01
```

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `ETL_START_DATE` | 2013-01-01 | Start date for historical pull |
| `ETL_END_DATE` | today | End date (optional) |
| `ETL_BATCH_SIZE` | 500 | Records per API request |
| `ETL_RATE_LIMIT` | 30 | Max requests per minute |
| `ETL_STATE` | NV | State filter (Nevada) |
| `ETL_RESUME` | true | Enable checkpoint resume |

## Database Tables

The ETL loads data into:

- **`avm.properties`** - Property master records with:
  - Address (full + normalized)
  - Location (lat/lng + PostGIS geography)
  - Property characteristics (beds, baths, sqft, etc.)

- **`avm.sales_history`** - Sale records with:
  - Sale price and date
  - Days on market
  - Property snapshot at time of sale

## Monitoring Progress

The script shows:
- Real-time progress bar
- Per-month logging
- Final summary with totals

Logs use structured JSON format for easy parsing.

## Troubleshooting

### Token errors
- Check Trestle credentials in `.env`
- Verify API access is still active

### Database connection errors
- Verify `DATABASE_URL` password
- Check Supabase is running on Hetzner

### Rate limiting
- Reduce `ETL_RATE_LIMIT` if getting 429 errors
- Default of 30/min is conservative

### Resume not working
- Ensure `ETL_RESUME=true` in `.env`
- Check that `avm.sales_history` has records with `source='trestle'`
