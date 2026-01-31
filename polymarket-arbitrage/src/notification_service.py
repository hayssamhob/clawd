"""
Notification Service
Sends alerts via Telegram and other channels
"""

import logging
from typing import Dict, Optional
from datetime import datetime, time as dt_time

try:
    import telegram
    from telegram import Bot
    TELEGRAM_AVAILABLE = True
except ImportError:
    TELEGRAM_AVAILABLE = False
    logging.warning("python-telegram-bot not installed. Notifications disabled.")


class NotificationService:
    """Handles notifications for arbitrage bot"""
    
    def __init__(self, config: Dict):
        """
        Initialize notification service
        
        Args:
            config: Configuration dict
        """
        self.config = config.get('notifications', {})
        self.logger = logging.getLogger(__name__)
        
        # Telegram setup
        self.telegram_enabled = self._setup_telegram()
        
        # Email setup (if configured)
        self.email_enabled = self._setup_email()
        
        # Notification settings
        self.quiet_hours_enabled = self.config.get('telegram', {}).get('quiet_hours', {}).get('enabled', False)
        if self.quiet_hours_enabled:
            quiet_config = self.config['telegram']['quiet_hours']
            self.quiet_start = self._parse_time(quiet_config.get('start', '22:00'))
            self.quiet_end = self._parse_time(quiet_config.get('end', '08:00'))
        
        self.logger.info(f"Notification service initialized (Telegram: {self.telegram_enabled})")
    
    def _setup_telegram(self) -> bool:
        """Setup Telegram bot"""
        if not TELEGRAM_AVAILABLE:
            return False
        
        telegram_config = self.config.get('telegram', {})
        
        if not telegram_config.get('enabled', False):
            return False
        
        bot_token = telegram_config.get('bot_token')
        chat_id = telegram_config.get('chat_id')
        
        if not bot_token or not chat_id:
            self.logger.warning("Telegram credentials not configured")
            return False
        
        try:
            self.telegram_bot = Bot(token=bot_token)
            self.telegram_chat_id = chat_id
            
            # Test connection
            self.telegram_bot.get_me()
            
            self.logger.info("✅ Telegram bot connected")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Telegram bot: {e}")
            return False
    
    def _setup_email(self) -> bool:
        """Setup email notifications"""
        email_config = self.config.get('email', {})
        
        if not email_config.get('enabled', False):
            return False
        
        # Email setup would go here
        # For now, just return False
        return False
    
    def _parse_time(self, time_str: str) -> dt_time:
        """Parse time string to time object"""
        hour, minute = map(int, time_str.split(':'))
        return dt_time(hour, minute)
    
    def _is_quiet_hours(self) -> bool:
        """Check if currently in quiet hours"""
        if not self.quiet_hours_enabled:
            return False
        
        now = datetime.now().time()
        
        # Handle quiet hours spanning midnight
        if self.quiet_start <= self.quiet_end:
            return self.quiet_start <= now <= self.quiet_end
        else:
            return now >= self.quiet_start or now <= self.quiet_end
    
    async def send_message(self, title: str, message: str, force: bool = False):
        """
        Send a notification message
        
        Args:
            title: Message title
            message: Message body
            force: Send even during quiet hours
        """
        # Check quiet hours
        if not force and self._is_quiet_hours():
            self.logger.debug(f"Skipping notification (quiet hours): {title}")
            return
        
        # Format message
        full_message = f"🦞 *{title}*\n\n{message}"
        
        # Send via Telegram
        if self.telegram_enabled:
            await self._send_telegram(full_message)
        
        # Send via email
        if self.email_enabled:
            await self._send_email(title, message)
        
        # Log the notification
        self.logger.info(f"Notification sent: {title}")
    
    async def send_alert(self, title: str, message: str):
        """
        Send a high-priority alert (ignores quiet hours)
        
        Args:
            title: Alert title
            message: Alert message
        """
        await self.send_message(title, message, force=True)
    
    async def _send_telegram(self, message: str):
        """Send message via Telegram"""
        try:
            # Remove markdown formatting to avoid parsing errors
            clean_message = message.replace('*', '')
            await self.telegram_bot.send_message(
                chat_id=self.telegram_chat_id,
                text=clean_message
            )
        except Exception as e:
            self.logger.error(f"Error sending Telegram message: {e}")
    
    async def _send_email(self, title: str, message: str):
        """Send message via email"""
        # Email implementation would go here
        pass
    
    async def send_trade_alert(self, trade: Dict):
        """Send notification for executed trade"""
        telegram_config = self.config.get('telegram', {})
        
        if not telegram_config.get('notify_on_trade', True):
            return
        
        profit = trade.get('profit', 0)
        
        if profit > 0 and not telegram_config.get('notify_on_profit', True):
            return
        if profit < 0 and not telegram_config.get('notify_on_loss', True):
            return
        
        emoji = "💰" if profit > 0 else "📉"
        title = f"{emoji} Trade Executed"
        
        message = (
            f"Market: {trade.get('market_name', 'Unknown')}\n"
            f"Type: {trade.get('type', 'Unknown')}\n"
            f"Profit: ${profit:.2f}\n"
            f"Time: {datetime.now().strftime('%H:%M:%S')}"
        )
        
        await self.send_message(title, message)
    
    async def send_opportunity_alert(self, opportunity: Dict):
        """Send notification for new opportunity"""
        telegram_config = self.config.get('telegram', {})
        
        if not telegram_config.get('notify_on_opportunity', True):
            return
        
        title = "🔍 Arbitrage Opportunity"
        
        message = (
            f"Market: {opportunity.get('market_name', 'Unknown')}\n"
            f"Type: {opportunity.get('type', 'Unknown')}\n"
            f"Expected Profit: ${opportunity.get('expected_profit', 0):.2f}\n"
            f"Confidence: {opportunity.get('confidence', 'Unknown')}"
        )
        
        await self.send_message(title, message)
    
    async def send_daily_summary(self, stats: Dict):
        """Send daily performance summary"""
        title = "📊 Daily Summary"
        
        message = (
            f"Total Trades: {stats.get('trade_count', 0)}\n"
            f"Profitable: {stats.get('profitable_trades', 0)}\n"
            f"Total Profit: ${stats.get('total_profit', 0):.2f}\n"
            f"Win Rate: {stats.get('win_rate', 0)*100:.1f}%\n"
            f"Best Trade: ${stats.get('best_trade', 0):.2f}\n"
            f"Worst Trade: ${stats.get('worst_trade', 0):.2f}"
        )
        
        await self.send_message(title, message, force=True)
