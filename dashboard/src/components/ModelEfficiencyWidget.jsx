import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';

const ModelEfficiencyWidget = () => {
    const [tokenUsage, setTokenUsage] = useState({
        daily: [],
        weekly: [],
        monthly: []
    });
    
    const [modelPerformance, setModelPerformance] = useState({
        currentModel: 'Claude Haiku',
        efficiency: 85,
        costSavings: 0
    });

    useEffect(() => {
        // Fetch token usage data
        const fetchTokenUsage = async () => {
            try {
                const response = await fetch('/api/token-usage');
                const data = await response.json();
                setTokenUsage(data);
            } catch (error) {
                console.error('Failed to fetch token usage', error);
            }
        };

        // Fetch model performance data
        const fetchModelPerformance = async () => {
            try {
                const response = await fetch('/api/model-performance');
                const data = await response.json();
                setModelPerformance(data);
            } catch (error) {
                console.error('Failed to fetch model performance', error);
            }
        };

        fetchTokenUsage();
        fetchModelPerformance();
        
        // Set up periodic refresh
        const intervalId = setInterval(() => {
            fetchTokenUsage();
            fetchModelPerformance();
        }, 5 * 60 * 1000); // Every 5 minutes

        return () => clearInterval(intervalId);
    }, []);

    const tokenUsageChartData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Daily Token Usage',
                data: tokenUsage.weekly,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }
        ]
    };

    return (
        <div className="model-efficiency-widget">
            <h2>AI Model Efficiency</h2>
            
            <div className="current-model-info">
                <h3>Current Model: {modelPerformance.currentModel}</h3>
                <p>Efficiency: {modelPerformance.efficiency}%</p>
                <p>Estimated Cost Savings: ${modelPerformance.costSavings.toFixed(2)}</p>
            </div>

            <div className="token-usage-chart">
                <h3>Weekly Token Usage</h3>
                <Line data={tokenUsageChartData} />
            </div>

            <div className="model-recommendations">
                <h3>Recommended Optimizations</h3>
                <ul>
                    <li>Consider switching to Claude Haiku for simple tasks</li>
                    <li>You're currently at 85% model efficiency</li>
                    <li>Potential monthly savings: $45.23</li>
                </ul>
            </div>
        </div>
    );
};

export default ModelEfficiencyWidget;