#!/usr/bin/env python3
"""
Polymarket Arbitrage Bot
Automated trading bot for Polymarket prediction markets
"""

import logging
import os
import signal
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

import yaml
from dotenv import load_dotenv

from atomic_executor import AtomicExecutor, ExecutionStatus
from database import Database
from notification_service import NotificationService
from opportunity_scanner import OpportunityScanner
# Local imports
from polymarket_client import PolymarketClient
from risk_manager import RiskManager
from yes_no_arbitrage_scanner import YesNoArbitrageScanner

# Load environment variables
load_dotenv()


class ArbitrageBot:
    """Main arbitrage bot class"""
    
    def __init__(self, config_path: str = "config/config.yaml"):
        """Initialize the arbitrage bot"""
        self.config = self._load_config(config_path)
        self._setup_logging()
        
        self.logger = logging.getLogger(__name__)
        self.logger.info("Initializing Polymarket Arbitrage Bot...")
        
        # Initialize components
        self.client = self._init_polymarket_client()
        
        # Use specialized YES/NO arbitrage scanner
        self.scanner = YesNoArbitrageScanner(self.client, self.config)
        self.executor = AtomicExecutor(self.client, self.config)
        
        self.risk_manager = RiskManager(self.config)
        self.notifier = NotificationService(self.config)
        self.database = Database(self.config['database']['path'])
        
        # Capital tracking
        capital_config = self.config.get('capital', {})
        self.total_capital = capital_config.get('total_capital', 100)
        self.deployed_capital = 0.0
        
        # Bot state
        self.running = False
        self.paused = False
        self.last_scan_time = None
        self.total_profit = 0.0
        self.trade_count = 0
        
        # Register signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        self.logger.info("Bot initialized successfully")
    
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from YAML file"""
        try:
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
                
            # Expand environment variables
            return self._expand_env_vars(config)
        except FileNotFoundError:
            print(f"❌ Config file not found: {config_path}")
            print("💡 Copy config/config.example.yaml to config/config.yaml and update it")
            sys.exit(1)
        except Exception as e:
            print(f"❌ Error loading config: {e}")
            sys.exit(1)
    
    def _expand_env_vars(self, config: Dict) -> Dict:
        """Recursively expand environment variables in config"""
        import re
        
        def expand(value):
            if isinstance(value, str):
                # Match ${VAR_NAME} or $VAR_NAME
                pattern = r'\$\{([^}]+)\}|\$([A-Z_]+)'
                
                def replace(match):
                    var_name = match.group(1) or match.group(2)
                    return os.getenv(var_name, match.group(0))
                
                return re.sub(pattern, replace, value)
            elif isinstance(value, dict):
                return {k: expand(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [expand(item) for item in value]
            else:
                return value
        
        return expand(config)
    
    def _setup_logging(self):
        """Setup logging configuration"""
        log_config = self.config.get('logging', {})
        log_level = log_config.get('level', 'INFO')
        
        # Create logs directory
        Path("logs").mkdir(exist_ok=True)
        
        # Configure root logger
        logging.basicConfig(
            level=getattr(logging, log_level),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[]
        )
        
        # Console handler
        if log_config.get('console', True):
            console = logging.StreamHandler()
            console.setFormatter(logging.Formatter(
                '%(asctime)s - %(levelname)s - %(message)s',
                datefmt='%H:%M:%S'
            ))
            logging.getLogger().addHandler(console)
        
        # File handler
        if log_config.get('file', True):
            from logging.handlers import RotatingFileHandler
            
            file_handler = RotatingFileHandler(
                log_config.get('file_path', 'logs/bot.log'),
                maxBytes=log_config.get('max_bytes', 10485760),
                backupCount=log_config.get('backup_count', 5)
            )
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            ))
            logging.getLogger().addHandler(file_handler)
    
    def _init_polymarket_client(self) -> PolymarketClient:
        """Initialize Polymarket client"""
        api_key = os.getenv('POLYMARKET_API_KEY')
        api_secret = os.getenv('POLYMARKET_SECRET')
        private_key = os.getenv('POLYMARKET_PRIVATE_KEY')
        
        if not api_key or not api_secret:
            self.logger.warning("⚠️  Polymarket credentials not found. Running in simulation mode.")
            return PolymarketClient(
                api_key=None,
                api_secret=None,
                private_key=None,
                config=self.config['polymarket']
            )
        
        return PolymarketClient(
            api_key=api_key,
            api_secret=api_secret,
            private_key=private_key,
            config=self.config['polymarket']
        )
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self.logger.info(f"Received signal {signum}. Shutting down gracefully...")
        self.stop()
    
    async def start(self):
        """Start the arbitrage bot"""
        self.running = True
        self.logger.info("🚀 Starting Polymarket Arbitrage Bot")
        
        # Check balance before starting
        balance_info = self.polymarket.get_balance()
        self.logger.info(f"💰 Current Balance: ${balance_info.get('balance', 0):.2f} USDC")
        self.logger.info(f"   Available: ${balance_info.get('available', 0):.2f} USDC")

        if balance_info.get('available', 0) < self.config['polymarket']['max_position_size']:
            self.logger.warning(f"⚠️  Low balance: ${balance_info.get('available', 0):.2f} USDC")
            self.logger.warning(f"   Recommended minimum: ${self.config['polymarket']['max_position_size']:.2f} USDC")

        # Send startup notification
        await self.notifier.send_message(
            "🤖 YES/NO Arbitrage Bot Started",
            f"Mode: {self.config['execution']['mode']}\n"
            f"Balance: ${balance_info.get('balance', 0):.2f} USDC\n"
            f"Available: ${balance_info.get('available', 0):.2f} USDC\n"
            f"Capital: ${self.total_capital}\n"
            f"Min Net Margin: {self.config['polymarket']['min_net_margin']*100:.1f}%\n"
            f"Max Position: ${self.config['polymarket']['max_position_size']}\n"
            f"Target Markets: BTC, ETH, SOL 15-min"
        )

        # Main event loop
        scan_interval = self.config['scanner']['scan_interval']
        
        while self.running:
            try:
                if not self.paused:
                    await self._scan_and_execute()
                
                # Wait for next scan
                time.sleep(scan_interval)
                
            except KeyboardInterrupt:
                self.logger.info("Interrupted by user")
                break
            except Exception as e:
                self.logger.error(f"Error in main loop: {e}", exc_info=True)
                await self.notifier.send_alert(
                    "⚠️ Bot Error",
                    f"Error in main loop: {str(e)}"
                )
                time.sleep(scan_interval * 2)  # Wait longer after error
        
        self.logger.info("Bot stopped")
    
    async def _scan_and_execute(self):
        """Scan for YES/NO arbitrage opportunities and execute"""
        self.last_scan_time = datetime.now()
        
        # Check risk limits
        if not self.risk_manager.can_trade():
            if not self.paused:
                self.paused = True
                self.logger.warning("⚠️  Trading paused due to risk limits")
                await self.notifier.send_alert(
                    "🛑 Trading Paused",
                    "Risk limits reached. Trading paused."
                )
            return
        
        # If was paused and now can trade, resume
        if self.paused and self.risk_manager.can_trade():
            self.paused = False
            self.logger.info("✅ Trading resumed")
            await self.notifier.send_message(
                "✅ Trading Resumed",
                "Risk limits reset. Trading resumed."
            )
        
        # Scan for YES/NO arbitrage opportunities only
        opportunities = await self.scanner.scan_markets()
        
        if not opportunities:
            self.logger.debug("No YES/NO arbitrage opportunities found")
            return
        
        self.logger.info(f"🎯 Found {len(opportunities)} arbitrage opportunities")
        
        # Execute best opportunity
        for opp in opportunities:
            if not self.running or self.paused:
                break
            
            # Check if opportunity is still valid
            if not await self._validate_opportunity(opp):
                continue
            
            # Check risk limits
            if not self.risk_manager.approve_trade(opp):
                self.logger.info(f"Trade rejected by risk manager: {opp['market_name'][:40]}...")
                continue
            
            # Calculate position size
            from decimal import Decimal
            position_size = self.scanner.calculate_position_size(opp)
            
            if position_size < Decimal('1'):  # Minimum $1 position
                self.logger.debug("Position size too small, skipping")
                continue
            
            # Execute YES/NO arbitrage
            success = await self._execute_yes_no_arbitrage(opp, position_size)
            
            if success:
                self.trade_count += 1
                await self.notifier.send_message(
                    "💰 YES/NO Arbitrage Executed",
                    f"Market: {opp['market_name'][:50]}...\n"
                    f"Combined Price: ${opp['combined_price']:.4f}\n"
                    f"Net Margin: {opp['net_margin']*100:.2f}%\n"
                    f"Position: ${float(position_size):.2f}\n"
                    f"Total Trades: {self.trade_count}"
                )
                # Only execute one opportunity per scan cycle
                break
    
    async def _validate_opportunity(self, opportunity: Dict) -> bool:
        """Validate an arbitrage opportunity"""
        try:
            # Refresh market data
            market_id = opportunity['market_id']
            fresh_data = await self.client.get_market(market_id)
            
            if not fresh_data:
                return False
            
            # Recalculate profit with fresh data
            fresh_profit = self.scanner.calculate_profit(fresh_data, opportunity)
            
            # Check if still profitable
            min_threshold = self.config['polymarket'].get('min_net_margin', 0.015)
            if fresh_profit < min_threshold:
                self.logger.debug(f"Opportunity no longer profitable: {opportunity['market_name']}")
                return False
            
            # Update opportunity with fresh data
            opportunity['expected_profit'] = fresh_profit
            opportunity['validated_at'] = datetime.now()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error validating opportunity: {e}")
            return False
    
    async def _execute_yes_no_arbitrage(self, opportunity: Dict, position_size) -> bool:
        """Execute YES/NO arbitrage using atomic executor"""
        try:
            market_name = opportunity.get('market_name', 'Unknown')[:50]
            self.logger.info(f"⚡ Executing YES/NO arbitrage: {market_name}...")
            self.logger.info(f"   YES: ${opportunity['yes_price']:.4f} + NO: ${opportunity['no_price']:.4f} = ${opportunity['combined_price']:.4f}")
            self.logger.info(f"   Net margin: {opportunity['net_margin']*100:.2f}%")
            self.logger.info(f"   Position size: ${float(position_size):.2f}")
            
            # Check execution mode
            mode = self.config['execution']['mode']
            
            if mode == 'dry_run':
                self.logger.info(f"[DRY RUN] Would execute YES/NO arbitrage")
                self.logger.info(f"[DRY RUN] Expected profit: ${opportunity['net_margin'] * float(position_size):.4f}")
                self._record_trade(opportunity, simulated=True)
                return True
            
            # Execute using atomic executor
            result = await self.executor.execute_arbitrage(opportunity, position_size)
            
            if result.success:
                self.logger.info(f"✅ YES/NO arbitrage executed successfully!")
                self.logger.info(f"   Locked profit: ${float(result.locked_profit):.4f}")
                
                # Record trade
                self._record_trade(opportunity, result=result.to_dict())
                
                # Update risk manager
                self.risk_manager.record_trade(result.to_dict())
                
                # Update total profit
                self.total_profit += float(result.locked_profit)
                
                return True
            else:
                self.logger.error(f"❌ YES/NO arbitrage failed: {result.reason}")
                await self.notifier.send_alert(
                    "❌ Arbitrage Failed",
                    f"Market: {market_name}\n"
                    f"Reason: {result.reason}"
                )
                return False
                
        except Exception as e:
            self.logger.error(f"Error executing YES/NO arbitrage: {e}", exc_info=True)
            await self.notifier.send_alert(
                "❌ Execution Error",
                f"Error: {str(e)}"
            )
            return False
    
    async def _execute_arbitrage(self, opportunity: Dict) -> bool:
        """Execute an arbitrage trade"""
        try:
            self.logger.info(f"Executing arbitrage on {opportunity['market_name']}")
            
            # Check execution mode
            mode = self.config['execution']['mode']
            
            if mode == 'dry_run':
                self.logger.info(f"[DRY RUN] Would execute trade: {opportunity}")
                # Simulate success
                self._record_trade(opportunity, simulated=True)
                return True
            
            # Execute actual trade
            result = await self.client.execute_arbitrage(opportunity)
            
            if result['success']:
                self.logger.info(f"✅ Trade executed successfully")
                
                # Record trade
                self._record_trade(opportunity, result=result)
                
                # Update risk manager
                self.risk_manager.record_trade(result)
                
                # Update total profit
                actual_profit = result.get('profit', opportunity['expected_profit'])
                self.total_profit += actual_profit
                
                return True
            else:
                self.logger.error(f"❌ Trade failed: {result.get('error')}")
                await self.notifier.send_alert(
                    "❌ Trade Failed",
                    f"Market: {opportunity['market_name']}\n"
                    f"Error: {result.get('error')}"
                )
                return False
                
        except Exception as e:
            self.logger.error(f"Error executing arbitrage: {e}", exc_info=True)
            await self.notifier.send_alert(
                "❌ Execution Error",
                f"Error: {str(e)}"
            )
            return False
    
    async def _execute_market_making(self, opportunity: Dict) -> bool:
        """Execute a market making strategy"""
        try:
            self.logger.info(f"Executing market making on {opportunity['market_name'][:50]}...")
            
            # Check execution mode
            mode = self.config['execution']['mode']
            
            if mode == 'dry_run':
                self.logger.info(f"[DRY RUN] Would place market making orders: {opportunity}")
                # Simulate success
                self._record_trade(opportunity, simulated=True)
                return True
            
            # Execute market making orders
            result = await self.market_maker.execute_market_making(opportunity)
            
            if result['success']:
                self.logger.info(f"✅ Market making orders placed")
                
                # Record trade
                self._record_trade(opportunity, result=result)
                
                # Update risk manager
                self.risk_manager.record_trade(result)
                
                return True
            else:
                self.logger.error(f"❌ Market making failed: {result.get('error')}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error executing market making: {e}", exc_info=True)
            return False
    
    def _record_trade(self, opportunity: Dict, simulated: bool = False, result: Optional[Dict] = None):
        """Record trade in database"""
        trade_data = {
            'timestamp': datetime.now(),
            'market_id': opportunity['market_id'],
            'market_name': opportunity['market_name'],
            'expected_profit': opportunity['expected_profit'],
            'actual_profit': result.get('profit') if result else None,
            'simulated': simulated,
            'status': 'success' if (simulated or (result and result['success'])) else 'failed',
            'details': str(opportunity)
        }
        
        self.database.insert_trade(trade_data)
    
    def stop(self):
        """Stop the bot"""
        self.running = False
        self.logger.info("Stopping bot...")
        
        # Send shutdown notification
        try:
            import asyncio
            asyncio.run(self.notifier.send_message(
                "🛑 Bot Stopped",
                f"Total Profit: ${self.total_profit:.2f}\n"
                f"Total Trades: {self.trade_count}"
            ))
        except:
            pass
    
    def get_status(self) -> Dict:
        """Get bot status"""
        return {
            'running': self.running,
            'paused': self.paused,
            'total_profit': self.total_profit,
            'trade_count': self.trade_count,
            'last_scan': self.last_scan_time.isoformat() if self.last_scan_time else None,
            'mode': self.config['execution']['mode']
        }


def main():
    """Main entry point"""
    import asyncio

    # ASCII art banner
    print("""
    ╔═══════════════════════════════════════╗
    ║   Polymarket Arbitrage Bot v1.0       ║
    ║   Automated Trading for Prediction    ║
    ║   Markets                             ║
    ╚═══════════════════════════════════════╝
    """)
    
    # Initialize bot
    bot = ArbitrageBot()
    
    # Run bot
    try:
        asyncio.run(bot.start())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
