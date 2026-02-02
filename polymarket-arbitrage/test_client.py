#!/usr/bin/env python3
"""Test script to verify Polymarket client initialization"""

import os

from dotenv import load_dotenv

# Load environment
load_dotenv()

# Get credentials
api_key = os.getenv('POLYMARKET_API_KEY')
api_secret = os.getenv('POLYMARKET_SECRET')
private_key = os.getenv('POLYMARKET_PRIVATE_KEY')

print("🔍 Testing Polymarket Client Initialization...")
print(f"   API Key: {api_key[:10]}..." if api_key else "   API Key: MISSING")
print(f"   Secret: {api_secret[:10]}..." if api_secret else "   Secret: MISSING")
print(f"   Private Key: {private_key[:10]}..." if private_key else "   Private Key: MISSING")

try:
    from eth_account import Account
    from py_clob_client.client import ApiCreds, ClobClient
    
    if not all([api_key, api_secret, private_key]):
        print("❌ Missing credentials!")
        exit(1)
    
    # Initialize client with just private key to derive credentials
    temp_client = ClobClient(
        host="https://clob.polymarket.com",
        key=private_key,
        chain_id=137
    )
    print("✅ Temporary client initialized")
    
    # Derive API credentials
    creds = temp_client.derive_api_key()
    print(f"✅ Derived API credentials: {creds}")
    print(f"   API Key: {creds.api_key}")
    print(f"   Secret: {creds.api_secret}")
    print(f"   Passphrase: {creds.api_passphrase}")
    
    # Get wallet address
    account = Account.from_key(private_key)
    wallet_address = account.address
    print(f"   Wallet Address: {wallet_address}")
    
    # Initialize client first
    client = ClobClient(
        host="https://clob.polymarket.com",
        key=private_key,
        chain_id=137,
        signature_type=0,
        funder=wallet_address
    )
    print("✅ ClobClient initialized successfully")
    
    # Then set API credentials
    client.set_api_creds(creds)
    print("✅ API credentials set")
    
    # Test balance call - try without parameters first
    try:
        balance = client.get_balance_allowance()  # Try without params
        print(f"✅ Balance API call successful (no params): {balance}")
    except Exception as e1:
        print(f"❌ Failed without params: {e1}")
        try:
            # Try with minimal params
            from py_clob_client.clob_types import BalanceAllowanceParams
            params = BalanceAllowanceParams(signature_type=0)
            balance = client.get_balance_allowance(params)
            print(f"✅ Balance API call successful (with params): {balance}")
        except Exception as e2:
            print(f"❌ Failed with params: {e2}")
    
except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
