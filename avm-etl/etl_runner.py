#!/usr/bin/env python3
"""
GPR AVM ETL Runner
Main entry point for loading historical Trestle data

Usage:
    python etl_runner.py                    # Full load from configured start date
    python etl_runner.py --resume           # Resume from last checkpoint
    python etl_runner.py --count-only       # Just count records, don't load
    python etl_runner.py --dry-run          # Fetch data but don't insert
    python etl_runner.py --month 2024-01    # Load specific month only
"""

import argparse
import asyncio
import sys
from datetime import date, timedelta
from typing import Optional

import structlog
from tqdm import tqdm

from config import get_trestle_config, get_database_config, get_etl_config
from trestle_client import TrestleClient, ClosedSale
from database import DatabaseLoader

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.dev.ConsoleRenderer(colors=True),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


def generate_month_ranges(start_date: date, end_date: date) -> list[tuple[date, date]]:
    """
    Generate monthly date ranges for chunked processing.
    This helps with:
    1. Progress tracking
    2. Resume capability
    3. API pagination limits
    """
    ranges = []
    current = date(start_date.year, start_date.month, 1)

    while current <= end_date:
        # Get last day of current month
        if current.month == 12:
            next_month = date(current.year + 1, 1, 1)
        else:
            next_month = date(current.year, current.month + 1, 1)

        month_end = next_month - timedelta(days=1)

        # Don't go past end_date
        actual_end = min(month_end, end_date)
        actual_start = max(current, start_date)

        ranges.append((actual_start, actual_end))

        current = next_month

    return ranges


async def count_all_records(
    client: TrestleClient,
    start_date: date,
    end_date: date,
) -> int:
    """Count total records to be processed"""
    month_ranges = generate_month_ranges(start_date, end_date)
    total = 0

    logger.info("counting_records", months=len(month_ranges))

    for month_start, month_end in tqdm(month_ranges, desc="Counting months"):
        count = await client.get_count(month_start, month_end)
        total += count
        logger.debug(
            "month_count",
            month=month_start.strftime("%Y-%m"),
            count=count,
        )

    return total


async def process_month(
    client: TrestleClient,
    db: DatabaseLoader,
    month_start: date,
    month_end: date,
    dry_run: bool = False,
    pbar: Optional[tqdm] = None,
) -> tuple[int, int]:
    """
    Process a single month of data.

    Returns:
        Tuple of (properties_loaded, sales_loaded)
    """
    month_label = month_start.strftime("%Y-%m")
    logger.info("process_month_start", month=month_label)

    batch: list[ClosedSale] = []
    batch_size = 100  # Insert batch size
    total_props = 0
    total_sales = 0

    async for sale in client.fetch_closed_sales(month_start, month_end):
        batch.append(sale)

        if len(batch) >= batch_size:
            if not dry_run:
                props, sales = await db.load_batch(batch)
                total_props += props
                total_sales += sales
            else:
                total_sales += len(batch)

            if pbar:
                pbar.update(len(batch))

            batch = []

    # Process remaining batch
    if batch:
        if not dry_run:
            props, sales = await db.load_batch(batch)
            total_props += props
            total_sales += sales
        else:
            total_sales += len(batch)

        if pbar:
            pbar.update(len(batch))

    logger.info(
        "process_month_complete",
        month=month_label,
        properties=total_props,
        sales=total_sales,
    )

    return total_props, total_sales


async def run_etl(
    resume: bool = False,
    count_only: bool = False,
    dry_run: bool = False,
    specific_month: Optional[str] = None,
):
    """
    Main ETL process.

    Args:
        resume: If True, start from last checkpoint
        count_only: If True, only count records
        dry_run: If True, fetch but don't insert
        specific_month: If set, only process this month (YYYY-MM format)
    """
    trestle_config = get_trestle_config()
    db_config = get_database_config()
    etl_config = get_etl_config()

    client = TrestleClient(trestle_config, etl_config)
    db = DatabaseLoader(db_config)

    try:
        # Connect to database
        await db.connect()

        # Get current stats
        stats = await db.get_stats()
        logger.info(
            "current_db_stats",
            properties=stats["properties_count"],
            sales=stats["sales_count"],
            date_range=f"{stats['min_sale_date']} to {stats['max_sale_date']}",
        )

        # Determine date range
        if specific_month:
            # Parse specific month
            year, month = map(int, specific_month.split("-"))
            start_date = date(year, month, 1)
            if month == 12:
                end_date = date(year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(year, month + 1, 1) - timedelta(days=1)
        elif resume and etl_config.resume:
            # Resume from checkpoint
            checkpoint = await db.get_checkpoint()
            if checkpoint:
                start_date = checkpoint + timedelta(days=1)
                logger.info("resuming_from_checkpoint", checkpoint=str(checkpoint))
            else:
                start_date = etl_config.start_date
                logger.info("no_checkpoint_starting_fresh")
            end_date = etl_config.end_date
        else:
            start_date = etl_config.start_date
            end_date = etl_config.end_date

        logger.info(
            "etl_date_range",
            start=str(start_date),
            end=str(end_date),
        )

        if start_date > end_date:
            logger.info("nothing_to_process", reason="start_date > end_date")
            return

        # Count-only mode
        if count_only:
            total = await count_all_records(client, start_date, end_date)
            logger.info("total_records_to_process", count=total)
            print(f"\n{'='*60}")
            print(f"Total records to process: {total:,}")
            print(f"Date range: {start_date} to {end_date}")
            print(f"{'='*60}")
            return

        # Generate month ranges
        month_ranges = generate_month_ranges(start_date, end_date)
        logger.info(
            "etl_plan",
            total_months=len(month_ranges),
            dry_run=dry_run,
        )

        # First, get total count for progress bar
        logger.info("counting_total_records")
        total_expected = await count_all_records(client, start_date, end_date)
        logger.info("total_expected_records", count=total_expected)

        if total_expected == 0:
            logger.info("no_records_to_process")
            return

        # Process each month
        grand_total_props = 0
        grand_total_sales = 0

        with tqdm(total=total_expected, desc="Loading sales", unit="records") as pbar:
            for month_start, month_end in month_ranges:
                props, sales = await process_month(
                    client=client,
                    db=db,
                    month_start=month_start,
                    month_end=month_end,
                    dry_run=dry_run,
                    pbar=pbar,
                )
                grand_total_props += props
                grand_total_sales += sales

        # Final summary
        final_stats = await db.get_stats()

        print(f"\n{'='*60}")
        print("ETL COMPLETE")
        print(f"{'='*60}")
        print(f"Records loaded this run: {grand_total_sales:,}")
        print(f"Properties upserted:     {grand_total_props:,}")
        print(f"")
        print(f"Database totals:")
        print(f"  Properties:     {final_stats['properties_count']:,}")
        print(f"  Total records:  {final_stats['sales_count']:,}")
        print(f"    - Sales:      {final_stats['trestle_sales']:,}")
        print(f"    - Leases:     {final_stats['trestle_leases']:,}")
        print(f"  Date range:     {final_stats['min_sale_date']} to {final_stats['max_sale_date']}")
        print(f"{'='*60}")

        logger.info(
            "etl_complete",
            properties_loaded=grand_total_props,
            sales_loaded=grand_total_sales,
            total_properties=final_stats["properties_count"],
            total_sales=final_stats["sales_count"],
        )

    except KeyboardInterrupt:
        logger.warning("etl_interrupted", message="Process interrupted by user")
        print("\n\nProcess interrupted. You can resume with --resume flag.")
        sys.exit(1)

    except Exception as e:
        logger.error("etl_error", error=str(e), error_type=type(e).__name__)
        raise

    finally:
        await client.close()
        await db.close()


def main():
    parser = argparse.ArgumentParser(
        description="GPR AVM ETL - Load historical Trestle sales data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python etl_runner.py                    # Full load from configured start date
  python etl_runner.py --resume           # Resume from last checkpoint
  python etl_runner.py --count-only       # Just count records, don't load
  python etl_runner.py --dry-run          # Fetch data but don't insert
  python etl_runner.py --month 2024-01    # Load specific month only
        """,
    )

    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from last checkpoint (most recent sale_date in database)",
    )

    parser.add_argument(
        "--count-only",
        action="store_true",
        help="Only count records, don't load any data",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch data but don't insert into database",
    )

    parser.add_argument(
        "--month",
        type=str,
        metavar="YYYY-MM",
        help="Load specific month only (e.g., 2024-01)",
    )

    args = parser.parse_args()

    # Print banner
    print("""
╔═══════════════════════════════════════════════════════════════╗
║           GPR AVM ETL - Trestle Historical Data Loader        ║
║                                                               ║
║  Loading closed sales data for Las Vegas metro area           ║
║  This process may take 12-24 hours for full historical load   ║
╚═══════════════════════════════════════════════════════════════╝
    """)

    # Run ETL
    asyncio.run(
        run_etl(
            resume=args.resume,
            count_only=args.count_only,
            dry_run=args.dry_run,
            specific_month=args.month,
        )
    )


if __name__ == "__main__":
    main()
