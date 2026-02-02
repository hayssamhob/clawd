#!/usr/bin/env python3
"""
Script to derive User API credentials from your private key
Run this to get the correct API credentials for your MetaMask wallet
"""

import os

from dotenv import load_dotenv

# Load environment
load_dotenv()

# Your MetaMask private key (replace with your actual private key)
PRIVATE_KEY = "0xfcdb9e7ff4750c4b406380b657422bda657b3a9a14bebbb0d9477e7159f80def"  # REPLACE WITH YOUR ACTUAL PRIVATE KEY

try:
    from eth_account import Account
    from py_clob_client.client import ClobClient
    from py_clob_client.clob_types import ApiCreds
    
    print("🔑 Deriving User API credentials from your MetaMask wallet...")
    
    # Create account from private key
    account = Account.from_key(PRIVATE_KEY)
    print(f"   Wallet Address: {account.address}")
    
    # Initialize client with private key
    client = ClobClient(
        host="https://clob.polymarket.com",
        chain_id=137,  # Polygon mainnet
        key=PRIVATE_KEY
    )
    
    # Derive API credentials
    api_creds = client.create_or_derive_api_creds()
    
    print("\n✅ SUCCESS! Here are your User API credentials:")
    print(f"   API Creds object: {api_creds}")
    print(f"   Type: {type(api_creds)}")
    print(f"   Dict: {api_creds.__dict__ if hasattr(api_creds, '__dict__') else 'No __dict__'}")
    
    print(f"\n📝 Update your .env file with:")
    print(f"POLYMARKET_API_KEY={api_creds.api_key}")
    print(f"POLYMARKET_SECRET={api_creds.api_secret}")
    print(f"POLYMARKET_PRIVATE_KEY={PRIVATE_KEY}")
    print(f"EXPECTED_WALLET_ADDRESS={account.address}")
    
except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("Install with: pip install py_clob_client eth-account")
except Exception as e:
    print(f"❌ Error: {e}")
    print("\nMake sure:")
    print("1. Your private key is correct")
    print("2. You have internet connection")
    print("3. Your wallet has some USDC for gas")
