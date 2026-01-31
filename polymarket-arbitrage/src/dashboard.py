#!/usr/bin/env python3
"""
Web Dashboard for Polymarket Arbitrage Bot
Real-time monitoring interface
"""

import json
import os
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path

import plotly
import plotly.graph_objs as go
from flask import Flask, jsonify, render_template

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


import signal
# Bot process management
import subprocess

# Import request for query parameters
from flask import request

BOT_PROCESS = None
BOT_STATUS = 'stopped'  # 'running', 'paused', 'stopped'
BOT_SCRIPT = 'src/arbitrage_bot.py'


@app.route('/api/bot/start', methods=['POST'])
def api_bot_start():
    """Start the arbitrage bot"""
    global BOT_PROCESS, BOT_STATUS
    
    try:
        # Check if already running
        result = subprocess.run(
            ['pgrep', '-f', 'arbitrage_bot.py'],
            capture_output=True,
            text=True
        )
        if result.stdout.strip():
            return jsonify({
                'success': False,
                'error': 'Bot is already running',
                'status': 'running'
            })
        
        # Start the bot in background
        BOT_PROCESS = subprocess.Popen(
            ['python3', BOT_SCRIPT],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True
        )
        BOT_STATUS = 'running'
        
        return jsonify({
            'success': True,
            'message': '✅ Bot started successfully!',
            'status': 'running',
            'pid': BOT_PROCESS.pid
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'status': BOT_STATUS
        }), 500


@app.route('/api/bot/stop', methods=['POST'])
def api_bot_stop():
    """Stop the arbitrage bot"""
    global BOT_PROCESS, BOT_STATUS
    
    try:
        # Find and kill the bot process
        result = subprocess.run(
            ['pkill', '-f', 'arbitrage_bot.py'],
            capture_output=True,
            text=True
        )
        
        BOT_PROCESS = None
        BOT_STATUS = 'stopped'
        
        return jsonify({
            'success': True,
            'message': '🛑 Bot stopped successfully!',
            'status': 'stopped'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'status': BOT_STATUS
        }), 500


@app.route('/api/bot/pause', methods=['POST'])
def api_bot_pause():
    """Pause the arbitrage bot (send SIGUSR1)"""
    global BOT_STATUS
    
    try:
        # Find bot PID and send pause signal
        result = subprocess.run(
            ['pgrep', '-f', 'arbitrage_bot.py'],
            capture_output=True,
            text=True
        )
        
        pid = result.stdout.strip()
        if not pid:
            return jsonify({
                'success': False,
                'error': 'Bot is not running',
                'status': 'stopped'
            })
        
        # Send SIGUSR1 to pause (bot needs to handle this)
        os.kill(int(pid.split()[0]), signal.SIGUSR1)
        BOT_STATUS = 'paused'
        
        return jsonify({
            'success': True,
            'message': '⏸️ Bot paused successfully!',
            'status': 'paused'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'status': BOT_STATUS
        }), 500


@app.route('/api/bot/restart', methods=['POST'])
def api_bot_restart():
    """Restart the arbitrage bot"""
    global BOT_PROCESS, BOT_STATUS
    
    try:
        # Stop first
        subprocess.run(
            ['pkill', '-f', 'arbitrage_bot.py'],
            capture_output=True,
            text=True
        )
        
        import time
        time.sleep(1)  # Wait for process to terminate
        
        # Start again
        BOT_PROCESS = subprocess.Popen(
            ['python3', BOT_SCRIPT],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True
        )
        BOT_STATUS = 'running'
        
        return jsonify({
            'success': True,
            'message': '🔄 Bot restarted successfully!',
            'status': 'running',
            'pid': BOT_PROCESS.pid
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'status': BOT_STATUS
        }), 500


@app.route('/api/bot/status', methods=['GET'])
def api_bot_status():
    """Get current bot status"""
    global BOT_STATUS
    
    try:
        result = subprocess.run(
            ['pgrep', '-f', 'arbitrage_bot.py'],
            capture_output=True,
            text=True
        )
        
        is_running = bool(result.stdout.strip())
        
        if is_running and BOT_STATUS == 'stopped':
            BOT_STATUS = 'running'
        elif not is_running:
            BOT_STATUS = 'stopped'
        
        return jsonify({
            'status': BOT_STATUS,
            'running': is_running,
            'pid': result.stdout.strip() if is_running else None
        })
        
    except Exception as e:
        return jsonify({
            'status': 'unknown',
            'error': str(e)
        }), 500


@app.route('/api/trades/export', methods=['GET'])
def api_export_trades():
    """Export trades as CSV"""
    try:
        import csv
        import io
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                id, timestamp, market_name, trade_type,
                expected_profit, actual_profit, status, simulated
            FROM trades
            ORDER BY timestamp DESC
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(['ID', 'Timestamp', 'Market', 'Type', 
                        'Expected Profit', 'Actual Profit', 'Status', 'Simulated'])
        
        # Data rows
        for row in rows:
            writer.writerow([
                row['id'], row['timestamp'], row['market_name'],
                row['trade_type'], row['expected_profit'],
                row['actual_profit'], row['status'], row['simulated']
            ])
        
        output.seek(0)
        
        from flask import Response
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=trades_export.csv'}
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
