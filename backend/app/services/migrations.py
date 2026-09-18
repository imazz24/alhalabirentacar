"""Tiny additive schema migrations.

The project ships without Alembic on purpose (single SQLite file, one operator),
but existing databases still need new columns when the app is upgraded. Each
additive entry below is an idempotent `ADD COLUMN` — no data is ever rewritten,
so running this on every startup is safe.

A few columns are intentionally *removed* when an upgrade replaces them (e.g.
`loyalty_accounts.discount_redeemed` became `pending_discounts`): a leftover
legacy column with a NOT NULL constraint and no default would otherwise break
inserts on upgraded databases. Removal is explicit in `REMOVE_COLUMNS` only.

When the project moves to PostgreSQL this can be replaced by Alembic without
touching the models.
"""

import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger("car-rental.migrations")

# table -> column -> DDL type (with default) used by ALTER TABLE ADD COLUMN.
ADDITIVE_COLUMNS: dict[str, dict[str, str]] = {
    "locations": {
        "latitude": "FLOAT",
        "longitude": "FLOAT",
        "is_custom": "BOOLEAN NOT NULL DEFAULT 0",
    },
    "car_images": {
        "angle": "VARCHAR(30) NOT NULL DEFAULT 'Front Angle'",
        "color_name": "VARCHAR(50)",
        "color_hex": "VARCHAR(9)",
    },
    "cars": {
        "discount_daily_price": "NUMERIC(10,2)",
    },
    "bookings": {
        "loyalty_phone": "VARCHAR(50)",
        "points_earned": "INTEGER NOT NULL DEFAULT 0",
        "loyalty_discount_applied": "NUMERIC(10,2)",
        "loyalty_refunded": "BOOLEAN NOT NULL DEFAULT 0",
    },
    "loyalty_accounts": {
        "pending_discounts": "INTEGER NOT NULL DEFAULT 0",
    },
}

# table -> column -> reason, used by ALTER TABLE DROP COLUMN (SQLite 3.35+).
REMOVE_COLUMNS: dict[str, dict[str, str]] = {
    "loyalty_accounts": {
        "discount_redeemed": "superseded by pending_discounts",
    },
}


def run_migrations(engine: Engine) -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        for table, columns in ADDITIVE_COLUMNS.items():
            if table not in existing_tables:
                continue  # create_all() will build it with every column already.
            present = {column["name"] for column in inspector.get_columns(table)}
            for column, ddl in columns.items():
                if column in present:
                    continue
                connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
                logger.info("Migrated %s: added column %s", table, column)

        for table, columns in REMOVE_COLUMNS.items():
            if table not in existing_tables:
                continue
            present = {column["name"] for column in inspector.get_columns(table)}
            for column, reason in columns.items():
                if column not in present:
                    continue
                connection.execute(text(f"ALTER TABLE {table} DROP COLUMN {column}"))
                logger.info("Migrated %s: dropped column %s (%s)", table, column, reason)
