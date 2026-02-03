#!/bin/bash

# Advanced Windsurf Execution Script
# Provides enhanced logging, error handling, and self-healing

set -euo pipefail

# Logging setup
LOG_DIR="$HOME/clawd/logs/windsurf"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXECUTION_LOG="$LOG_DIR/execution_${TIMESTAMP}.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$EXECUTION_LOG"
}

# Error handling function
handle_error() {
    local error_message="$1"
    log "ERROR: $error_message"
    
    # Attempt self-healing
    case "$error_message" in
        *"model not available"*)
            log "Attempting to switch to alternative model..."
            # Add model switching logic
            ;;
        *"execution timeout"*)
            log "Task timed out. Retrying with increased timeout..."
            # Add retry logic
            ;;
        *)
            log "Unhandled error. Logging for review."
            ;;
    esac
}

# Main execution function
execute_windsurf_task() {
    local task="$1"
    local model="${2:-default}"
    local timeout="${3:-600}"  # Default 10-minute timeout
    
    log "Starting Windsurf task execution"
    log "Task: $task"
    log "Model: $model"
    log "Timeout: $timeout seconds"
    
    # Add error trapping
    set +e
    
    # Execute task with comprehensive logging
    node /Users/hayssamhoballah/.nvm/versions/node/v22.12.0/lib/node_modules/openclaw/skills/windsurf-automation/windsurf-execute.cjs \
        "$task" \
        --workspace ~/clawd \
        --model "$model" \
        --timeout "$timeout" \
        --log-file "$EXECUTION_LOG" \
        2>&1 | tee -a "$EXECUTION_LOG"
    
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        handle_error "Windsurf execution failed with code $exit_code"
        return $exit_code
    fi
    
    log "Task completed successfully"
    return 0
}

# Main script logic
main() {
    local task="$1"
    local model="${2:-default}"
    local timeout="${3:-600}"
    
    execute_windsurf_task "$task" "$model" "$timeout"
}

# Execute main with all script arguments
main "$@"