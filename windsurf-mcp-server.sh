#!/bin/bash

# Windsurf MCP Server Manager
# Usage: ./windsurf-mcp-server.sh [start|stop|restart|status]

PID_FILE=~/.windsurf-mcp-server.pid
LOG_FILE=~/clawd/logs/windsurf-mcp-server.log
SERVER_SCRIPT=~/clawd/windsurf-mcp-standalone-simple.js

# Create logs directory if needed
mkdir -p ~/clawd/logs

start() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo "❌ Server is already running (PID: $PID)"
            return 1
        else
            echo "🧹 Cleaning up stale PID file..."
            rm "$PID_FILE"
        fi
    fi
    
    echo "🚀 Starting Windsurf MCP Server..."
    nohup node "$SERVER_SCRIPT" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 1
    
    if ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
        echo "✅ Server started (PID: $(cat "$PID_FILE"))"
        echo "📡 Listening on http://localhost:3101"
        echo "📝 Logs: $LOG_FILE"
    else
        echo "❌ Failed to start server"
        rm "$PID_FILE"
        return 1
    fi
}

stop() {
    if [ ! -f "$PID_FILE" ]; then
        echo "❌ Server is not running (no PID file)"
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null 2>&1; then
        echo "🛑 Stopping server (PID: $PID)..."
        kill $PID
        sleep 1
        
        if ps -p $PID > /dev/null 2>&1; then
            echo "⚠️  Force killing..."
            kill -9 $PID
        fi
        
        rm "$PID_FILE"
        echo "✅ Server stopped"
    else
        echo "❌ Server is not running (stale PID)"
        rm "$PID_FILE"
    fi
}

status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo "✅ Server is running (PID: $PID)"
            echo "📡 Port: 3101"
            echo "📝 Logs: $LOG_FILE"
            
            # Test connectivity
            if curl -s http://localhost:3101/ > /dev/null; then
                echo "🌐 Server is responding"
            else
                echo "⚠️  Server not responding on port 3101"
            fi
        else
            echo "❌ Server is not running (stale PID)"
        fi
    else
        echo "❌ Server is not running (no PID file)"
    fi
}

restart() {
    stop
    sleep 2
    start
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
