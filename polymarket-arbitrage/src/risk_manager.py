"""
Risk Manager
Manages trading risks and position limits
"""

import logging
from typing import Dict, List
from datetime import datetime, timedelta
from collections import deque


class RiskManager:
    """Manages risk for arbitrage trading"""
    
    def __init__(self, config: Dict):
        """
        Initialize risk manager
        
        Args:
            config: Configuration dict
        """
        self.config = config['risk_management']
        self.logger = logging.getLogger(__name__)
        
        # Risk limits
        self.max_daily_loss = self.config['max_daily_loss']
        self.max_weekly_loss = self.config['max_weekly_loss']
        self.max_open_positions = self.config['max_open_positions']
        self.consecutive_loss_limit = self.config['consecutive_loss_limit']
        
        # Tracking
        self.daily_pnl = 0.0
        self.weekly_pnl = 0.0
        self.open_positions = 0
        self.consecutive_losses = 0
        self.circuit_breaker_active = False
        self.circuit_breaker_until = None
        
        # Trade history for rolling calculations
        self.trade_history = deque(maxlen=1000)
        
        self.logger.info("Risk manager initialized")
    
    def can_trade(self) -> bool:
        """
        Check if trading is allowed based on risk limits
        
        Returns:
            True if can trade, False otherwise
        """
        # Check circuit breaker
        if self.circuit_breaker_active:
            if datetime.now() < self.circuit_breaker_until:
                return False
            else:
                self._reset_circuit_breaker()
        
        # Check loss limits
        if abs(self.daily_pnl) >= self.max_daily_loss:
            self.logger.warning(f"Daily loss limit reached: ${abs(self.daily_pnl):.2f}")
            return False
        
        if abs(self.weekly_pnl) >= self.max_weekly_loss:
            self.logger.warning(f"Weekly loss limit reached: ${abs(self.weekly_pnl):.2f}")
            return False
        
        # Check position limits
        if self.open_positions >= self.max_open_positions:
            self.logger.debug(f"Max open positions reached: {self.open_positions}")
            return False
        
        # Check consecutive losses
        if self.consecutive_losses >= self.consecutive_loss_limit:
            self._activate_circuit_breaker()
            return False
        
        return True
    
    def approve_trade(self, opportunity: Dict) -> bool:
        """
        Approve or reject a trade based on risk parameters
        
        Args:
            opportunity: Trade opportunity dict
            
        Returns:
            True if approved, False if rejected
        """
        if not self.can_trade():
            return False
        
        # Check position size
        position_size = opportunity.get('amount', 0) * opportunity.get('price_a', 0)
        max_position_size = self.config.get('max_position_percentage', 0.2) * 1000  # Assuming $1000 capital
        
        if position_size > max_position_size:
            self.logger.info(f"Trade rejected: Position too large (${position_size:.2f})")
            return False
        
        # Check expected profit
        expected_profit = opportunity.get('expected_profit', 0)
        if expected_profit <= 0:
            self.logger.info("Trade rejected: Non-positive expected profit")
            return False
        
        # Additional checks could include:
        # - Maximum drawdown
        # - Sharpe ratio
        # - Market conditions
        # - Correlation limits
        
        return True
    
    def record_trade(self, trade_result: Dict):
        """
        Record a trade and update risk metrics
        
        Args:
            trade_result: Trade execution result
        """
        profit = trade_result.get('profit', 0)
        timestamp = datetime.fromtimestamp(trade_result.get('timestamp', datetime.now().timestamp()))
        
        # Add to history
        self.trade_history.append({
            'timestamp': timestamp,
            'profit': profit,
            'success': trade_result.get('success', False)
        })
        
        # Update P&L
        self.daily_pnl += profit
        self.weekly_pnl += profit
        
        # Update consecutive losses
        if profit < 0:
            self.consecutive_losses += 1
        else:
            self.consecutive_losses = 0
        
        # Update open positions (simplified - assumes immediate close)
        # In reality, would track until position is closed
        
        self.logger.info(f"Trade recorded: Profit=${profit:.2f}, Daily P&L=${self.daily_pnl:.2f}")
        
        # Check if need to activate circuit breaker
        if self.consecutive_losses >= self.consecutive_loss_limit:
            self._activate_circuit_breaker()
    
    def _activate_circuit_breaker(self):
        """Activate circuit breaker to pause trading"""
        pause_duration = self.config.get('pause_duration_minutes', 30)
        self.circuit_breaker_active = True
        self.circuit_breaker_until = datetime.now() + timedelta(minutes=pause_duration)
        
        self.logger.warning(
            f"🚨 Circuit breaker activated! "
            f"Trading paused until {self.circuit_breaker_until.strftime('%H:%M:%S')}"
        )
    
    def _reset_circuit_breaker(self):
        """Reset circuit breaker"""
        self.circuit_breaker_active = False
        self.circuit_breaker_until = None
        self.consecutive_losses = 0
        
        self.logger.info("✅ Circuit breaker reset. Trading resumed.")
    
    def reset_daily_limits(self):
        """Reset daily limits (call at start of each day)"""
        self.daily_pnl = 0.0
        self.consecutive_losses = 0
        self.logger.info("Daily limits reset")
    
    def reset_weekly_limits(self):
        """Reset weekly limits (call at start of each week)"""
        self.weekly_pnl = 0.0
        self.logger.info("Weekly limits reset")
    
    def get_status(self) -> Dict:
        """Get current risk status"""
        return {
            'can_trade': self.can_trade(),
            'daily_pnl': self.daily_pnl,
            'weekly_pnl': self.weekly_pnl,
            'open_positions': self.open_positions,
            'consecutive_losses': self.consecutive_losses,
            'circuit_breaker_active': self.circuit_breaker_active,
            'daily_loss_limit': self.max_daily_loss,
            'weekly_loss_limit': self.max_weekly_loss,
            'max_open_positions': self.max_open_positions
        }
