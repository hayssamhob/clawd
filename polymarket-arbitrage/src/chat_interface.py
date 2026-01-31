#!/usr/bin/env python3
"""
AI Chat Interface for Arbitrage Bot
Interactive chat to analyze and control the bot
"""

import os
import sys
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from flask import Flask, request, jsonify
from flask_cors import CORS
import yaml

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

app = Flask(__name__)
CORS(app)

DB_PATH = "data/trades.db"
CONFIG_PATH = "config/config.yaml"


class BotAnalyzer:
    """Analyzes bot behavior and provides insights"""
    
    def __init__(self):
        self.config = self._load_config()
    
    def _load_config(self) -> Dict:
        """Load bot configuration"""
        try:
            with open(CONFIG_PATH, 'r') as f:
                return yaml.safe_load(f)
        except:
            return {}
    
    def get_decision_logic(self) -> Dict:
        """Get current decision-making logic"""
        return {
            "profit_threshold": {
                "value": self.config.get('polymarket', {}).get('min_profit_threshold', 0.005),
                "description": "Minimum profit percentage required (0.5% = half a cent per dollar)",
                "unit": "percentage"
            },
            "liquidity_filter": {
                "value": self.config.get('scanner', {}).get('min_liquidity', 1000),
                "description": "Minimum market liquidity required",
                "unit": "USDC"
            },
            "volume_filter": {
                "value": self.config.get('scanner', {}).get('min_volume_24h', 5000),
                "description": "Minimum 24h trading volume",
                "unit": "USDC"
            },
            "max_spread": {
                "value": self.config.get('scanner', {}).get('max_spread', 0.05),
                "description": "Maximum bid-ask spread allowed",
                "unit": "percentage"
            },
            "position_size": {
                "value": self.config.get('polymarket', {}).get('max_position_size', 100),
                "description": "Maximum amount per trade",
                "unit": "USDC"
            },
            "risk_limits": {
                "daily_loss": self.config.get('risk_management', {}).get('max_daily_loss', 500),
                "weekly_loss": self.config.get('risk_management', {}).get('max_weekly_loss', 1500),
                "stop_loss": self.config.get('risk_management', {}).get('stop_loss_percentage', 0.10),
                "max_positions": self.config.get('risk_management', {}).get('max_open_positions', 5)
            },
            "scan_speed": {
                "value": self.config.get('scanner', {}).get('scan_interval', 2),
                "description": "Market scan frequency",
                "unit": "seconds"
            }
        }
    
    def get_performance_metrics(self) -> Dict:
        """Get detailed performance analysis"""
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Overall stats
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN actual_profit > 0 THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN actual_profit < 0 THEN 1 ELSE 0 END) as losses,
                    AVG(actual_profit) as avg_profit,
                    MAX(actual_profit) as best,
                    MIN(actual_profit) as worst,
                    SUM(actual_profit) as total_profit
                FROM trades
            """)
            
            stats = cursor.fetchone()
            
            # Win rate
            win_rate = (stats['wins'] / stats['total'] * 100) if stats['total'] > 0 else 0
            
            # Recent performance (last 24h)
            cursor.execute("""
                SELECT 
                    COUNT(*) as trades,
                    SUM(actual_profit) as profit
                FROM trades
                WHERE timestamp > strftime('%s', 'now', '-1 day')
            """)
            
            recent = cursor.fetchone()
            
            conn.close()
            
            return {
                "all_time": {
                    "total_trades": stats['total'] or 0,
                    "wins": stats['wins'] or 0,
                    "losses": stats['losses'] or 0,
                    "win_rate": round(win_rate, 2),
                    "avg_profit": round(stats['avg_profit'] or 0, 2),
                    "best_trade": round(stats['best'] or 0, 2),
                    "worst_trade": round(stats['worst'] or 0, 2),
                    "total_profit": round(stats['total_profit'] or 0, 2)
                },
                "last_24h": {
                    "trades": recent['trades'] or 0,
                    "profit": round(recent['profit'] or 0, 2)
                }
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def analyze_query(self, query: str) -> Dict:
        """Analyze user query and provide response"""
        query_lower = query.lower()
        
        # Performance questions
        if any(word in query_lower for word in ['perform', 'doing', 'profit', 'loss', 'stats']):
            return {
                "type": "performance",
                "data": self.get_performance_metrics()
            }
        
        # Logic questions
        if any(word in query_lower for word in ['how', 'logic', 'decide', 'criteria', 'assess']):
            return {
                "type": "logic",
                "data": self.get_decision_logic()
            }
        
        # Configuration questions
        if any(word in query_lower for word in ['config', 'setting', 'threshold', 'limit']):
            return {
                "type": "config",
                "data": self.get_decision_logic()
            }
        
        # Yes/No market questions
        if any(word in query_lower for word in ['yes/no', 'binary', 'yes no']):
            return {
                "type": "binary_markets",
                "data": {
                    "explanation": "Yes/No markets are binary outcome markets where YES + NO should equal 1.00",
                    "arbitrage_logic": "If YES + NO < 1.00, buy both sides and profit when market resolves",
                    "example": "YES at 0.48, NO at 0.48 = Cost 0.96, Resolves to 1.00, Profit 0.04 (4%)",
                    "current_focus": "Bot scans all binary markets for YES+NO sum < (1.00 - min_profit_threshold)"
                }
            }
        
        return {
            "type": "unknown",
            "message": "I can help you understand the bot's performance, decision logic, or configuration. Try asking about 'performance', 'logic', or 'yes/no markets'."
        }


analyzer = BotAnalyzer()


@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat messages"""
    try:
        data = request.get_json()
        query = data.get('message', '')
        
        if not query:
            return jsonify({'error': 'No message provided'}), 400
        
        # Analyze query
        response = analyzer.analyze_query(query)
        
        # Generate human-readable response
        if response['type'] == 'performance':
            metrics = response['data']['all_time']
            text = f"""📊 **Performance Summary**

**All-Time Stats:**
- Total Trades: {metrics['total_trades']}
- Win Rate: {metrics['win_rate']}%
- Average Profit: ${metrics['avg_profit']:.2f}
- Total Profit: ${metrics['total_profit']:.2f}
- Best Trade: ${metrics['best_trade']:.2f}
- Worst Trade: ${metrics['worst_trade']:.2f}

**Last 24 Hours:**
- Trades: {response['data']['last_24h']['trades']}
- Profit: ${response['data']['last_24h']['profit']:.2f}
"""
        
        elif response['type'] == 'logic':
            logic = response['data']
            text = f"""🧠 **Decision Logic**

**Profit Threshold:** {logic['profit_threshold']['value']*100}% ({logic['profit_threshold']['description']})

**Market Filters:**
- Minimum Liquidity: ${logic['liquidity_filter']['value']:,}
- Minimum 24h Volume: ${logic['volume_filter']['value']:,}
- Maximum Spread: {logic['max_spread']['value']*100}%

**Position Sizing:**
- Max per trade: ${logic['position_size']['value']}

**Risk Management:**
- Max Daily Loss: ${logic['risk_limits']['daily_loss']}
- Max Weekly Loss: ${logic['risk_limits']['weekly_loss']}
- Stop Loss: {logic['risk_limits']['stop_loss']*100}%
- Max Open Positions: {logic['risk_limits']['max_positions']}

**Scan Speed:** Every {logic['scan_speed']['value']} seconds
"""
        
        elif response['type'] == 'binary_markets':
            data = response['data']
            text = f"""🎯 **Yes/No (Binary) Markets**

**What are they?**
{data['explanation']}

**Arbitrage Logic:**
{data['arbitrage_logic']}

**Example Trade:**
{data['example']}

**Current Bot Focus:**
{data['current_focus']}

The bot prioritizes these markets because they have the clearest arbitrage opportunities and lowest risk!
"""
        
        else:
            text = response.get('message', 'I can answer questions about performance, logic, and yes/no markets.')
        
        return jsonify({
            'response': text,
            'data': response.get('data', {}),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/suggestions', methods=['GET'])
def suggestions():
    """Get suggested improvements based on current performance"""
    try:
        metrics = analyzer.get_performance_metrics()
        logic = analyzer.get_decision_logic()
        
        suggestions = []
        
        all_time = metrics.get('all_time', {})
        
        # No trades yet
        if all_time.get('total_trades', 0) == 0:
            suggestions.append({
                "type": "config",
                "priority": "high",
                "title": "Lower Profit Threshold",
                "description": "Current threshold is 0.5%. Try lowering to 0.3% to find more opportunities.",
                "action": "Lower min_profit_threshold in config.yaml"
            })
        
        # Low win rate
        elif all_time.get('win_rate', 0) < 50:
            suggestions.append({
                "type": "risk",
                "priority": "high",
                "title": "Tighten Risk Controls",
                "description": f"Win rate is {all_time.get('win_rate', 0)}%. Increase minimum criteria.",
                "action": "Increase min_liquidity and min_volume_24h"
            })
        
        # High win rate but few trades
        elif all_time.get('win_rate', 0) > 70 and all_time.get('total_trades', 0) < 20:
            suggestions.append({
                "type": "opportunity",
                "priority": "medium",
                "title": "Increase Trade Frequency",
                "description": "Great win rate! Lower thresholds slightly to find more opportunities.",
                "action": "Decrease min_profit_threshold by 0.1%"
            })
        
        # Always suggest focusing on binary markets
        suggestions.append({
            "type": "strategy",
            "priority": "medium",
            "title": "Prioritize Binary (Yes/No) Markets",
            "description": "Yes/No markets have clearer arbitrage signals and lower complexity.",
            "action": "Already implemented - bot focuses on binary outcomes"
        })
        
        return jsonify(suggestions)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("""
    ╔═══════════════════════════════════════╗
    ║   Bot Chat Interface (AI)             ║
    ╚═══════════════════════════════════════╝
    
    🤖 Chat interface starting...
    💬 API endpoint:
    
        http://localhost:8001
    
    Press Ctrl+C to stop
    """)
    
    app.run(host='0.0.0.0', port=8001, debug=False)
