"""
Opportunity Scanner
Scans Polymarket markets for arbitrage opportunities
"""

import logging
from typing import Dict, List
import asyncio
from datetime import datetime


class OpportunityScanner:
    """Scans markets for arbitrage opportunities"""
    
    def __init__(self, client, config: Dict):
        """
        Initialize opportunity scanner
        
        Args:
            client: PolymarketClient instance
            config: Configuration dict
        """
        self.client = client
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Scanner config
        self.min_profit = config['polymarket']['min_profit_threshold']
        self.min_liquidity = config['scanner']['min_liquidity']
        self.min_volume = config['scanner']['min_volume_24h']
        self.max_spread = config['scanner']['max_spread']
        
        # Cache for market data
        self.market_cache = {}
        self.cache_ttl = config.get('advanced', {}).get('cache_ttl_seconds', 30)
    
    async def scan_markets(self) -> List[Dict]:
        """
        Scan all markets for arbitrage opportunities
        
        Returns:
            List of opportunities sorted by expected profit
        """
        opportunities = []
        
        # Get markets for each category
        categories = self.config['scanner']['markets']
        
        for category in categories:
            try:
                markets = await self.client.get_markets(category)
                self.logger.debug(f"Scanning {len(markets)} markets in {category}")
                
                # Scan each market
                for market in markets:
                    # Filter by volume and liquidity
                    if not self._meets_minimum_criteria(market):
                        continue
                    
                    # Check for arbitrage
                    opp = await self._check_market_for_arbitrage(market)
                    if opp:
                        opportunities.append(opp)
                
            except Exception as e:
                self.logger.error(f"Error scanning {category}: {e}")
                continue
        
        # Sort by expected profit (descending)
        opportunities.sort(key=lambda x: x['expected_profit'], reverse=True)
        
        return opportunities
    
    def _meets_minimum_criteria(self, market: Dict) -> bool:
        """Check if market meets minimum criteria"""
        volume = market.get('volume_24h', 0)
        if volume < self.min_volume:
            return False
        
        # Check liquidity (simplified - would need orderbook data for accurate check)
        liquidity = market.get('liquidity', market.get('volume_24h', 0) * 0.1)
        if liquidity < self.min_liquidity:
            return False
        
        return True
    
    async def _check_market_for_arbitrage(self, market: Dict) -> Optional[Dict]:
        """
        Check a specific market for arbitrage opportunities
        
        Arbitrage types:
        1. Yes/No price inconsistency (prices don't sum to 1)
        2. Orderbook arbitrage (bid/ask spreads)
        3. Cross-market arbitrage (same event on different markets)
        
        Args:
            market: Market data dict
            
        Returns:
            Opportunity dict or None
        """
        market_id = market['id']
        
        # Type 1: Yes/No price inconsistency
        yes_price = market.get('yes_price', 0.5)
        no_price = market.get('no_price', 0.5)
        
        # Prices should sum to 1 (or very close due to fees)
        price_sum = yes_price + no_price
        
        # If sum is significantly different from 1, there's an opportunity
        deviation = abs(price_sum - 1.0)
        
        if deviation > 0.01:  # More than 1% deviation
            # Calculate profit potential
            profit = await self._calculate_yes_no_arbitrage(market, yes_price, no_price)
            
            if profit and profit >= self.min_profit:
                return {
                    'type': 'yes_no_arbitrage',
                    'market_id': market_id,
                    'market_name': market.get('question', 'Unknown'),
                    'yes_price': yes_price,
                    'no_price': no_price,
                    'expected_profit': profit,
                    'discovered_at': datetime.now(),
                    'confidence': 'high'
                }
        
        # Type 2: Orderbook arbitrage
        # This would require fetching orderbook data
        # opp = await self._check_orderbook_arbitrage(market)
        # if opp:
        #     return opp
        
        return None
    
    async def _calculate_yes_no_arbitrage(self, market: Dict, 
                                          yes_price: float, no_price: float) -> Optional[float]:
        """
        Calculate profit from yes/no arbitrage
        
        Strategy: Buy both YES and NO shares when sum < 1
        Guaranteed payout: 1 USDC per share
        Cost: yes_price + no_price
        Profit: 1 - (yes_price + no_price)
        
        Args:
            market: Market dict
            yes_price: Current YES price
            no_price: Current NO price
            
        Returns:
            Expected profit per USDC invested, or None
        """
        price_sum = yes_price + no_price
        
        # Only profitable if sum < 1
        if price_sum >= 1.0:
            return None
        
        # Calculate profit
        gross_profit = 1.0 - price_sum
        
        # Account for fees
        fees = self.config['polymarket'].get('maker_fee', 0) + \
               self.config['polymarket'].get('taker_fee', 0)
        gas_cost = self.config['polymarket'].get('gas_estimate', 0.5)
        
        # Calculate position size
        max_position = self.config['polymarket']['max_position_size']
        
        # Net profit
        net_profit = (gross_profit * max_position) - (fees * max_position * 2) - gas_cost
        
        # Return profit as percentage
        return net_profit / max_position if max_position > 0 else 0
    
    async def _check_orderbook_arbitrage(self, market: Dict) -> Optional[Dict]:
        """
        Check for orderbook arbitrage opportunities
        
        Look for situations where:
        - Best bid for YES > Best ask for NO (or vice versa)
        - Can buy low and sell high simultaneously
        
        Args:
            market: Market dict
            
        Returns:
            Opportunity dict or None
        """
        market_id = market['id']
        
        # Get orderbooks for YES and NO tokens
        yes_token_id = market.get('yes_token_id')
        no_token_id = market.get('no_token_id')
        
        if not yes_token_id or not no_token_id:
            return None
        
        try:
            yes_book = await self.client.get_orderbook(yes_token_id)
            no_book = await self.client.get_orderbook(no_token_id)
            
            if not yes_book or not no_book:
                return None
            
            # Get best prices
            best_yes_bid = yes_book['bids'][0]['price'] if yes_book['bids'] else 0
            best_yes_ask = yes_book['asks'][0]['price'] if yes_book['asks'] else 1
            best_no_bid = no_book['bids'][0]['price'] if no_book['bids'] else 0
            best_no_ask = no_book['asks'][0]['price'] if no_book['asks'] else 1
            
            # Check for arbitrage
            # Strategy 1: Buy YES low, implied sell NO high
            if (1 - best_yes_ask) > best_no_bid:
                profit = await self._calculate_orderbook_profit(
                    'buy_yes_sell_no',
                    best_yes_ask,
                    best_no_bid,
                    yes_book,
                    no_book
                )
                
                if profit and profit >= self.min_profit:
                    return {
                        'type': 'orderbook_arbitrage',
                        'strategy': 'buy_yes_sell_no',
                        'market_id': market_id,
                        'market_name': market.get('question', 'Unknown'),
                        'entry_price': best_yes_ask,
                        'exit_price': best_no_bid,
                        'expected_profit': profit,
                        'discovered_at': datetime.now(),
                        'confidence': 'medium'
                    }
            
            # Strategy 2: Buy NO low, implied sell YES high
            if (1 - best_no_ask) > best_yes_bid:
                profit = await self._calculate_orderbook_profit(
                    'buy_no_sell_yes',
                    best_no_ask,
                    best_yes_bid,
                    no_book,
                    yes_book
                )
                
                if profit and profit >= self.min_profit:
                    return {
                        'type': 'orderbook_arbitrage',
                        'strategy': 'buy_no_sell_yes',
                        'market_id': market_id,
                        'market_name': market.get('question', 'Unknown'),
                        'entry_price': best_no_ask,
                        'exit_price': best_yes_bid,
                        'expected_profit': profit,
                        'discovered_at': datetime.now(),
                        'confidence': 'medium'
                    }
            
        except Exception as e:
            self.logger.error(f"Error checking orderbook arbitrage: {e}")
        
        return None
    
    async def _calculate_orderbook_profit(self, strategy: str, entry_price: float,
                                          exit_price: float, entry_book: Dict,
                                          exit_book: Dict) -> Optional[float]:
        """Calculate profit from orderbook arbitrage"""
        # Calculate available liquidity
        entry_liquidity = sum(level['size'] for level in entry_book['asks'][:3])
        exit_liquidity = sum(level['size'] for level in exit_book['bids'][:3])
        
        # Take minimum of both sides
        max_size = min(entry_liquidity, exit_liquidity)
        
        # Limit to max position size
        max_position = self.config['polymarket']['max_position_size']
        size = min(max_size, max_position / entry_price)
        
        if size < 10:  # Minimum 10 shares
            return None
        
        # Calculate profit
        gross_profit = (exit_price - entry_price) * size
        
        # Account for fees and gas
        fees = self.config['polymarket'].get('maker_fee', 0) + \
               self.config['polymarket'].get('taker_fee', 0)
        gas_cost = self.config['polymarket'].get('gas_estimate', 0.5)
        
        net_profit = gross_profit - (fees * size * (entry_price + exit_price)) - gas_cost
        
        # Return as percentage
        return (net_profit / (size * entry_price)) if (size * entry_price) > 0 else 0
    
    def calculate_profit(self, market: Dict, opportunity: Dict) -> float:
        """
        Recalculate profit for an opportunity with fresh data
        
        Args:
            market: Fresh market data
            opportunity: Existing opportunity
            
        Returns:
            Updated profit estimate
        """
        opp_type = opportunity.get('type')
        
        if opp_type == 'yes_no_arbitrage':
            yes_price = market.get('yes_price', 0.5)
            no_price = market.get('no_price', 0.5)
            return self._calculate_yes_no_arbitrage(market, yes_price, no_price) or 0
        
        # For other types, would need to refresh orderbooks, etc.
        return opportunity.get('expected_profit', 0)
