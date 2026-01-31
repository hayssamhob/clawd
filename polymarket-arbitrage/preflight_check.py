#!/usr/bin/env python3
"""
Pre-Flight Safety Validation Script
Validates complete setup before trading
"""

import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

def print_section(title):
    """Print section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def check_mark(passed):
    """Return checkmark or X"""
    return "✅" if passed else "❌"

def main():
    print("""
╔══════════════════════════════════════════════════════════╗
║     POLYMARKET ARBITRAGE BOT - PRE-FLIGHT CHECK          ║
╚══════════════════════════════════════════════════════════╝
""")

    all_checks_passed = True
    warnings = []

    # 1. Check Python Dependencies
    print_section("1. Python Dependencies")
    dependencies = {
        'py_clob_client': 'Polymarket API client',
        'dotenv': 'Environment variables',
        'yaml': 'Configuration parser',
        'flask': 'Web dashboard',
        'plotly': 'Charts',
        'pandas': 'Data processing',
        'sqlalchemy': 'Database ORM',
        'telegram': 'Notifications',
    }

    for module, description in dependencies.items():
        try:
            __import__(module)
            print(f"  ✅ {description:30s} ({module})")
        except ImportError:
            print(f"  ❌ {description:30s} ({module}) - MISSING")
            all_checks_passed = False

    # 2. Check Configuration Files
    print_section("2. Configuration Files")

    if os.path.exists('.env'):
        print("  ✅ .env file exists")

        # Load and validate .env
        from dotenv import load_dotenv
        load_dotenv()

        required_vars = [
            'POLYMARKET_API_KEY',
            'POLYMARKET_SECRET',
            'POLYMARKET_PRIVATE_KEY'
        ]

        for var in required_vars:
            value = os.getenv(var)
            if value:
                print(f"  ✅ {var:30s} set")
            else:
                print(f"  ❌ {var:30s} MISSING")
                all_checks_passed = False

        # Optional vars
        if os.getenv('TELEGRAM_BOT_TOKEN'):
            print(f"  ✅ TELEGRAM_BOT_TOKEN            set (notifications enabled)")
        else:
            warnings.append("Telegram notifications not configured")

    else:
        print("  ❌ .env file NOT FOUND")
        all_checks_passed = False

    if os.path.exists('config/config.yaml'):
        print("  ✅ config/config.yaml exists")

        # Validate config
        import yaml
        with open('config/config.yaml') as f:
            config = yaml.safe_load(f)

        mode = config.get('execution', {}).get('mode', 'unknown')
        print(f"  ℹ️  Trading mode: {mode.upper()}")

        if mode == 'dry_run':
            warnings.append("Bot is in DRY RUN mode (no real trades)")
        elif mode == 'live':
            print("  ⚠️  LIVE TRADING MODE - Real money at risk!")

    else:
        print("  ❌ config/config.yaml NOT FOUND")
        all_checks_passed = False

    # 3. Check Directory Structure
    print_section("3. Directory Structure")

    dirs = ['src', 'data', 'logs', 'config']
    for dir_name in dirs:
        if os.path.exists(dir_name):
            print(f"  ✅ {dir_name}/ directory exists")
        else:
            print(f"  ⚠️  {dir_name}/ directory missing - will create")
            os.makedirs(dir_name, exist_ok=True)

    # 4. Check Database
    print_section("4. Database")

    try:
        from src.database import Database
        db = Database('data/trades.db')
        print("  ✅ Database initialized successfully")

        # Check if database has tables
        import sqlite3
        conn = sqlite3.connect('data/trades.db')
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()

        if tables:
            print(f"  ✅ Database has {len(tables)} tables")
        else:
            warnings.append("Database is empty (will be initialized on first run)")

        conn.close()

    except Exception as e:
        print(f"  ❌ Database error: {e}")
        all_checks_passed = False

    # 5. Check Polymarket Connection
    print_section("5. Polymarket API Connection")

    try:
        import yaml
        from dotenv import load_dotenv

        from src.polymarket_client import PolymarketClient

        load_dotenv()
        with open('config/config.yaml') as f:
            config = yaml.safe_load(f)

        client = PolymarketClient(
            os.getenv('POLYMARKET_API_KEY'),
            os.getenv('POLYMARKET_SECRET'),
            os.getenv('POLYMARKET_PRIVATE_KEY'),
            config['polymarket']
        )

        if client.simulation_mode:
            print("  ⚠️  Running in SIMULATION mode (invalid/missing credentials)")
            warnings.append("Polymarket credentials invalid or missing")
        else:
            print("  ✅ Polymarket client initialized")

            # Check balance
            balance = client.get_balance()
            if 'error' in balance:
                print(f"  ⚠️  Could not fetch balance: {balance['error']}")
                warnings.append("Balance check failed")
            else:
                print(f"  💰 Balance: ${balance.get('balance', 0):.2f} USDC")
                print(f"  💵 Available: ${balance.get('available', 0):.2f} USDC")

                # Check if balance is sufficient
                min_balance = config['polymarket']['max_position_size']
                if balance.get('available', 0) < min_balance:
                    warnings.append(f"Low balance: ${balance.get('available', 0):.2f} (need ${min_balance})")

    except Exception as e:
        print(f"  ❌ Connection error: {type(e).__name__}")
        print(f"     Check your network connection and API credentials")
        all_checks_passed = False

    # 6. Check Wallet Address
    print_section("6. Wallet Configuration")

    try:
        from eth_account import Account
        private_key = os.getenv('POLYMARKET_PRIVATE_KEY')

        if private_key:
            account = Account.from_key(private_key)
            # Only show first and last 4 characters of address for security
            addr = account.address
            masked_addr = f"{addr[:6]}...{addr[-4:]}"
            print(f"  ✅ Wallet address: {masked_addr}")
            print(f"  ℹ️  Chain: Polygon (Chain ID: 137)")
            
            # Check if EXPECTED_WALLET_ADDRESS is set in .env for validation
            expected = os.getenv('EXPECTED_WALLET_ADDRESS')
            if expected:
                if account.address.lower() == expected.lower():
                    print(f"  ✅ Address matches expected configuration")
                else:
                    print(f"  ⚠️  Address mismatch with EXPECTED_WALLET_ADDRESS!")
                    warnings.append("Wallet address mismatch - verify your private key")
            else:
                print(f"  ℹ️  Set EXPECTED_WALLET_ADDRESS in .env to enable address verification")

        else:
            print("  ❌ Private key not set")
            all_checks_passed = False

    except ImportError:
        print("  ⚠️  eth-account not installed")
        print("     Install with: pip3 install eth-account")
        warnings.append("eth-account package not installed")
    except Exception as e:
        print(f"  ❌ Wallet error: {type(e).__name__}")
        print(f"     Verify your POLYMARKET_PRIVATE_KEY is valid")
        all_checks_passed = False

    # 7. Final Summary
    print_section("SUMMARY")

    if all_checks_passed and not warnings:
        print("  ✅ ALL CHECKS PASSED - Ready for trading!")
        print("\n  📋 Next steps:")
        print("     1. Review config/config.yaml settings")
        print("     2. Ensure sufficient USDC balance")
        print("     3. Start bot: ./start_all.sh")
        return 0

    elif all_checks_passed and warnings:
        print("  ✅ Critical checks passed")
        print("\n  ⚠️  WARNINGS:")
        for i, warning in enumerate(warnings, 1):
            print(f"     {i}. {warning}")

        print("\n  📋 Recommended actions:")
        print("     1. Review warnings above")
        print("     2. Add funds if balance is low")
        print("     3. Configure Telegram for notifications")
        print("     4. Start in dry-run mode first: ./start_all.sh")
        return 0

    else:
        print("  ❌ CRITICAL ISSUES FOUND - Cannot start trading")
        print("\n  ⚠️  Errors must be fixed:")
        print("     1. Install missing dependencies: pip3 install -r requirements.txt")
        print("     2. Create .env file with your credentials")
        print("     3. Verify config/config.yaml exists")
        print("\n  Run this script again after fixing issues")
        return 1


if __name__ == "__main__":
    sys.exit(main())
