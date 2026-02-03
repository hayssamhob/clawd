#!/bin/bash
# Windsurf Integration Script for OpenClaw

# Strict error handling
set -euo pipefail

# Configuration
WINDSURF_PATH="/Users/hayssamhoballah/.nvm/versions/node/v22.12.0/lib/node_modules/openclaw/skills/windsurf-automation"
BRIDGE_CONFIG="/Users/hayssamhoballah/clawd/manifests/windsurf_bridge.yaml"
LOG_FILE="/Users/hayssamhoballah/clawd/logs/windsurf_integration.log"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Check Windsurf status
check_windsurf_status() {
    log "Checking Windsurf status..."
    if [ ! -f "$WINDSURF_PATH/windsurf-execute.cjs" ]; then
        log "ERROR: Windsurf executable not found"
        return 1
    fi

    # Attempt to get version or status
    local windsurf_version
    windsurf_version=$(node "$WINDSURF_PATH/windsurf-execute.cjs" --version 2>&1)
    if [ $? -ne 0 ]; then
        log "ERROR: Unable to get Windsurf version"
        return 1
    fi

    log "Windsurf version: $windsurf_version"
    return 0
}

# Main execution
main() {
    # First, verify Windsurf status
    if ! check_windsurf_status; then
        log "Windsurf is not properly configured"
        exit 1
    fi

    local task_description="$1"
    local task_type="${2:-quick_fix}"
    local tokens="${3:-500}"
    
    log "Routing task to Windsurf: $task_description"
    log "Task Type: $task_type"
    log "Token Limit: $tokens"
    
    # Verbose Windsurf execution
    log "Attempting to execute Windsurf task..."
    node "$WINDSURF_PATH/windsurf-verbose" \
        "$WINDSURF_PATH/windsurf-execute.cjs" \
        --task "$task_description" \
        --mode agent \
        --verbose true \
        --log "$LOG_FILE"
    
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log "ERROR: Windsurf task execution failed with code $exit_code"
        exit 1
    fi

    log "Windsurf task completed successfully"
}

# Execute main with all arguments
main "$@"