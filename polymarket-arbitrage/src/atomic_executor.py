"""
Atomic Order Executor for YES/NO Arbitrage
"""

import logging
import asyncio
import time
from typing import Dict, Optional
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum


class ExecutionStatus(Enum):
    SUCCESS = "success"
    PARTIAL_FILL = "partial_fill"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class OrderResult:
    success: bool
    order_id: Optional[str]
    side: str
    requested_size: Decimal
    filled_size: Decimal
    fill_price: Decimal
    status: ExecutionStatus
    error: Optional[str] = None
    
    @property
    def fill_ratio(self) -> float:
        if self.requested_size == 0:
            return 0
        return float(self.filled_size / self.requested_size)


@dataclass 
class ExecutionResult:
    success: bool
    yes_order: Optional[OrderResult]
    no_order: Optional[OrderResult]
    locked_profit: Decimal
    actual_cost: Decimal
    status: ExecutionStatus
    reason: str
    timestamp: float
    execution_time_ms: float
    
    def to_dict(self) -> Dict:
        return {
            'success': self.success,
            'profit': float(self.locked_profit),
            'cost': float(self.actual_cost),
            'status': self.status.value,
            'reason': self.reason,
            'timestamp': self.timestamp
        }
    
    def to_position(self) -> Dict:
        return {
            'size': float(self.yes_order.filled_size) if self.yes_order else 0,
            'yes_price': float(self.yes_order.fill_price) if self.yes_order else 0,
            'no_price': float(self.no_order.fill_price) if self.no_order else 0,
            'locked_profit': float(self.locked_profit),
            'timestamp': self.timestamp,
            'status': 'open'
        }


class AtomicExecutor:
    """Executes YES/NO orders atomically"""
    
    def __init__(self, client, config: Dict):
        self.client = client
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        exec_config = config.get('execution', {})
        self.order_timeout = exec_config.get('order_timeout_seconds', 10)
        self.min_fill_ratio = Decimal(str(exec_config.get('min_fill_ratio', 0.80)))
        
        polymarket_config = config.get('polymarket', {})
        self.platform_fee = Decimal(str(polymarket_config.get('platform_fee', 0.02)))
        self.gas_estimate = Decimal(str(polymarket_config.get('gas_estimate', 0.05)))
        
        self.total_executions = 0
        self.successful_executions = 0
    
    async def execute_arbitrage(self, opportunity: Dict, position_size: Decimal) -> ExecutionResult:
        """Execute YES/NO arbitrage atomically"""
        start_time = time.time()
        self.total_executions += 1
        
        # Pre-flight check
        preflight = await self._preflight_check(opportunity, position_size)
        if not preflight['valid']:
            return ExecutionResult(
                success=False, yes_order=None, no_order=None,
                locked_profit=Decimal('0'), actual_cost=Decimal('0'),
                status=ExecutionStatus.FAILED, reason=preflight['reason'],
                timestamp=time.time(), execution_time_ms=(time.time() - start_time) * 1000
            )
        
        try:
            # Execute both orders simultaneously
            yes_result, no_result = await asyncio.gather(
                self._place_order('YES', opportunity, position_size),
                self._place_order('NO', opportunity, position_size),
                return_exceptions=True
            )
            
            # Handle exceptions
            if isinstance(yes_result, Exception):
                yes_result = self._failed_order('YES', position_size, str(yes_result))
            if isinstance(no_result, Exception):
                no_result = self._failed_order('NO', position_size, str(no_result))
            
            return await self._evaluate_execution(yes_result, no_result, opportunity, start_time)
            
        except Exception as e:
            self.logger.error(f"Execution error: {e}")
            return ExecutionResult(
                success=False, yes_order=None, no_order=None,
                locked_profit=Decimal('0'), actual_cost=Decimal('0'),
                status=ExecutionStatus.FAILED, reason=str(e),
                timestamp=time.time(), execution_time_ms=(time.time() - start_time) * 1000
            )
    
    async def _preflight_check(self, opportunity: Dict, position_size: Decimal) -> Dict:
        """Validate before execution"""
        try:
            yes_book = await self.client.get_orderbook(opportunity['yes_token_id'])
            no_book = await self.client.get_orderbook(opportunity['no_token_id'])
            
            if not yes_book or not no_book:
                return {'valid': False, 'reason': 'Could not fetch orderbooks'}
            
            yes_asks = yes_book.get('asks', [])
            no_asks = no_book.get('asks', [])
            
            if not yes_asks or not no_asks:
                return {'valid': False, 'reason': 'No asks available'}
            
            current_yes = Decimal(str(yes_asks[0]['price']))
            current_no = Decimal(str(no_asks[0]['price']))
            
            if current_yes + current_no >= Decimal('1.0'):
                return {'valid': False, 'reason': 'No longer profitable'}
            
            return {'valid': True, 'yes_price': current_yes, 'no_price': current_no}
            
        except Exception as e:
            return {'valid': False, 'reason': str(e)}
    
    async def _place_order(self, side: str, opportunity: Dict, size: Decimal) -> OrderResult:
        """Place a single order"""
        token_id = opportunity['yes_token_id'] if side == 'YES' else opportunity['no_token_id']
        price = Decimal(str(opportunity['yes_price'] if side == 'YES' else opportunity['no_price']))
        
        if self.client.simulation_mode:
            return self._simulate_order(side, size, price)
        
        try:
            result = await asyncio.wait_for(
                self._execute_order(token_id, size, price),
                timeout=self.order_timeout
            )
            
            return OrderResult(
                success=result.get('success', False),
                order_id=result.get('order_id'),
                side=side,
                requested_size=size,
                filled_size=Decimal(str(result.get('filled_size', size))),
                fill_price=Decimal(str(result.get('fill_price', price))),
                status=ExecutionStatus.SUCCESS if result.get('success') else ExecutionStatus.FAILED,
                error=result.get('error')
            )
        except asyncio.TimeoutError:
            return self._failed_order(side, size, 'Timeout')
        except Exception as e:
            return self._failed_order(side, size, str(e))
    
    async def _execute_order(self, token_id: str, size: Decimal, price: Decimal) -> Dict:
        """Execute order via client"""
        order_args = {
            'token_id': token_id,
            'side': 'buy',
            'size': float(size / price),
            'price': float(price)
        }
        return await self.client.create_order(order_args)
    
    def _simulate_order(self, side: str, size: Decimal, price: Decimal) -> OrderResult:
        """Simulate order for dry run"""
        import random
        success = random.random() > 0.05
        slippage = Decimal(str(random.uniform(0, 0.002)))
        
        return OrderResult(
            success=success,
            order_id=f"sim_{side}_{int(time.time())}",
            side=side,
            requested_size=size,
            filled_size=size if success else Decimal('0'),
            fill_price=price * (1 + slippage),
            status=ExecutionStatus.SUCCESS if success else ExecutionStatus.FAILED,
            error=None if success else 'Simulated failure'
        )
    
    def _failed_order(self, side: str, size: Decimal, error: str) -> OrderResult:
        """Create failed order result"""
        return OrderResult(
            success=False, order_id=None, side=side,
            requested_size=size, filled_size=Decimal('0'),
            fill_price=Decimal('0'), status=ExecutionStatus.FAILED, error=error
        )
    
    async def _evaluate_execution(self, yes_result: OrderResult, no_result: OrderResult,
                                  opportunity: Dict, start_time: float) -> ExecutionResult:
        """Evaluate execution results"""
        both_success = yes_result.success and no_result.success
        both_acceptable = yes_result.fill_ratio >= float(self.min_fill_ratio) and \
                         no_result.fill_ratio >= float(self.min_fill_ratio)
        
        if both_success and both_acceptable:
            # Calculate locked profit
            yes_cost = yes_result.filled_size
            no_cost = no_result.filled_size * no_result.fill_price / yes_result.fill_price
            total_cost = yes_cost + no_cost
            
            payout = min(yes_result.filled_size, no_result.filled_size)
            gross_profit = payout - total_cost
            fees = self.platform_fee * payout + self.gas_estimate * 2
            net_profit = gross_profit - fees
            
            self.successful_executions += 1
            self.logger.info(f"✅ Arbitrage executed! Profit: ${net_profit:.4f}")
            
            return ExecutionResult(
                success=True, yes_order=yes_result, no_order=no_result,
                locked_profit=net_profit, actual_cost=total_cost,
                status=ExecutionStatus.SUCCESS, reason="Both orders filled",
                timestamp=time.time(), execution_time_ms=(time.time() - start_time) * 1000
            )
        
        # Handle failure - cancel any successful orders
        if yes_result.success and yes_result.order_id:
            await self._cancel_order(yes_result.order_id)
        if no_result.success and no_result.order_id:
            await self._cancel_order(no_result.order_id)
        
        reason = f"YES: {yes_result.error or 'OK'}, NO: {no_result.error or 'OK'}"
        self.logger.warning(f"❌ Execution failed: {reason}")
        
        return ExecutionResult(
            success=False, yes_order=yes_result, no_order=no_result,
            locked_profit=Decimal('0'), actual_cost=Decimal('0'),
            status=ExecutionStatus.FAILED, reason=reason,
            timestamp=time.time(), execution_time_ms=(time.time() - start_time) * 1000
        )
    
    async def _cancel_order(self, order_id: str):
        """Cancel an order"""
        try:
            if not self.client.simulation_mode:
                await self.client.cancel_order(order_id)
            self.logger.info(f"Cancelled order: {order_id}")
        except Exception as e:
            self.logger.error(f"Failed to cancel order {order_id}: {e}")
