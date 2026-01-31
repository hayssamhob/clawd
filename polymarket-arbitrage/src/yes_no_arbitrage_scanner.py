"""
YES/NO Arbitrage Scanner for 15-Minute Crypto Markets

Specialized scanner for risk-free arbitrage on Polymarket 15-minute
BTC, ETH, SOL prediction markets.

Mathematical Guarantee: YES + NO always = $1.00 at resolution
If YES + NO < $1.00 → guaranteed profit
"""

import logging
from typing import Dict, List, Optional
from dataclasses import dataclass
from decimal import Decimal
from datetime import datetime
import asyncio
import time


@dataclass
class ArbitrageOpportunity:
    """Represents a YES/NO arbitrage opportunity"""
    market_id: str
    market_name: str
    yes_token_id: str
    no_token_id: str
    yes_ask_price: Decimal
    no_ask_price: Decimal
    combined_price: Decimal
    gross_margin: Decimal
    net_margin: Decimal
    yes_liquidity: Decimal
    no_liquidity: Decimal
    time_remaining: int  # seconds
    score: float
    discovered_at: datetime
    
    def to_dict(self) -> Dict:
        return {
            'type': 'yes_no_arbitrage',
            'strategy': 'yes_no_arbitrage',
            'market_id': self.market_id,
            'market_name': self.market_name,
            'yes_token_id': self.yes_token_id,
            'no_token_id': self.no_token_id,
            'yes_price': float(self.yes_ask_price),
            'no_price': float(self.no_ask_price),
            'combined_price': float(self.combined_price),
            'gross_margin': float(self.gross_margin),
            'net_margin': float(self.net_margin),
            'expected_profit': float(self.net_margin),
            'yes_liquidity': float(self.yes_liquidity),
            'no_liquidity': float(self.no_liquidity),
            'time_remaining': self.time_remaining,
            'score': self.score,
            'discovered_at': self.discovered_at
        }


class YesNoArbitrageScanner:
    """
    Specialized scanner for 15-minute crypto YES/NO arbitrage
    
    ONLY scans BTC, ETH, SOL 15-minute markets
    ONLY finds opportunities where YES + NO < $1.00
    """
    
    def __init__(self, client, config: Dict):
        self.client = client
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Capital config
        capital_config = config.get('capital', {})
        self.total_capital = Decimal(str(capital_config.get('total_capital', 100)))
        self.reserve_ratio = Decimal(str(capital_config.get('reserve_ratio', 0.20)))
        self.max_deployment = Decimal(str(capital_config.get('max_deployment_ratio', 0.80)))
        self.max_single_position = Decimal(str(capital_config.get('max_single_position', 20)))
        
        # Scanner config
        scanner_config = config.get('scanner', {})
        self.target_markets = scanner_config.get('target_markets', ['BTC', 'ETH', 'SOL'])
        self.market_keywords = scanner_config.get('market_keywords', ['15 min', '15min', '15-min'])
        self.min_liquidity = Decimal(str(scanner_config.get('min_liquidity', 100)))
        self.min_combined_liquidity = Decimal(str(scanner_config.get('min_combined_liquidity', 200)))
        self.max_combined_price = Decimal(str(scanner_config.get('max_combined_price', 0.98)))
        self.min_time_remaining = scanner_config.get('min_time_remaining', 120)
        self.max_spread = Decimal(str(scanner_config.get('max_spread', 0.03)))
        
        # Profitability config
        polymarket_config = config.get('polymarket', {})
        self.min_gross_margin = Decimal(str(polymarket_config.get('min_gross_margin', 0.025)))
        self.min_net_margin = Decimal(str(polymarket_config.get('min_net_margin', 0.015)))
        self.min_dollar_profit = Decimal(str(polymarket_config.get('min_dollar_profit', 0.30)))
        self.platform_fee = Decimal(str(polymarket_config.get('platform_fee', 0.02)))
        self.gas_estimate = Decimal(str(polymarket_config.get('gas_estimate', 0.05)))
        self.slippage_tolerance = Decimal(str(polymarket_config.get('slippage_tolerance', 0.005)))
        
        # Arbitrage config
        arb_config = config.get('yes_no_arbitrage', {})
        self.profit_weight = arb_config.get('profit_weight', 100)
        self.time_weight = arb_config.get('time_weight', 2)
        self.liquidity_weight = arb_config.get('liquidity_weight', 0.01)
        
        # Tracking
        self.last_scan_time = None
        self.scan_count = 0
        
        self.logger.info(f"YesNoArbitrageScanner initialized for {self.target_markets}")
        self.logger.info(f"Capital: ${self.total_capital}, Max position: ${self.max_single_position}")
    
    async def scan_markets(self) -> List[Dict]:
        """
        Scan for 15-minute crypto arbitrage opportunities
        
        Returns:
            List of opportunities sorted by score (highest first)
        """
        self.last_scan_time = datetime.now()
        self.scan_count += 1
        opportunities = []
        
        try:
            # Get all markets from API
            all_markets = await self.client.get_markets()
            
            # Filter to target 15-minute crypto markets
            target_markets = self._filter_target_markets(all_markets)
            
            self.logger.debug(f"Found {len(target_markets)} target 15-min markets")
            
            # Evaluate each market for arbitrage
            for market in target_markets:
                opp = await self._evaluate_market(market)
                if opp:
                    opportunities.append(opp.to_dict())
            
            # Sort by score (highest first)
            opportunities.sort(key=lambda x: x['score'], reverse=True)
            
            if opportunities:
                self.logger.info(f"🎯 Found {len(opportunities)} arbitrage opportunities!")
                for opp in opportunities[:3]:  # Log top 3
                    self.logger.info(
                        f"  {opp['market_name'][:50]}... | "
                        f"Margin: {opp['net_margin']*100:.2f}% | "
                        f"Score: {opp['score']:.1f}"
                    )
            
        except Exception as e:
            self.logger.error(f"Error scanning markets: {e}", exc_info=True)
        
        return opportunities
    
    def _filter_target_markets(self, markets: List[Dict]) -> List[Dict]:
        """Filter markets to only 15-minute crypto predictions"""
        target_markets = []
        
        for market in markets:
            # Check if market is active
            if not market.get('active', False):
                continue
            
            # Get market question/name
            question = market.get('question', '').lower()
            
            # Check if it matches target crypto assets
            matches_asset = any(
                asset.lower() in question 
                for asset in self.target_markets
            )
            
            if not matches_asset:
                continue
            
            # Check if it's a 15-minute market
            matches_timeframe = any(
                keyword.lower() in question 
                for keyword in self.market_keywords
            )
            
            if not matches_timeframe:
                continue
            
            # Check if it's an up/down or yes/no market
            is_binary = any(
                term in question 
                for term in ['up or down', 'higher or lower', 'yes', 'no', 'above', 'below']
            )
            
            if is_binary or market.get('yes_token_id') or market.get('tokens'):
                target_markets.append(market)
        
        return target_markets
    
    async def _evaluate_market(self, market: Dict) -> Optional[ArbitrageOpportunity]:
        """
        Evaluate a market for YES/NO arbitrage opportunity
        
        Returns ArbitrageOpportunity if profitable, None otherwise
        """
        market_id = market.get('id', market.get('condition_id', ''))
        market_name = market.get('question', 'Unknown Market')
        
        try:
            # Get token IDs
            yes_token_id = market.get('yes_token_id')
            no_token_id = market.get('no_token_id')
            
            # Handle markets with 'tokens' array instead
            if not yes_token_id and 'tokens' in market:
                tokens = market['tokens']
                if len(tokens) >= 2:
                    yes_token_id = tokens[0].get('token_id')
                    no_token_id = tokens[1].get('token_id')
            
            if not yes_token_id or not no_token_id:
                return None
            
            # Get orderbooks for both sides
            yes_book = await self.client.get_orderbook(yes_token_id)
            no_book = await self.client.get_orderbook(no_token_id)
            
            if not yes_book or not no_book:
                return None
            
            # Get best ask prices (what we'd pay to buy)
            yes_asks = yes_book.get('asks', [])
            no_asks = no_book.get('asks', [])
            
            if not yes_asks or not no_asks:
                return None
            
            yes_ask_price = Decimal(str(yes_asks[0]['price']))
            no_ask_price = Decimal(str(no_asks[0]['price']))
            
            # Calculate combined price
            combined_price = yes_ask_price + no_ask_price
            
            # CORE CHECK: Is combined price < $1.00?
            if combined_price >= Decimal('1.0'):
                return None  # No arbitrage opportunity
            
            # Check if combined price meets minimum threshold
            if combined_price > self.max_combined_price:
                return None  # Not enough margin
            
            # Calculate gross margin
            gross_margin = Decimal('1.0') - combined_price
            
            if gross_margin < self.min_gross_margin:
                return None
            
            # Calculate liquidity
            yes_liquidity = Decimal(str(sum(
                ask['size'] * ask['price'] for ask in yes_asks[:3]
            )))
            no_liquidity = Decimal(str(sum(
                ask['size'] * ask['price'] for ask in no_asks[:3]
            )))
            
            # Check liquidity requirements
            if yes_liquidity < self.min_liquidity or no_liquidity < self.min_liquidity:
                return None
            
            if (yes_liquidity + no_liquidity) < self.min_combined_liquidity:
                return None
            
            # Check spread on each side
            yes_spread = self._calculate_spread(yes_book)
            no_spread = self._calculate_spread(no_book)
            
            if yes_spread > self.max_spread or no_spread > self.max_spread:
                return None
            
            # Get time remaining (approximate)
            time_remaining = self._estimate_time_remaining(market)
            
            if time_remaining < self.min_time_remaining:
                return None  # Too close to resolution
            
            # Calculate net margin after fees
            net_margin = self._calculate_net_margin(gross_margin, yes_ask_price, no_ask_price)
            
            if net_margin < self.min_net_margin:
                return None
            
            # Calculate dollar profit for max position
            position_size = min(self.max_single_position, yes_liquidity, no_liquidity)
            dollar_profit = net_margin * position_size
            
            if dollar_profit < self.min_dollar_profit:
                return None
            
            # Calculate priority score
            score = self._calculate_score(net_margin, time_remaining, min(yes_liquidity, no_liquidity))
            
            return ArbitrageOpportunity(
                market_id=market_id,
                market_name=market_name,
                yes_token_id=yes_token_id,
                no_token_id=no_token_id,
                yes_ask_price=yes_ask_price,
                no_ask_price=no_ask_price,
                combined_price=combined_price,
                gross_margin=gross_margin,
                net_margin=net_margin,
                yes_liquidity=yes_liquidity,
                no_liquidity=no_liquidity,
                time_remaining=time_remaining,
                score=score,
                discovered_at=datetime.now()
            )
            
        except Exception as e:
            self.logger.debug(f"Error evaluating market {market_id}: {e}")
            return None
    
    def _calculate_net_margin(self, gross_margin: Decimal, 
                              yes_price: Decimal, no_price: Decimal) -> Decimal:
        """
        Calculate net profit margin after all fees
        
        Fees:
        - Platform fee: 2% on winning side only
        - Gas: ~$0.05 per transaction (2 transactions)
        - Slippage buffer: 0.5%
        """
        # Platform fee is 2% on the winning side
        # Since we hold both YES and NO, one will win
        # Expected fee = 2% * $1.00 (the winning payout) = $0.02 per share
        platform_fee_per_share = self.platform_fee
        
        # Gas fees (2 transactions) as percentage of position
        # For $20 position: $0.10 gas / $20 = 0.5%
        gas_fee_ratio = (self.gas_estimate * 2) / self.max_single_position
        
        # Slippage buffer
        slippage = self.slippage_tolerance
        
        # Net margin
        net_margin = gross_margin - platform_fee_per_share - gas_fee_ratio - slippage
        
        return max(net_margin, Decimal('0'))
    
    def _calculate_spread(self, orderbook: Dict) -> Decimal:
        """Calculate bid-ask spread percentage"""
        bids = orderbook.get('bids', [])
        asks = orderbook.get('asks', [])
        
        if not bids or not asks:
            return Decimal('1.0')  # Maximum spread if no data
        
        best_bid = Decimal(str(bids[0]['price']))
        best_ask = Decimal(str(asks[0]['price']))
        
        if best_ask == 0:
            return Decimal('1.0')
        
        spread = (best_ask - best_bid) / best_ask
        return spread
    
    def _estimate_time_remaining(self, market: Dict) -> int:
        """Estimate seconds remaining until market resolution"""
        # Try to get end time from market data
        end_time = market.get('end_date_iso') or market.get('end_time')
        
        if end_time:
            try:
                from datetime import datetime
                if isinstance(end_time, str):
                    # Parse ISO format
                    end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                    remaining = (end_dt - datetime.now(end_dt.tzinfo)).total_seconds()
                    return max(0, int(remaining))
            except:
                pass
        
        # Default: assume 15 minutes for 15-minute markets
        # This is conservative - better to check Polymarket API for actual end time
        return 900  # 15 minutes in seconds
    
    def _calculate_score(self, net_margin: Decimal, time_remaining: int, 
                        min_liquidity: Decimal) -> float:
        """
        Calculate priority score for opportunity ranking
        
        Higher score = higher priority
        """
        score = (
            float(net_margin) * self.profit_weight +
            (time_remaining / 60) * self.time_weight +
            float(min_liquidity) * self.liquidity_weight
        )
        return score
    
    def calculate_position_size(self, opportunity: Dict) -> Decimal:
        """
        Calculate optimal position size for an opportunity
        
        Constraints:
        - Max 20% of capital per position
        - Don't exceed 90% of available liquidity
        - Scale with profit margin
        """
        available_capital = self.total_capital * self.max_deployment
        
        # Start with max single position
        size = self.max_single_position
        
        # Don't exceed 90% of minimum liquidity
        min_liquidity = Decimal(str(min(
            opportunity.get('yes_liquidity', 0),
            opportunity.get('no_liquidity', 0)
        )))
        size = min(size, min_liquidity * Decimal('0.9'))
        
        # Scale with profit margin (higher margin = larger position)
        net_margin = Decimal(str(opportunity.get('net_margin', 0)))
        if net_margin > self.min_net_margin * 2:
            # Allow up to 25% for very profitable opportunities
            size = min(size, self.total_capital * Decimal('0.25'))
        
        # Never exceed available capital
        size = min(size, available_capital)
        
        return max(size, Decimal('0'))
    
    def calculate_profit(self, market: Dict, opportunity: Dict) -> float:
        """Recalculate profit with fresh market data"""
        # This would re-fetch orderbook and recalculate
        # For now, return the stored expected profit
        return opportunity.get('expected_profit', 0)
