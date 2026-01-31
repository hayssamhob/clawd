        let chatHistory = [];
        
        async function sendChatMessage() {
            const input = document.getElementById('chat-input');
            const message = input.value.trim();
            
            if (!message) return;
            
            // Add user message to chat
            addChatMessage(message, 'user');
            input.value = '';
            
            // Send to chat API
            try {
                const response = await fetch('http://localhost:8001/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: message })
                });
                
                const data = await response.json();
                addChatMessage(data.response, 'bot');
                
            } catch (error) {
                addChatMessage('Error: Could not connect to chat service. Make sure chat_interface.py is running on port 8001.', 'bot');
            }
        }
        
        function addChatMessage(text, sender) {
            const messagesDiv = document.getElementById('chat-messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${sender}`;
            messageDiv.innerHTML = sender === 'user' ? text : marked.parse(text);
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        // Enter key to send
        document.getElementById('chat-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
        
        // Load decision logic
        async function loadDecisionLogic() {
            try {
                const response = await fetch('http://localhost:8001/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'show logic' })
                });
                
                const data = await response.json();
                if (data.data) {
                    displayDecisionLogic(data.data);
                }
            } catch (error) {
                console.error('Could not load decision logic:', error);
            }
        }
        
        function displayDecisionLogic(logic) {
            const container = document.getElementById('decision-logic');
            container.innerHTML = '';
            
            const items = [
                {
                    title: 'Profit Threshold',
                    value: `${(logic.profit_threshold.value * 100).toFixed(2)}%`,
                    desc: 'Minimum profit required per trade'
                },
                {
                    title: 'Min Liquidity',
                    value: `$${logic.liquidity_filter.value.toLocaleString()}`,
                    desc: 'Market must have this much capital'
                },
                {
                    title: 'Min 24h Volume',
                    value: `$${logic.volume_filter.value.toLocaleString()}`,
                    desc: 'Daily trading activity required'
                },
                {
                    title: 'Max Position',
                    value: `$${logic.position_size.value}`,
                    desc: 'Maximum risk per trade'
                },
                {
                    title: 'Scan Speed',
                    value: `${logic.scan_speed.value}s`,
                    desc: 'Market refresh rate'
                },
                {
                    title: 'Max Spread',
                    value: `${(logic.max_spread.value * 100).toFixed(1)}%`,
                    desc: 'Bid-ask spread tolerance'
                }
            ];
            
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'logic-item';
                div.innerHTML = `
                    <h4>${item.title}</h4>
                    <div class="logic-value">${item.value}</div>
                    <div class="logic-desc">${item.desc}</div>
                `;
                container.appendChild(div);
            });
        }
        
        // Update status
        async function updateStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                
                const statusDiv = document.getElementById('bot-status');
                const indicator = statusDiv.querySelector('.status-indicator');
                
                if (data.running) {
                    indicator.className = 'status-indicator status-running';
                    statusDiv.innerHTML = '<span class="status-indicator status-running"></span> Running (LIVE Mode)';
                } else {
                    indicator.className = 'status-indicator status-stopped';
                    statusDiv.innerHTML = '<span class="status-indicator status-stopped"></span> Stopped';
                }
                
                // Update stats
                document.getElementById('today-trades').textContent = data.today.trades;
                document.getElementById('today-winrate').textContent = 
                    data.today.trades > 0 ? `${((data.today.wins / data.today.trades) * 100).toFixed(1)}%` : '0%';
                document.getElementById('today-profit').textContent = `$${data.today.profit.toFixed(2)}`;
                document.getElementById('alltime-trades').textContent = data.all_time.trades;
                document.getElementById('alltime-profit').textContent = `$${data.all_time.profit.toFixed(2)}`;
                document.getElementById('best-trade').textContent = `$${data.today.best_trade.toFixed(2)}`;
                
            } catch (error) {
                console.error('Error updating status:', error);
            }
        }
        
        // Update trades
        async function updateTrades() {
            try {
                const response = await fetch('/api/trades?limit=20');
                const trades = await response.json();
                
                const tbody = document.getElementById('trades-body');
                
                if (trades.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #a0a0a0;">No trades yet...</td></tr>';
                    return;
                }
                
                tbody.innerHTML = trades.map(trade => {
                    const time = new Date(trade.timestamp * 1000).toLocaleTimeString();
                    const profitClass = trade.actual_profit >= 0 ? 'profit' : 'loss';
                    const statusBadge = trade.status === 'success' ? 'badge-success' : 'badge-failed';
                    
                    return `
                        <tr>
                            <td>${time}</td>
                            <td>${trade.market.substring(0, 30)}...</td>
                            <td class="${profitClass}">$${trade.actual_profit.toFixed(2)}</td>
                            <td><span class="badge ${statusBadge}">${trade.status}</span></td>
                        </tr>
                    `;
                }).join('');
                
            } catch (error) {
                console.error('Error updating trades:', error);
            }
        }
        
        // Update chart
        async function updateChart() {
            try {
                const response = await fetch('/api/chart/profit?days=7');
                const chartData = await response.json();
                
                if (chartData.data) {
                    Plotly.newPlot('profit-chart', chartData.data, chartData.layout);
                }
            } catch (error) {
                console.error('Error updating chart:', error);
            }
        }
        
        // Update logs
        async function updateLogs() {
            try {
                const response = await fetch('/api/logs?lines=50');
                const logs = await response.json();
                
                const container = document.getElementById('log-container');
                container.innerHTML = logs.map(log => {
                    let levelClass = 'log-info';
                    if (log.level === 'WARNING') levelClass = 'log-warning';
                    if (log.level === 'ERROR') levelClass = 'log-error';
                    if (log.level === 'DEBUG') levelClass = 'log-debug';
                    
                    return `<div class="log-line ${levelClass}">${log.timestamp} [${log.level}] ${log.message}</div>`;
                }).join('');
                
                container.scrollTop = container.scrollHeight;
            } catch (error) {
                console.error('Error updating logs:', error);
            }
        }
        
        // Auto-refresh
        function refreshAll() {
            updateStatus();
            updateTrades();
            updateChart();
            updateLogs();
        }
        
        // Initial load
        refreshAll();
        loadDecisionLogic();
        
        // Refresh every 3 seconds
