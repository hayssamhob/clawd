// Bot Control Functions
async function startBot() {
    if (!confirm('Start the arbitrage bot?')) return;

    try {
        const response = await fetch('/api/control/start', {method: 'POST'});
        const result = await response.json();

        if (result.success) {
            showNotification('Bot started successfully!', 'success');
            updateStatus();
        } else {
            showNotification('Failed to start bot: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('Error starting bot: ' + error, 'error');
    }
}

async function stopBot() {
    if (!confirm('Stop the arbitrage bot? This will halt all trading.')) return;

    try {
        const response = await fetch('/api/control/stop', {method: 'POST'});
        const result = await response.json();

        if (result.success) {
            showNotification('Bot stopped successfully!', 'success');
            updateStatus();
        } else {
            showNotification('Failed to stop bot: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('Error stopping bot: ' + error, 'error');
    }
}

async function pauseBot() {
    try {
        const response = await fetch('/api/control/pause', {method: 'POST'});
        const result = await response.json();

        if (result.success) {
            const state = result.paused ? 'paused' : 'resumed';
            showNotification(`Bot ${state}!`, 'success');
            updateStatus();
        } else {
            showNotification('Failed to toggle pause: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('Error pausing bot: ' + error, 'error');
    }
}

// Settings Modal
function openSettings() {
    document.getElementById('settingsModal').classList.add('show');
    loadSettings();
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('show');
}

async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const settings = await response.json();

        document.getElementById('tradingMode').value = settings.execution.mode;
        document.getElementById('maxPosition').value = settings.polymarket.max_position_size;
        document.getElementById('minMargin').value = settings.polymarket.min_net_margin;
        document.getElementById('scanInterval').value = settings.scanner.scan_interval;
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    const settings = {
        execution: {
            mode: document.getElementById('tradingMode').value
        },
        polymarket: {
            max_position_size: parseFloat(document.getElementById('maxPosition').value),
            min_net_margin: parseFloat(document.getElementById('minMargin').value)
        },
        scanner: {
            scan_interval: parseInt(document.getElementById('scanInterval').value)
        }
    };

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(settings)
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Settings saved! Restart bot for changes to take effect.', 'success');
            closeSettings();
        } else {
            showNotification('Failed to save settings: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('Error saving settings: ' + error, 'error');
    }
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    const colors = {
        success: '#4ade80',
        error: '#ef4444',
        info: '#667eea'
    };

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${colors[type] || colors.info};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Click outside modal to close
window.onclick = function(event) {
    const modal = document.getElementById('settingsModal');
    if (event.target === modal) {
        closeSettings();
    }
}
