#!/usr/bin/env python3
"""
Polymarket Arbitrage Bot
Automated trading bot for Polymarket prediction markets
"""

import os
import sys
import time
import logging
import signal
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from pathlib import Path

import yaml
from dotenv import load_dotenv

# Local imports
from polymarket_client import PolymarketClient
from opportunity_scanner import OpportunityScanner
from risk_manager import RiskManager
from notification_service import NotificationService
from database import Database

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
        self.scanner = OpportunityScanner(self.client, self.config)
        self.risk_manager = RiskManager(self.config)
        self.notifier = NotificationService(self.config)
        self.database = Database(self.config['database']['path'])
        
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
        
        # Send startup notification
        await self.notifier.send_message(
            "🤖 Arbitrage Bot Started",
            f"Mode: {self.config['execution']['mode']}\n"
            f"Min Profit: {self.config['polymarket']['min_profit_threshold']*100:.2f}%\n"
            f"Max Position: ${self.config['polymarket']['max_position_size']}"
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
        """Scan for opportunities and execute trades"""
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
        
        # Scan for opportunities
        opportunities = await self.scanner.scan_markets()
        
        if not opportunities:
            self.logger.debug("No arbitrage opportunities found")
            return
        
        self.logger.info(f"Found {len(opportunities)} potential opportunities")
        
        # Evaluate and execute opportunities
        for opp in opportunities:
            if not self.running or self.paused:
                break
            
            # Check if opportunity is still valid
            if not await self._validate_opportunity(opp):
                continue
            
            # Check risk limits
            if not self.risk_manager.approve_trade(opp):
                self.logger.info(f"Trade rejected by risk manager: {opp['market_name']}")
                continue
            
            # Execute the trade
            success = await self._execute_arbitrage(opp)
            
            if success:
                self.trade_count += 1
                await self.notifier.send_message(
                    "💰 Trade Executed",
                    f"Market: {opp['market_name']}\n"
                    f"Expected Profit: ${opp['expected_profit']:.2f}\n"
                    f"Total Trades: {self.trade_count}"
                )
    
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
            min_threshold = self.config['polymarket']['min_profit_threshold']
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
