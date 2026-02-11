#!/usr/bin/env python3
"""
Wealthsimple → Neon PostgreSQL sync script.

Authenticates with Wealthsimple's GraphQL API, fetches all account data,
and upserts into Neon PostgreSQL for the Next.js dashboard to read.

Usage:
    python fetch.py                  # Interactive TOTP prompt
    python fetch.py --totp 123456    # Pass TOTP code directly
"""

import argparse
import json
import os
import sys
import traceback
from datetime import datetime, date, timedelta
from decimal import Decimal

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_db_connection():
    """Connect to Neon PostgreSQL."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: DATABASE_URL not set in .env")
        sys.exit(1)
    return psycopg2.connect(url)


def upsert_account(cur, account: dict):
    """Upsert a single WS account."""
    cur.execute("""
        INSERT INTO accounts (id, type, nickname, currency, status, netliquidation,
                              "buyingPower", "totalDeposits", "totalWithdrawals", "updatedAt")
        VALUES (%(id)s, %(type)s, %(nickname)s, %(currency)s, %(status)s,
                %(netliquidation)s, %(buying_power)s, %(total_deposits)s,
                %(total_withdrawals)s, NOW())
        ON CONFLICT (id) DO UPDATE SET
            type = EXCLUDED.type,
            nickname = EXCLUDED.nickname,
            currency = EXCLUDED.currency,
            status = EXCLUDED.status,
            netliquidation = EXCLUDED.netliquidation,
            "buyingPower" = EXCLUDED."buyingPower",
            "totalDeposits" = EXCLUDED."totalDeposits",
            "totalWithdrawals" = EXCLUDED."totalWithdrawals",
            "updatedAt" = NOW()
    """, account)


def upsert_position(cur, position: dict):
    """Upsert a single position."""
    cur.execute("""
        INSERT INTO positions (id, "accountId", "securityId", symbol, name, quantity,
                               "bookValue", "marketValue", "gainLoss", "gainLossPct",
                               currency, "updatedAt")
        VALUES (%(id)s, %(account_id)s, %(security_id)s, %(symbol)s, %(name)s,
                %(quantity)s, %(book_value)s, %(market_value)s, %(gain_loss)s,
                %(gain_loss_pct)s, %(currency)s, NOW())
        ON CONFLICT ("accountId", symbol) DO UPDATE SET
            "securityId" = EXCLUDED."securityId",
            name = EXCLUDED.name,
            quantity = EXCLUDED.quantity,
            "bookValue" = EXCLUDED."bookValue",
            "marketValue" = EXCLUDED."marketValue",
            "gainLoss" = EXCLUDED."gainLoss",
            "gainLossPct" = EXCLUDED."gainLossPct",
            currency = EXCLUDED.currency,
            "updatedAt" = NOW()
    """, position)


def upsert_snapshot(cur, snapshot: dict):
    """Upsert an account snapshot."""
    cur.execute("""
        INSERT INTO account_snapshots (id, "accountId", date, netliquidation,
                                        deposits, withdrawals, earnings)
        VALUES (%(id)s, %(account_id)s, %(date)s, %(netliquidation)s,
                %(deposits)s, %(withdrawals)s, %(earnings)s)
        ON CONFLICT ("accountId", date) DO UPDATE SET
            netliquidation = EXCLUDED.netliquidation,
            deposits = EXCLUDED.deposits,
            withdrawals = EXCLUDED.withdrawals,
            earnings = EXCLUDED.earnings
    """, snapshot)


def upsert_activity(cur, activity: dict):
    """Upsert an activity."""
    cur.execute("""
        INSERT INTO activities (id, "accountId", type, symbol, description,
                                quantity, price, amount, currency, "occurredAt")
        VALUES (%(id)s, %(account_id)s, %(type)s, %(symbol)s, %(description)s,
                %(quantity)s, %(price)s, %(amount)s, %(currency)s, %(occurred_at)s)
        ON CONFLICT (id) DO UPDATE SET
            type = EXCLUDED.type,
            symbol = EXCLUDED.symbol,
            description = EXCLUDED.description,
            quantity = EXCLUDED.quantity,
            price = EXCLUDED.price,
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            "occurredAt" = EXCLUDED."occurredAt"
    """, activity)


def upsert_dividend(cur, dividend: dict):
    """Upsert a dividend record."""
    cur.execute("""
        INSERT INTO dividends (id, "accountId", symbol, amount, currency,
                                "paymentDate", frequency)
        VALUES (%(id)s, %(account_id)s, %(symbol)s, %(amount)s, %(currency)s,
                %(payment_date)s, %(frequency)s)
        ON CONFLICT ("accountId", symbol, "paymentDate") DO UPDATE SET
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            frequency = EXCLUDED.frequency
    """, dividend)


def upsert_security(cur, security: dict):
    """Upsert a security."""
    cur.execute("""
        INSERT INTO securities (id, symbol, name, type, exchange, currency,
                                "dividendYield", mer, "peRatio", "marketCap", "updatedAt")
        VALUES (%(id)s, %(symbol)s, %(name)s, %(type)s, %(exchange)s, %(currency)s,
                %(dividend_yield)s, %(mer)s, %(pe_ratio)s, %(market_cap)s, NOW())
        ON CONFLICT (id) DO UPDATE SET
            symbol = EXCLUDED.symbol,
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            exchange = EXCLUDED.exchange,
            currency = EXCLUDED.currency,
            "dividendYield" = EXCLUDED."dividendYield",
            mer = EXCLUDED.mer,
            "peRatio" = EXCLUDED."peRatio",
            "marketCap" = EXCLUDED."marketCap",
            "updatedAt" = NOW()
    """, security)


def create_sync_log(cur, status="running"):
    """Create a new sync log entry, return its ID."""
    import uuid
    sync_id = str(uuid.uuid4())[:25]  # cuid-like
    cur.execute("""
        INSERT INTO sync_logs (id, "startedAt", status)
        VALUES (%s, NOW(), %s)
    """, (sync_id, status))
    return sync_id


def update_sync_log(cur, sync_id, **kwargs):
    """Update sync log with counts and status."""
    sets = []
    params = []
    for key, value in kwargs.items():
        col_map = {
            "status": "status",
            "accounts_count": '"accountsCount"',
            "positions_count": '"positionsCount"',
            "activities_count": '"activitiesCount"',
            "snapshots_count": '"snapshotsCount"',
            "dividends_count": '"dividendsCount"',
            "error": "error",
            "completed_at": '"completedAt"',
        }
        if key in col_map:
            sets.append(f"{col_map[key]} = %s")
            params.append(value)
    if sets:
        params.append(sync_id)
        cur.execute(f"UPDATE sync_logs SET {', '.join(sets)} WHERE id = %s", params)


# ---------------------------------------------------------------------------
# Wealthsimple API helpers
# ---------------------------------------------------------------------------

def ws_login(email: str, password: str, totp_code: str | None = None):
    """Log in to Wealthsimple and return the API client."""
    try:
        from wsimple.api import Wsimple
    except ImportError:
        print("ERROR: wsimple package not found. Install with: pip install wsimple")
        sys.exit(1)

    print(f"Logging in as {email}...")

    if totp_code:
        ws = Wsimple(email, password, otp_answer=totp_code)
    else:
        # Will prompt for TOTP interactively
        ws = Wsimple(email, password)

    print("Login successful!")
    return ws


def normalize_account_type(ws_type: str) -> str:
    """Map WS account types to our schema."""
    mapping = {
        "ca_tfsa": "TFSA",
        "ca_rrsp": "RRSP",
        "ca_fhsa": "FHSA",
        "ca_non_registered": "NON_REG",
        "ca_non_registered_crypto": "CRYPTO",
        "us_non_registered": "USD",
        "ca_resp": "RESP",
        "ca_lira": "LIRA",
    }
    return mapping.get(ws_type.lower(), ws_type.upper())


def normalize_activity_type(ws_type: str) -> str:
    """Map WS activity types to our schema."""
    mapping = {
        "diy_buy": "buy",
        "diy_sell": "sell",
        "dividend": "dividend",
        "deposit": "deposit",
        "withdrawal": "withdrawal",
        "institutional_transfer": "transfer",
        "fee": "fee",
        "interest": "interest",
        "contribution": "contribution",
        "refund": "refund",
        "payment_transfer_in": "deposit",
        "payment_transfer_out": "withdrawal",
        "referral_bonus": "deposit",
        "giveaway_bonus": "deposit",
    }
    ws_lower = ws_type.lower()
    return mapping.get(ws_lower, ws_lower)


def safe_decimal(value, default=0) -> Decimal:
    """Convert to Decimal safely."""
    if value is None:
        return Decimal(str(default))
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal(str(default))


# ---------------------------------------------------------------------------
# Sync logic
# ---------------------------------------------------------------------------

def sync_accounts(ws, cur) -> list[dict]:
    """Fetch and upsert all WS accounts. Return list of account dicts."""
    print("\nFetching accounts...")
    raw_accounts = ws.get_accounts()

    accounts = []
    for acc in raw_accounts.get("results", raw_accounts if isinstance(raw_accounts, list) else []):
        account_id = acc.get("id", acc.get("unifiedAccountId", ""))
        if not account_id:
            continue

        account_data = {
            "id": account_id,
            "type": normalize_account_type(acc.get("accountType", acc.get("type", "UNKNOWN"))),
            "nickname": acc.get("nickname") or acc.get("accountName"),
            "currency": acc.get("currency", "CAD"),
            "status": acc.get("status", "open"),
            "netliquidation": safe_decimal(
                acc.get("currentBalance", {}).get("amount")
                if isinstance(acc.get("currentBalance"), dict)
                else acc.get("currentBalance", 0)
            ),
            "buying_power": safe_decimal(
                acc.get("buyingPower", {}).get("amount")
                if isinstance(acc.get("buyingPower"), dict)
                else acc.get("buyingPower", 0)
            ),
            "total_deposits": safe_decimal(
                acc.get("deposits", {}).get("amount")
                if isinstance(acc.get("deposits"), dict)
                else acc.get("deposits", 0)
            ),
            "total_withdrawals": safe_decimal(
                acc.get("withdrawals", {}).get("amount")
                if isinstance(acc.get("withdrawals"), dict)
                else acc.get("withdrawals", 0)
            ),
        }

        upsert_account(cur, account_data)
        accounts.append(account_data)
        print(f"  [{account_data['type']}] {account_data['nickname'] or account_data['id']}: ${account_data['netliquidation']}")

    print(f"  → {len(accounts)} accounts synced")
    return accounts


def sync_positions(ws, cur, accounts: list[dict]) -> int:
    """Fetch and upsert positions for each account."""
    print("\nFetching positions...")
    total = 0

    for acc in accounts:
        try:
            raw_positions = ws.get_positions(acc["id"])
            positions = raw_positions.get("results", raw_positions if isinstance(raw_positions, list) else [])

            for pos in positions:
                stock = pos.get("stock", {}) or {}
                symbol = (
                    stock.get("symbol")
                    or pos.get("symbol")
                    or pos.get("securitySymbol")
                    or "UNKNOWN"
                )

                quantity = safe_decimal(pos.get("quantity", 0))
                book_value = safe_decimal(
                    pos.get("bookValue", {}).get("amount")
                    if isinstance(pos.get("bookValue"), dict)
                    else pos.get("bookValue", 0)
                )
                market_value = safe_decimal(
                    pos.get("marketValue", {}).get("amount")
                    if isinstance(pos.get("marketValue"), dict)
                    else pos.get("marketValue", 0)
                )
                gain_loss = market_value - book_value
                gain_loss_pct = (gain_loss / book_value * 100) if book_value else Decimal("0")

                import uuid
                position_data = {
                    "id": str(uuid.uuid4())[:25],
                    "account_id": acc["id"],
                    "security_id": stock.get("securityId") or pos.get("securityId"),
                    "symbol": symbol,
                    "name": stock.get("name") or pos.get("securityName") or symbol,
                    "quantity": quantity,
                    "book_value": book_value,
                    "market_value": market_value,
                    "gain_loss": gain_loss,
                    "gain_loss_pct": gain_loss_pct,
                    "currency": pos.get("currency", acc.get("currency", "CAD")),
                }

                upsert_position(cur, position_data)
                total += 1
                print(f"    {symbol}: {quantity} units, MV=${market_value}")

        except Exception as e:
            print(f"  Warning: Could not fetch positions for {acc['id']}: {e}")

    print(f"  → {total} positions synced")
    return total


def sync_historical(ws, cur, accounts: list[dict]) -> int:
    """Fetch and upsert historical daily snapshots."""
    print("\nFetching historical data...")
    total = 0

    for acc in accounts:
        try:
            # Try to get historical financials
            history = ws.get_historical_financials(acc["id"], "1y")
            results = history.get("results", history if isinstance(history, list) else [])

            for entry in results:
                entry_date = entry.get("date")
                if not entry_date:
                    continue

                if isinstance(entry_date, str):
                    entry_date = entry_date[:10]  # YYYY-MM-DD

                import uuid
                snapshot_data = {
                    "id": str(uuid.uuid4())[:25],
                    "account_id": acc["id"],
                    "date": entry_date,
                    "netliquidation": safe_decimal(
                        entry.get("value", {}).get("amount")
                        if isinstance(entry.get("value"), dict)
                        else entry.get("value", 0)
                    ),
                    "deposits": safe_decimal(
                        entry.get("deposits", {}).get("amount")
                        if isinstance(entry.get("deposits"), dict)
                        else entry.get("deposits", 0)
                    ),
                    "withdrawals": safe_decimal(
                        entry.get("withdrawals", {}).get("amount")
                        if isinstance(entry.get("withdrawals"), dict)
                        else entry.get("withdrawals", 0)
                    ),
                    "earnings": safe_decimal(
                        entry.get("earnings", {}).get("amount")
                        if isinstance(entry.get("earnings"), dict)
                        else entry.get("earnings", 0)
                    ),
                }

                upsert_snapshot(cur, snapshot_data)
                total += 1

            print(f"  {acc['type']}: {len(results)} data points")

        except Exception as e:
            print(f"  Warning: Could not fetch history for {acc['id']}: {e}")

    print(f"  → {total} snapshots synced")
    return total


def sync_activities(ws, cur, accounts: list[dict]) -> tuple[int, int]:
    """Fetch all activities, upsert, and extract dividends."""
    print("\nFetching activities...")
    activity_total = 0
    dividend_total = 0

    for acc in accounts:
        try:
            raw_activities = ws.get_activities(acc["id"])
            activities = raw_activities.get("results", raw_activities if isinstance(raw_activities, list) else [])

            for act in activities:
                act_id = act.get("id", act.get("canonicalId", ""))
                if not act_id:
                    continue

                act_type = normalize_activity_type(
                    act.get("type", act.get("activityType", "unknown"))
                )
                symbol = act.get("symbol") or act.get("securitySymbol")
                amount_raw = act.get("amount") or act.get("netAmount") or {}
                amount = safe_decimal(
                    amount_raw.get("amount") if isinstance(amount_raw, dict) else amount_raw
                )

                occurred_at = act.get("occurredAt") or act.get("processDate") or act.get("createdAt")
                if isinstance(occurred_at, str) and len(occurred_at) >= 10:
                    pass  # keep as string, psycopg2 handles it
                else:
                    occurred_at = datetime.now().isoformat()

                quantity_raw = act.get("quantity")
                price_raw = act.get("price") or act.get("marketPrice") or {}

                activity_data = {
                    "id": act_id,
                    "account_id": acc["id"],
                    "type": act_type,
                    "symbol": symbol,
                    "description": act.get("description") or act.get("subHeader"),
                    "quantity": safe_decimal(quantity_raw) if quantity_raw else None,
                    "price": safe_decimal(
                        price_raw.get("amount") if isinstance(price_raw, dict) else price_raw
                    ) if price_raw else None,
                    "amount": amount,
                    "currency": (
                        amount_raw.get("currency") if isinstance(amount_raw, dict) else None
                    ) or acc.get("currency", "CAD"),
                    "occurred_at": occurred_at,
                }

                upsert_activity(cur, activity_data)
                activity_total += 1

                # Extract dividends
                if act_type == "dividend" and symbol and amount:
                    import uuid
                    payment_date = occurred_at[:10] if isinstance(occurred_at, str) else str(occurred_at)[:10]
                    dividend_data = {
                        "id": str(uuid.uuid4())[:25],
                        "account_id": acc["id"],
                        "symbol": symbol,
                        "amount": abs(amount),
                        "currency": activity_data["currency"],
                        "payment_date": payment_date,
                        "frequency": None,  # Will be detected later
                    }
                    upsert_dividend(cur, dividend_data)
                    dividend_total += 1

            print(f"  {acc['type']}: {len(activities)} activities")

        except Exception as e:
            print(f"  Warning: Could not fetch activities for {acc['id']}: {e}")

    print(f"  → {activity_total} activities, {dividend_total} dividends synced")
    return activity_total, dividend_total


def detect_dividend_frequency(cur):
    """Analyze dividend payment patterns and update frequency."""
    print("\nDetecting dividend frequencies...")
    cur.execute("""
        WITH payment_gaps AS (
            SELECT symbol, "accountId",
                   "paymentDate" - LAG("paymentDate") OVER (
                       PARTITION BY symbol, "accountId" ORDER BY "paymentDate"
                   ) AS gap_days
            FROM dividends
        ),
        avg_gaps AS (
            SELECT symbol, "accountId",
                   AVG(EXTRACT(EPOCH FROM gap_days) / 86400) AS avg_gap
            FROM payment_gaps
            WHERE gap_days IS NOT NULL
            GROUP BY symbol, "accountId"
        )
        UPDATE dividends d
        SET frequency = CASE
            WHEN ag.avg_gap <= 45 THEN 'monthly'
            WHEN ag.avg_gap <= 120 THEN 'quarterly'
            WHEN ag.avg_gap <= 210 THEN 'semi-annual'
            ELSE 'annual'
        END
        FROM avg_gaps ag
        WHERE d.symbol = ag.symbol AND d."accountId" = ag."accountId"
    """)
    print("  → Frequencies updated")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Sync Wealthsimple data to Neon PostgreSQL")
    parser.add_argument("--totp", help="TOTP code for 2FA", type=str)
    parser.add_argument("--email", help="WS email (overrides .env)", type=str)
    parser.add_argument("--password", help="WS password (overrides .env)", type=str)
    args = parser.parse_args()

    email = args.email or os.environ.get("WS_EMAIL")
    password = args.password or os.environ.get("WS_PASSWORD")

    if not email or not password:
        print("ERROR: WS_EMAIL and WS_PASSWORD must be set in .env or passed as arguments")
        sys.exit(1)

    conn = get_db_connection()
    cur = conn.cursor()

    sync_id = create_sync_log(cur, "running")
    conn.commit()

    try:
        ws = ws_login(email, password, args.totp)

        accounts = sync_accounts(ws, cur)
        conn.commit()

        positions_count = sync_positions(ws, cur, accounts)
        conn.commit()

        snapshots_count = sync_historical(ws, cur, accounts)
        conn.commit()

        activities_count, dividends_count = sync_activities(ws, cur, accounts)
        conn.commit()

        detect_dividend_frequency(cur)
        conn.commit()

        update_sync_log(
            cur,
            sync_id,
            status="success",
            accounts_count=len(accounts),
            positions_count=positions_count,
            activities_count=activities_count,
            snapshots_count=snapshots_count,
            dividends_count=dividends_count,
            completed_at=datetime.now(),
        )
        conn.commit()

        print(f"\n{'='*50}")
        print(f"Sync complete!")
        print(f"  Accounts:   {len(accounts)}")
        print(f"  Positions:  {positions_count}")
        print(f"  Snapshots:  {snapshots_count}")
        print(f"  Activities: {activities_count}")
        print(f"  Dividends:  {dividends_count}")
        print(f"{'='*50}")

    except Exception as e:
        print(f"\nERROR: {e}")
        traceback.print_exc()
        update_sync_log(
            cur,
            sync_id,
            status="error",
            error=str(e)[:500],
            completed_at=datetime.now(),
        )
        conn.commit()
        sys.exit(1)

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
