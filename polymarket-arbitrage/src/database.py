"""
Database Module
SQLite database for storing trade history and analytics
"""

import logging
import sqlite3
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path


class Database:
    """SQLite database for trade history"""
    
    def __init__(self, db_path: str = "data/trades.db"):
        """
        Initialize database
        
        Args:
            db_path: Path to SQLite database file
        """
        self.logger = logging.getLogger(__name__)
        self.db_path = db_path
        
        # Create data directory if it doesn't exist
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize database
        self._init_database()
        
        self.logger.info(f"Database initialized: {db_path}")
    
    def _init_database(self):
        """Create database tables if they don't exist"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Trades table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL,
                    market_id TEXT NOT NULL,
                    market_name TEXT,
                    trade_type TEXT,
                    expected_profit REAL,
                    actual_profit REAL,
                    status TEXT,
                    simulated BOOLEAN DEFAULT 0,
                    details TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Performance metrics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL UNIQUE,
                    total_trades INTEGER DEFAULT 0,
                    profitable_trades INTEGER DEFAULT 0,
                    total_profit REAL DEFAULT 0,
                    total_loss REAL DEFAULT 0,
                    largest_win REAL DEFAULT 0,
                    largest_loss REAL DEFAULT 0,
                    avg_profit REAL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Opportunities table (for tracking discovered opportunities)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS opportunities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL,
                    market_id TEXT NOT NULL,
                    market_name TEXT,
                    opportunity_type TEXT,
                    expected_profit REAL,
                    executed BOOLEAN DEFAULT 0,
                    details TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_trades_market_id ON trades(market_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics(date)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_opportunities_timestamp ON opportunities(timestamp)")
            
            conn.commit()
    
    def insert_trade(self, trade: Dict) -> int:
        """
        Insert a trade record
        
        Args:
            trade: Trade data dict
            
        Returns:
            Inserted trade ID
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO trades (
                    timestamp, market_id, market_name, trade_type,
                    expected_profit, actual_profit, status, simulated, details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                trade.get('timestamp', datetime.now()),
                trade.get('market_id'),
                trade.get('market_name'),
                trade.get('type'),
                trade.get('expected_profit'),
                trade.get('actual_profit'),
                trade.get('status'),
                trade.get('simulated', False),
                trade.get('details', '')
            ))
            
            conn.commit()
            trade_id = cursor.lastrowid
            
            # Update daily metrics
            self._update_daily_metrics(trade)
            
            return trade_id
    
    def insert_opportunity(self, opportunity: Dict) -> int:
        """
        Insert an opportunity record
        
        Args:
            opportunity: Opportunity data dict
            
        Returns:
            Inserted opportunity ID
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO opportunities (
                    timestamp, market_id, market_name, opportunity_type,
                    expected_profit, details
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                opportunity.get('discovered_at', datetime.now()),
                opportunity.get('market_id'),
                opportunity.get('market_name'),
                opportunity.get('type'),
                opportunity.get('expected_profit'),
                str(opportunity)
            ))
            
            conn.commit()
            return cursor.lastrowid
    
    def _update_daily_metrics(self, trade: Dict):
        """Update daily performance metrics"""
        today = datetime.now().date()
        profit = trade.get('actual_profit', 0) or trade.get('expected_profit', 0)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get existing metrics for today
            cursor.execute("SELECT * FROM metrics WHERE date = ?", (today,))
            existing = cursor.fetchone()
            
            if existing:
                # Update existing
                cursor.execute("""
                    UPDATE metrics SET
                        total_trades = total_trades + 1,
                        profitable_trades = profitable_trades + ?,
                        total_profit = total_profit + ?,
                        total_loss = total_loss + ?,
                        largest_win = MAX(largest_win, ?),
                        largest_loss = MIN(largest_loss, ?)
                    WHERE date = ?
                """, (
                    1 if profit > 0 else 0,
                    max(profit, 0),
                    abs(min(profit, 0)),
                    profit if profit > 0 else 0,
                    profit if profit < 0 else 0,
                    today
                ))
            else:
                # Insert new
                cursor.execute("""
                    INSERT INTO metrics (
                        date, total_trades, profitable_trades,
                        total_profit, total_loss, largest_win, largest_loss
                    ) VALUES (?, 1, ?, ?, ?, ?, ?)
                """, (
                    today,
                    1 if profit > 0 else 0,
                    max(profit, 0),
                    abs(min(profit, 0)),
                    profit if profit > 0 else 0,
                    profit if profit < 0 else 0
                ))
            
            conn.commit()
    
    def get_trades(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """
        Get recent trades
        
        Args:
            limit: Maximum number of trades to return
            offset: Number of trades to skip
            
        Returns:
            List of trade dicts
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM trades
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
            """, (limit, offset))
            
            return [dict(row) for row in cursor.fetchall()]
    
    def get_daily_stats(self, date: Optional[datetime.date] = None) -> Optional[Dict]:
        """
        Get statistics for a specific day
        
        Args:
            date: Date to get stats for (defaults to today)
            
        Returns:
            Stats dict or None
        """
        if date is None:
            date = datetime.now().date()
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM metrics WHERE date = ?", (date,))
            row = cursor.fetchone()
            
            if row:
                stats = dict(row)
                # Calculate win rate
                if stats['total_trades'] > 0:
                    stats['win_rate'] = stats['profitable_trades'] / stats['total_trades']
                else:
                    stats['win_rate'] = 0
                
                # Calculate average profit
                if stats['total_trades'] > 0:
                    stats['avg_profit'] = (stats['total_profit'] - stats['total_loss']) / stats['total_trades']
                else:
                    stats['avg_profit'] = 0
                
                return stats
            
            return None
    
    def get_performance_summary(self, days: int = 7) -> Dict:
        """
        Get performance summary for the last N days
        
        Args:
            days: Number of days to include
            
        Returns:
            Summary statistics dict
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT
                    SUM(total_trades) as total_trades,
                    SUM(profitable_trades) as profitable_trades,
                    SUM(total_profit) as total_profit,
                    SUM(total_loss) as total_loss,
                    MAX(largest_win) as best_trade,
                    MIN(largest_loss) as worst_trade
                FROM metrics
                WHERE date >= date('now', '-' || ? || ' days')
            """, (days,))
            
            row = cursor.fetchone()
            
            if row:
                total_trades, profitable_trades, total_profit, total_loss, best_trade, worst_trade = row
                
                return {
                    'total_trades': total_trades or 0,
                    'profitable_trades': profitable_trades or 0,
                    'total_profit': (total_profit or 0) - (total_loss or 0),
                    'win_rate': (profitable_trades / total_trades) if total_trades else 0,
                    'best_trade': best_trade or 0,
                    'worst_trade': worst_trade or 0,
                    'avg_profit': ((total_profit or 0) - (total_loss or 0)) / total_trades if total_trades else 0
                }
            
            return {
                'total_trades': 0,
                'profitable_trades': 0,
                'total_profit': 0,
                'win_rate': 0,
                'best_trade': 0,
                'worst_trade': 0,
                'avg_profit': 0
            }
    
    def cleanup_old_data(self, days: int = 90):
        """
        Delete data older than specified days
        
        Args:
            days: Keep data newer than this many days
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Delete old trades
            cursor.execute("""
                DELETE FROM trades
                WHERE timestamp < date('now', '-' || ? || ' days')
            """, (days,))
            
            # Delete old opportunities
            cursor.execute("""
                DELETE FROM opportunities
                WHERE timestamp < date('now', '-' || ? || ' days')
            """, (days,))
            
            deleted = cursor.rowcount
            conn.commit()
            
            self.logger.info(f"Cleaned up {deleted} old records")
