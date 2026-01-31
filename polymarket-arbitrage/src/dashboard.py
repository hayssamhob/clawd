#!/usr/bin/env python3
"""
Web Dashboard for Polymarket Arbitrage Bot
Real-time monitoring interface
"""

import os
import sys
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

from flask import Flask, render_template, jsonify
import plotly
import plotly.graph_objs as go
import json

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable caching

# Database path
DB_PATH = "data/trades.db"
LOG_PATH = "logs/bot.log"


def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.route('/')
def index():
    """Main dashboard page"""
    return render_template('dashboard.html')


@app.route('/api/status')
def api_status():
    """Get bot status"""
    try:
        # Check if bot is running by checking process
        import subprocess
        try:
            result = subprocess.run(
                ['pgrep', '-f', 'arbitrage_bot.py'],
                capture_output=True,
                text=True
            )
            is_running = bool(result.stdout.strip())
        except:
            # Fallback to log file check
            if os.path.exists(LOG_PATH):
                log_age = datetime.now() - datetime.fromtimestamp(os.path.getmtime(LOG_PATH))
                is_running = log_age.total_seconds() < 300  # Updated in last 5 minutes
            else:
                is_running = False
        
        # Get stats from database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Today's stats
        cursor.execute("""
            SELECT 
                COUNT(*) as total_trades,
                SUM(CASE WHEN actual_profit > 0 THEN 1 ELSE 0 END) as winning_trades,
                SUM(actual_profit) as total_profit,
                AVG(actual_profit) as avg_profit,
                MAX(actual_profit) as best_trade,
                MIN(actual_profit) as worst_trade
            FROM trades
            WHERE date(timestamp) = date('now')
        """)
        
        today = cursor.fetchone()
        
        # All time stats
        cursor.execute("""
            SELECT 
                COUNT(*) as total_trades,
                SUM(actual_profit) as total_profit
            FROM trades
        """)
        
        all_time = cursor.fetchone()
        
        conn.close()
        
        return jsonify({
            'running': is_running,
            'mode': 'dry_run',  # TODO: Read from config
            'today': {
                'trades': today['total_trades'] or 0,
                'wins': today['winning_trades'] or 0,
                'profit': round(today['total_profit'] or 0, 2),
                'avg_profit': round(today['avg_profit'] or 0, 2),
                'best_trade': round(today['best_trade'] or 0, 2),
                'worst_trade': round(today['worst_trade'] or 0, 2)
            },
            'all_time': {
                'trades': all_time['total_trades'] or 0,
                'profit': round(all_time['total_profit'] or 0, 2)
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/trades')
def api_trades():
    """Get recent trades"""
    try:
        limit = int(request.args.get('limit', 50))
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                id,
                timestamp,
                market_name,
                trade_type,
                expected_profit,
                actual_profit,
                status,
                simulated
            FROM trades
            ORDER BY timestamp DESC
            LIMIT ?
        """, (limit,))
        
        trades = []
        for row in cursor.fetchall():
            trades.append({
                'id': row['id'],
                'timestamp': row['timestamp'],
                'market': row['market_name'],
                'type': row['trade_type'],
                'expected_profit': round(row['expected_profit'] or 0, 2),
                'actual_profit': round(row['actual_profit'] or 0, 2),
                'status': row['status'],
                'simulated': bool(row['simulated'])
            })
        
        conn.close()
        
        return jsonify(trades)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/chart/profit')
def api_chart_profit():
    """Get profit chart data"""
    try:
        days = int(request.args.get('days', 7))
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                date(timestamp) as day,
                SUM(actual_profit) as profit,
                COUNT(*) as trades
            FROM trades
            WHERE timestamp >= date('now', '-' || ? || ' days')
            GROUP BY date(timestamp)
            ORDER BY day ASC
        """, (days,))
        
        data = cursor.fetchall()
        conn.close()
        
        dates = [row['day'] for row in data]
        profits = [row['profit'] or 0 for row in data]
        trades = [row['trades'] for row in data]
        
        # Create Plotly chart
        fig = go.Figure()
        
        fig.add_trace(go.Bar(
            x=dates,
            y=profits,
            name='Daily Profit',
            marker_color=['green' if p >= 0 else 'red' for p in profits]
        ))
        
        fig.update_layout(
            title=f'Profit/Loss - Last {days} Days',
            xaxis_title='Date',
            yaxis_title='Profit (USDC)',
            hovermode='x unified',
            template='plotly_dark'
        )
        
        return jsonify(json.loads(fig.to_json()))
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/logs')
def api_logs():
    """Get recent log entries"""
    try:
        lines = int(request.args.get('lines', 100))
        
        if not os.path.exists(LOG_PATH):
            return jsonify([])
        
        # Read last N lines
        with open(LOG_PATH, 'r') as f:
            log_lines = f.readlines()
        
        recent_lines = log_lines[-lines:]
        
        # Parse and format
        logs = []
        for line in recent_lines:
            # Parse log format: "2026-01-31 10:36:47,947 - module - LEVEL - message"
            parts = line.split(' - ', 3)
            if len(parts) >= 4:
                logs.append({
                    'timestamp': parts[0],
                    'module': parts[1],
                    'level': parts[2],
                    'message': parts[3].strip()
                })
        
        return jsonify(logs)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/opportunities')
def api_opportunities():
    """Get recent opportunities (detected but not necessarily executed)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                id,
                timestamp,
                market_name,
                opportunity_type,
                expected_profit,
                executed
            FROM opportunities
            ORDER BY timestamp DESC
            LIMIT 50
        """)
        
        opportunities = []
        for row in cursor.fetchall():
            opportunities.append({
                'id': row['id'],
                'timestamp': row['timestamp'],
                'market': row['market_name'],
                'type': row['opportunity_type'],
                'expected_profit': round(row['expected_profit'] or 0, 2),
                'executed': bool(row['executed'])
            })
        
        conn.close()
        
        return jsonify(opportunities)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Import request for query parameters
from flask import request


# Bot Control Endpoints
@app.route('/api/control/start', methods=['POST'])
def api_control_start():
    """Start the bot"""
    try:
        # In a production system, this would send a signal to the bot process
        # For now, return success (bot must be started manually via script)
        return jsonify({'success': False, 'error': 'Please use ./start_all.sh to start the bot'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/control/stop', methods=['POST'])
def api_control_stop():
    """Stop the bot"""
    try:
        import subprocess
        result = subprocess.run(['pkill', '-f', 'arbitrage_bot.py'], capture_output=True)
        return jsonify({'success': True, 'message': 'Bot stopped'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/control/pause', methods=['POST'])
def api_control_pause():
    """Pause/Resume the bot"""
    try:
        # This would need to be implemented in the bot with a pause mechanism
        return jsonify({'success': False, 'error': 'Pause functionality not yet implemented'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Settings Endpoints
@app.route('/api/settings', methods=['GET'])
def api_get_settings():
    """Get current settings"""
    try:
        import yaml
        with open('../config/config.yaml') as f:
            config = yaml.safe_load(f)
        return jsonify(config)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/settings', methods=['POST'])
def api_save_settings():
    """Save settings"""
    try:
        import yaml
        settings = request.get_json()

        # Load current config
        with open('../config/config.yaml') as f:
            config = yaml.safe_load(f)

        # Update specific fields
        if 'execution' in settings:
            config['execution'].update(settings['execution'])
        if 'polymarket' in settings:
            config['polymarket'].update(settings['polymarket'])
        if 'scanner' in settings:
            config['scanner'].update(settings['scanner'])

        # Save back to file
        with open('../config/config.yaml', 'w') as f:
            yaml.dump(config, f, default_flow_style=False)

        return jsonify({'success': True, 'message': 'Settings saved'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    print("""
    ╔═══════════════════════════════════════╗
    ║   Polymarket Arbitrage Dashboard      ║
    ╚═══════════════════════════════════════╝
    
    🌐 Dashboard starting...
    📊 Open in your browser:
    
        http://localhost:8000
    
    Press Ctrl+C to stop
    """)
    
    app.run(host='0.0.0.0', port=8000, debug=False)
