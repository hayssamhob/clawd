"""
Polymarket API Client
Wrapper for Polymarket CLOB API
"""

import logging
import time
from decimal import Decimal
from typing import Dict, List, Optional

try:
    from py_clob_client.client import ApiCreds, ClobClient
    from py_clob_client.clob_types import OrderArgs, OrderType
    from py_clob_client.order_builder.constants import BUY, SELL
except ImportError:
    logging.warning("py-clob-client not installed. Running in simulation mode.")
    ClobClient = None
    ApiCreds = None
    OrderArgs = None
    OrderType = None
    BUY = "buy"
    SELL = "sell"


class PolymarketClient:
    """Client for interacting with Polymarket"""
    
    def __init__(self, api_key: Optional[str], api_secret: Optional[str], 
                 private_key: Optional[str], config: Dict):
        """
        Initialize Polymarket client
        
        Args:
            api_key: API key for Polymarket
            api_secret: API secret
            private_key: Private key for signing transactions
            config: Configuration dict
        """
        self.logger = logging.getLogger(__name__)
        self.config = config
        
        # Initialize client
        if api_key and api_secret and private_key and ClobClient and ApiCreds:
            try:
                # Create API credentials
                creds = ApiCreds(
                    api_key=api_key,
                    api_secret=api_secret,
                    api_passphrase=""  # Polymarket doesn't use passphrase
                )
                
                # Initialize client with private key and credentials
                self.client = ClobClient(
                    host=config.get('api_endpoint', 'https://clob.polymarket.com'),
                    key=private_key,  # Private key for signing
                    creds=creds,       # API credentials
                    chain_id=config.get('chain_id', 137)  # Polygon mainnet
                )
                self.private_key = private_key
                self.simulation_mode = False
                self.logger.info("✅ Polymarket client initialized (Level 2 - Full Access)")
            except Exception as e:
                self.logger.error(f"Failed to initialize Polymarket client: {e}")
                import traceback
                self.logger.error(traceback.format_exc())
                self.client = None
                self.simulation_mode = True
        else:
            self.client = None
            self.simulation_mode = True
            self.logger.warning("⚠️  Running in simulation mode (no credentials)")
        
        # Rate limiting
        self.last_request_time = 0
        self.min_request_interval = 1.0 / config.get('max_requests_per_second', 10)
    
    def _rate_limit(self):
        """Enforce rate limiting"""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_request_interval:
            time.sleep(self.min_request_interval - elapsed)
        self.last_request_time = time.time()

    def get_balance(self) -> Dict[str, float]:
        """
        Get USDC balance on Polygon

        Returns:
            Dict with 'balance' (total USDC) and 'available' (not in open orders)
        """
        if self.simulation_mode:
            # Return simulated balance
            return {
                'balance': 100.0,
                'available': 100.0,
                'currency': 'USDC'
            }

        try:
            self._rate_limit()

            # Get balance from Polymarket API
            # The ClobClient has a method to get balance
            balance_response = self.client.get_balance_allowance()

            # Parse response - typically returns balance in smallest unit (6 decimals for USDC)
            if isinstance(balance_response, dict):
                balance_raw = float(balance_response.get('balance', 0))
                # Convert from smallest unit (USDC has 6 decimals)
                balance = balance_raw / 1_000_000

                # Get open orders to calculate available balance
                open_orders = self.client.get_orders()
                locked_amount = 0.0

                if isinstance(open_orders, list):
                    for order in open_orders:
                        if order.get('status') == 'OPEN':
                            # Calculate locked funds in this order
                            size = float(order.get('size', 0))
                            price = float(order.get('price', 0))
                            locked_amount += size * price

                available = max(0, balance - locked_amount)

                return {
                    'balance': round(balance, 2),
                    'available': round(available, 2),
                    'currency': 'USDC',
                    'locked': round(locked_amount, 2)
                }
            else:
                self.logger.error(f"Unexpected balance response: {balance_response}")
                return {
                    'balance': 0.0,
                    'available': 0.0,
                    'currency': 'USDC',
                    'locked': 0.0
                }

        except Exception as e:
            self.logger.error(f"Error fetching balance: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            return {
                'balance': 0.0,
                'available': 0.0,
                'currency': 'USDC',
                'error': str(e)
            }

    async def get_markets(self, category: Optional[str] = None) -> List[Dict]:
        """
        Get all active markets
        
        Args:
            category: Filter by category (e.g., 'Politics', 'Sports')
            
        Returns:
            List of market dictionaries
        """
        if self.simulation_mode:
            return self._get_simulated_markets(category)
        
        try:
            self._rate_limit()
            
            # Get markets from API
            response = self.client.get_markets()
            
            # Extract markets list from response
            if isinstance(response, dict):
                markets = response.get('data', [])
            elif isinstance(response, list):
                markets = response
            else:
                self.logger.error(f"Unexpected response type: {type(response)}")
                return []
            
            # Filter by category if specified
            if category:
                markets = [m for m in markets if m.get('category') == category]
            
            # Filter active markets only
            markets = [m for m in markets if m.get('active', False)]
            
            return markets
            
        except Exception as e:
            self.logger.error(f"Error fetching markets: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            return []
    
    async def get_market(self, market_id: str) -> Optional[Dict]:
        """
        Get specific market data
        
        Args:
            market_id: Market identifier
            
        Returns:
            Market data dict or None
        """
        if self.simulation_mode:
            return self._get_simulated_market(market_id)
        
        try:
            self._rate_limit()
            market = self.client.get_market(market_id)
            return market
            
        except Exception as e:
            self.logger.error(f"Error fetching market {market_id}: {e}")
            return None
    
    async def get_orderbook(self, token_id: str) -> Optional[Dict]:
        """
        Get orderbook for a token
        
        Args:
            token_id: Token identifier
            
        Returns:
            Orderbook data with bids and asks
        """
        if self.simulation_mode:
            return self._get_simulated_orderbook(token_id)
        
        try:
            self._rate_limit()
            orderbook = self.client.get_order_book(token_id)
            
            return {
                'bids': [{'price': float(b['price']), 'size': float(b['size'])} 
                         for b in orderbook.get('bids', [])],
                'asks': [{'price': float(a['price']), 'size': float(a['size'])} 
                         for a in orderbook.get('asks', [])]
            }
            
        except Exception as e:
            self.logger.error(f"Error fetching orderbook for {token_id}: {e}")
            return None
    
    async def execute_arbitrage(self, opportunity: Dict) -> Dict:
        """
        Execute an arbitrage trade
        
        Args:
            opportunity: Arbitrage opportunity dict
            
        Returns:
            Result dict with success status and details
        """
        if self.simulation_mode:
            return self._simulate_execution(opportunity)
        
        try:
            # Extract trade details
            market_id = opportunity['market_id']
            side_a = opportunity['side_a']  # Buy or Sell
            side_b = opportunity['side_b']  # Opposite side
            amount = opportunity['amount']
            
            # Build orders
            order_a = self._build_order(
                token_id=opportunity['token_a_id'],
                side=side_a,
                amount=amount,
                price=opportunity['price_a']
            )
            
            order_b = self._build_order(
                token_id=opportunity['token_b_id'],
                side=side_b,
                amount=amount,
                price=opportunity['price_b']
            )
            
            # Execute orders
            result_a = self.client.create_order(order_a)
            
            if not result_a.get('success'):
                return {
                    'success': False,
                    'error': f"First order failed: {result_a.get('error')}"
                }
            
            result_b = self.client.create_order(order_b)
            
            if not result_b.get('success'):
                # Try to cancel first order
                try:
                    self.client.cancel_order(result_a['order_id'])
                except:
                    pass
                
                return {
                    'success': False,
                    'error': f"Second order failed: {result_b.get('error')}"
                }
            
            # Calculate actual profit
            profit = self._calculate_actual_profit(result_a, result_b, opportunity)
            
            return {
                'success': True,
                'profit': profit,
                'order_a_id': result_a.get('order_id'),
                'order_b_id': result_b.get('order_id'),
                'timestamp': time.time()
            }
            
        except Exception as e:
            self.logger.error(f"Error executing arbitrage: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    def _build_order(self, token_id: str, side: str, amount: float, price: float) -> OrderArgs:
        """Build an order object"""
        return OrderArgs(
            token_id=token_id,
            price=Decimal(str(price)),
            size=Decimal(str(amount)),
            side=BUY if side == 'buy' else SELL,
            order_type=OrderType.LIMIT
        )
    
    def _calculate_actual_profit(self, result_a: Dict, result_b: Dict, opportunity: Dict) -> float:
        """Calculate actual profit from executed orders"""
        # Extract fill prices
        fill_price_a = result_a.get('avg_fill_price', opportunity['price_a'])
        fill_price_b = result_b.get('avg_fill_price', opportunity['price_b'])
        amount = opportunity['amount']
        
        # Calculate profit
        if opportunity['side_a'] == 'buy':
            profit = (fill_price_b - fill_price_a) * amount
        else:
            profit = (fill_price_a - fill_price_b) * amount
        
        # Subtract fees
        fees = self.config.get('maker_fee', 0) + self.config.get('taker_fee', 0)
        gas_cost = self.config.get('gas_estimate', 0.5)
        
        profit -= (amount * fees + gas_cost)
        
        return profit
    
    # Simulation mode methods
    
    def _get_simulated_markets(self, category: Optional[str] = None) -> List[Dict]:
        """Return simulated market data"""
        simulated = [
            {
                'id': 'sim_market_1',
                'question': 'Will Bitcoin reach $100k by end of 2024?',
                'category': 'Crypto',
                'active': True,
                'yes_price': 0.65,
                'no_price': 0.35,
                'volume_24h': 50000
            },
            {
                'id': 'sim_market_2',
                'question': 'Will there be a US recession in 2024?',
                'category': 'Politics',
                'active': True,
                'yes_price': 0.42,
                'no_price': 0.58,
                'volume_24h': 75000
            }
        ]
        
        if category:
            simulated = [m for m in simulated if m['category'] == category]
        
        return simulated
    
    def _get_simulated_market(self, market_id: str) -> Optional[Dict]:
        """Return simulated market"""
        markets = self._get_simulated_markets()
        for market in markets:
            if market['id'] == market_id:
                return market
        return None
    
    def _get_simulated_orderbook(self, token_id: str) -> Dict:
        """Return simulated orderbook"""
        import random
        
        base_price = 0.5 + random.uniform(-0.2, 0.2)
        
        return {
            'bids': [
                {'price': base_price - 0.01, 'size': 100},
                {'price': base_price - 0.02, 'size': 200},
                {'price': base_price - 0.03, 'size': 300}
            ],
            'asks': [
                {'price': base_price + 0.01, 'size': 100},
                {'price': base_price + 0.02, 'size': 200},
                {'price': base_price + 0.03, 'size': 300}
            ]
        }
    
    def _simulate_execution(self, opportunity: Dict) -> Dict:
        """Simulate trade execution"""
        import random

        # Simulate with 95% success rate
        success = random.random() > 0.05
        
        if success:
            # Simulate slippage
            slippage = random.uniform(0, 0.002)  # 0-0.2% slippage
            actual_profit = opportunity['expected_profit'] * (1 - slippage)
            
            return {
                'success': True,
                'profit': actual_profit,
                'order_a_id': f"sim_order_{int(time.time())}_a",
                'order_b_id': f"sim_order_{int(time.time())}_b",
                'timestamp': time.time(),
                'simulated': True
            }
        else:
            return {
                'success': False,
                'error': 'Simulated failure',
                'simulated': True
            }
