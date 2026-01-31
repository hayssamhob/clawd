#!/usr/bin/env python3
"""
Market Making Strategy for Polymarket
High-frequency trading with bid-ask spread capture
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime
import asyncio


class MarketMaker:
    """
    Market making strategy - provide liquidity and earn the spread
    
    How it works:
    1. Place a BUY order slightly below current price
    2. Place a SELL order slightly above current price
    3. When both fill, earn the spread
    4. Repeat constantly
    
    Example:
    - Current YES price: $0.50
    - Place BUY at $0.49 (1 cent below)
    - Place SELL at $0.51 (1 cent above)
    - When both fill: $0.02 profit per share (4% return)
    """
    
    def __init__(self, client, config: Dict):
        """Initialize market maker"""
        self.client = client
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Market making params
        self.spread_target = config.get('market_making', {}).get('spread_target', 0.02)  # 2%
        self.position_size = config.get('market_making', {}).get('position_size', 50)
        self.max_positions = config.get('market_making', {}).get('max_positions', 10)
        self.min_volume = config.get('market_making', {}).get('min_volume', 10000)
        
        # Track open positions
        self.open_positions = {}
        self.pending_orders = {}
        
    async def find_markets_to_make(self) -> List[Dict]:
        """
        Find high-volume markets suitable for market making
        
        Criteria:
        - High 24h volume (lots of trading)
        - Narrow current spread (efficient market)
        - Active (not resolved)
        - Binary outcome (Yes/No only)
        """
        suitable_markets = []
        
        # Get all active markets
        categories = ['Politics', 'Crypto', 'Sports', 'Business']
        
        for category in categories:
            try:
                markets = await self.client.get_markets(category)
                
                for market in markets:
                    # Must be high volume
                    volume_24h = market.get('volume_24h', 0)
                    if volume_24h < self.min_volume:
                        continue
                    
                    # Must be binary (Yes/No only)
                    if not self._is_binary_market(market):
                        continue
                    
                    # Must be active
                    if not market.get('active', False):
                        continue
                    
                    # Get current orderbook
                    token_id = market.get('tokens', [{}])[0].get('token_id')
                    if not token_id:
                        continue
                    
                    orderbook = await self.client.get_orderbook(token_id)
                    if not orderbook:
                        continue
                    
                    # Check if spread is reasonable
                    current_spread = self._calculate_spread(orderbook)
                    if current_spread > 0.10:  # Skip if spread > 10%
                        continue
                    
                    suitable_markets.append({
                        'market_id': market.get('condition_id'),
                        'market_name': market.get('question', 'Unknown'),
                        'token_id': token_id,
                        'volume_24h': volume_24h,
                        'current_spread': current_spread,
                        'orderbook': orderbook
                    })
                    
            except Exception as e:
                self.logger.error(f"Error scanning {category}: {e}")
                continue
        
        # Sort by volume (highest first)
        suitable_markets.sort(key=lambda x: x['volume_24h'], reverse=True)
        
        return suitable_markets[:20]  # Top 20 markets
    
    async def make_market(self, market: Dict) -> Optional[Dict]:
        """
        Place market making orders for a specific market
        
        Strategy:
        1. Calculate mid-price from orderbook
        2. Place buy order at mid - spread/2
        3. Place sell order at mid + spread/2
        4. Monitor for fills
        5. Repeat when orders fill
        """
        try:
            orderbook = market['orderbook']
            
            # Get best bid and ask
            best_bid = orderbook['bids'][0]['price'] if orderbook.get('bids') else 0
            best_ask = orderbook['asks'][0]['price'] if orderbook.get('asks') else 1
            
            # Calculate mid price
            mid_price = (best_bid + best_ask) / 2
            
            # Calculate our buy/sell prices with desired spread
            our_buy_price = mid_price - (self.spread_target / 2)
            our_sell_price = mid_price + (self.spread_target / 2)
            
            # Ensure prices are valid (between 0 and 1)
            our_buy_price = max(0.01, min(0.99, our_buy_price))
            our_sell_price = max(0.01, min(0.99, our_sell_price))
            
            # Calculate expected profit
            profit_per_share = our_sell_price - our_buy_price
            total_profit = profit_per_share * self.position_size
            
            # Only proceed if profitable
            if profit_per_share < 0.01:  # At least 1 cent per share
                return None
            
            self.logger.info(
                f"Market making opportunity: {market['market_name'][:50]}... "
                f"Buy@${our_buy_price:.3f} Sell@${our_sell_price:.3f} "
                f"Profit: ${total_profit:.2f}"
            )
            
            return {
                'market_id': market['market_id'],
                'market_name': market['market_name'],
                'token_id': market['token_id'],
                'buy_price': our_buy_price,
                'sell_price': our_sell_price,
                'size': self.position_size,
                'expected_profit': total_profit,
                'strategy': 'market_making'
            }
            
        except Exception as e:
            self.logger.error(f"Error making market for {market.get('market_name')}: {e}")
            return None
    
    async def execute_market_making(self, opportunity: Dict) -> Dict:
        """
        Execute market making strategy
        
        Returns immediately with pending status.
        Orders are monitored in background.
        """
        try:
            # Place buy order (limit order below market)
            buy_order = {
                'token_id': opportunity['token_id'],
                'side': 'buy',
                'price': opportunity['buy_price'],
                'size': opportunity['size'],
                'order_type': 'limit'
            }
            
            # Place sell order (limit order above market)
            sell_order = {
                'token_id': opportunity['token_id'],
                'side': 'sell',
                'price': opportunity['sell_price'],
                'size': opportunity['size'],
                'order_type': 'limit'
            }
            
            # In dry-run mode, simulate
            if self.client.simulation_mode:
                return {
                    'success': True,
                    'buy_order_id': f"sim_buy_{int(datetime.now().timestamp())}",
                    'sell_order_id': f"sim_sell_{int(datetime.now().timestamp())}",
                    'status': 'pending',
                    'expected_profit': opportunity['expected_profit'],
                    'simulated': True
                }
            
            # Execute real orders
            buy_result = await self.client.create_order(buy_order)
            
            if not buy_result.get('success'):
                return {
                    'success': False,
                    'error': f"Buy order failed: {buy_result.get('error')}"
                }
            
            sell_result = await self.client.create_order(sell_order)
            
            if not sell_result.get('success'):
                # Cancel buy order
                try:
                    await self.client.cancel_order(buy_result['order_id'])
                except:
                    pass
                
                return {
                    'success': False,
                    'error': f"Sell order failed: {sell_result.get('error')}"
                }
            
            # Track position
            position_id = f"{opportunity['market_id']}_{int(datetime.now().timestamp())}"
            self.open_positions[position_id] = {
                'buy_order_id': buy_result['order_id'],
                'sell_order_id': sell_result['order_id'],
                'buy_price': opportunity['buy_price'],
                'sell_price': opportunity['sell_price'],
                'size': opportunity['size'],
                'expected_profit': opportunity['expected_profit'],
                'timestamp': datetime.now()
            }
            
            return {
                'success': True,
                'buy_order_id': buy_result['order_id'],
                'sell_order_id': sell_result['order_id'],
                'status': 'pending',
                'expected_profit': opportunity['expected_profit'],
                'position_id': position_id
            }
            
        except Exception as e:
            self.logger.error(f"Error executing market making: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _is_binary_market(self, market: Dict) -> bool:
        """Check if market is binary (Yes/No)"""
        tokens = market.get('tokens', [])
        return len(tokens) == 2
    
    def _calculate_spread(self, orderbook: Dict) -> float:
        """Calculate current bid-ask spread"""
        if not orderbook.get('bids') or not orderbook.get('asks'):
            return 1.0  # Max spread if no orders
        
        best_bid = orderbook['bids'][0]['price']
        best_ask = orderbook['asks'][0]['price']
        
        return best_ask - best_bid


class SpreadCaptureStrategy:
    """
    Alternative strategy: Capture existing spreads
    
    Finds markets with wide spreads and places orders in the middle
    to earn when traders cross the spread
    """
    
    def __init__(self, client, config: Dict):
        self.client = client
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        self.min_spread = config.get('spread_capture', {}).get('min_spread', 0.03)  # 3%
        self.position_size = config.get('spread_capture', {}).get('position_size', 100)
    
    async def find_wide_spreads(self) -> List[Dict]:
        """Find markets with wide bid-ask spreads"""
        opportunities = []
        
        categories = ['Politics', 'Crypto', 'Sports']
        
        for category in categories:
            markets = await self.client.get_markets(category)
            
            for market in markets:
                if not market.get('active'):
                    continue
                
                # Get orderbook
                token_id = market.get('tokens', [{}])[0].get('token_id')
                if not token_id:
                    continue
                
                orderbook = await self.client.get_orderbook(token_id)
                if not orderbook or not orderbook.get('bids') or not orderbook.get('asks'):
                    continue
                
                best_bid = orderbook['bids'][0]['price']
                best_ask = orderbook['asks'][0]['price']
                spread = best_ask - best_bid
                
                # Wide spread = opportunity
                if spread >= self.min_spread:
                    mid_price = (best_bid + best_ask) / 2
                    
                    opportunities.append({
                        'market_name': market.get('question'),
                        'token_id': token_id,
                        'best_bid': best_bid,
                        'best_ask': best_ask,
                        'spread': spread,
                        'mid_price': mid_price,
                        'expected_profit': spread * self.position_size
                    })
        
        opportunities.sort(key=lambda x: x['spread'], reverse=True)
        return opportunities[:10]
