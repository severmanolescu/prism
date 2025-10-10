const { ipcMain, dialog, BrowserWindow } = require('electron');
const fs = require('fs').promises;
const path = require('path');

function initializeProductivityExporter() {
    /**
     * Generate PDF from productivity page
     */
    ipcMain.handle('export-productivity-pdf', async (event, data) => {
    let pdfWindow = null;

    try {
        const { dateRange } = data;

        // Fetch productivity data using the existing service
        const { getProductivityStats } = require('../../services/data-access');
        const productivityData = await getProductivityStats(dateRange.start, dateRange.end);

        // Show save dialog
        const result = await dialog.showSaveDialog({
        title: 'Save Productivity Report as PDF',
        defaultPath: `productivity_${dateRange.start}_to_${dateRange.end}.pdf`,
        filters: [
            { name: 'PDF Files', extensions: ['pdf'] }
        ]
        });

        if (result.canceled) {
        return { success: false, canceled: true };
        }

        // Create hidden window
        pdfWindow = new BrowserWindow({
        width: 1200,
        height: 1600,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
        });

        // Generate and load HTML
        const htmlContent = await generateProductivityHTML(productivityData, dateRange);
        await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate PDF
        const pdfData = await pdfWindow.webContents.printToPDF({
        marginsType: 0,
        printBackground: true,
        printSelectionOnly: false,
        landscape: false,
        pageSize: 'A4',
        scaleFactor: 100
        });

        // Save and cleanup
        await fs.writeFile(result.filePath, pdfData);
        pdfWindow.close();

        return { success: true, path: result.filePath };

    } catch (error) {
        console.error('[Export] Error in productivity PDF export:', error);
        if (pdfWindow) pdfWindow.close();
        return { success: false, error: error.message };
    }
    });

    // Helper function to generate HTML for productivity PDF
    async function generateProductivityHTML(data, dateRange) {
    const formatTime = (ms) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    // Read CSS and chart renderer files
    const cssPath = path.join(__dirname, 'export.css');
    const cssContent = await fs.readFile(cssPath, 'utf-8');

    const chartRendererPath = path.join(__dirname, 'chart-renderer.js');
    const chartRendererScript = await fs.readFile(chartRendererPath, 'utf-8');

    // Generate insights
    const insights = [];

    // Deep Work Sessions
    if (data.deepWorkSessions && data.deepWorkSessions.count > 0) {
        insights.push({
        icon: '🎯',
        title: 'Deep Work Sessions',
        text: `${data.deepWorkSessions.count} sessions of 25+ minutes (${formatTime(data.deepWorkSessions.totalTime)} total).`
        });
    }

    // Peak Productivity Hour
    if (data.peakProductivityHour) {
        const hour = data.peakProductivityHour.hour;
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        insights.push({
        icon: '⏰',
        title: 'Peak Productivity',
        text: `Most productive around ${hour12} ${period} (${data.peakProductivityHour.percentage}% productive time).`
        });
    }

    // Productivity Score Insight
    if (data.score >= 70) {
        insights.push({
        icon: '✨',
        title: 'Great Performance',
        text: `Excellent productivity score of ${data.score}! Keep up the great work.`
        });
    } else if (data.score >= 50) {
        insights.push({
        icon: '📈',
        title: 'Good Progress',
        text: `Solid productivity score of ${data.score}. Room for improvement.`
        });
    } else {
        insights.push({
        icon: '💪',
        title: 'Opportunity to Improve',
        text: `Productivity score of ${data.score}. Focus on reducing distractions.`
        });
    }

    return `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <style>
            ${cssContent}
        </style>
        </head>
        <body>
        <h1>📊 Productivity Report</h1>
        <div class="date-range">${dateRange.start} to ${dateRange.end}</div>

        <h2>Productivity Trend</h2>
        <div class="chart-container">
            <canvas id="daily-chart" width="1000" height="300"></canvas>
        </div>

        <h2>Productivity Score</h2>
        <div class="stats-grid" style="grid-template-columns: 1fr;">
            <div class="stat-card" style="border-left: 4px solid ${data.score >= 70 ? '#4ade80' : data.score >= 50 ? '#fbbf24' : '#ef4444'}; text-align: center;">
            <div class="stat-value" style="font-size: 48px; color: ${data.score >= 70 ? '#4ade80' : data.score >= 50 ? '#fbbf24' : '#ef4444'};">${data.score || 0}</div>
            <div class="stat-label">Overall Score</div>
            </div>
        </div>

        <h2>Time Breakdown</h2>
        <div class="stats-grid">
            <div class="stat-card" style="border-left: 3px solid #4ade80;">
            <div class="stat-label">✅ Productive Time</div>
            <div class="stat-value" style="color: #4ade80;">${formatTime(data.breakdown.productive.time)}</div>
            <div class="stat-subtitle">${data.breakdown.productive.percentage}% of total</div>
            </div>
            <div class="stat-card" style="border-left: 3px solid #fbbf24;">
            <div class="stat-label">⚪ Neutral Time</div>
            <div class="stat-value" style="color: #fbbf24;">${formatTime(data.breakdown.neutral.time)}</div>
            <div class="stat-subtitle">${data.breakdown.neutral.percentage}% of total</div>
            </div>
            <div class="stat-card" style="border-left: 3px solid #ef4444;">
            <div class="stat-label">❌ Unproductive Time</div>
            <div class="stat-value" style="color: #ef4444;">${formatTime(data.breakdown.unproductive.time)}</div>
            <div class="stat-subtitle">${data.breakdown.unproductive.percentage}% of total</div>
            </div>
        </div>

        <h2>Key Metrics</h2>
        <div class="stats-grid">
            <div class="stat-card">
            <div class="stat-label">Focus Time</div>
            <div class="stat-value">${formatTime(data.breakdown.productive.time)}</div>
            <div class="stat-subtitle">${data.breakdown.productive.percentage}% of total</div>
            </div>
            <div class="stat-card">
            <div class="stat-label">Distraction Time</div>
            <div class="stat-value">${formatTime(data.breakdown.unproductive.time)}</div>
            <div class="stat-subtitle">${data.breakdown.unproductive.percentage}% of total</div>
            </div>
            <div class="stat-card">
            <div class="stat-label">Context Switches</div>
            <div class="stat-value">${(() => {
                const totalTime = data.breakdown.productive.time + data.breakdown.neutral.time + data.breakdown.unproductive.time;
                const totalSessions = data.breakdown.productive.sessions + data.breakdown.neutral.sessions + data.breakdown.unproductive.sessions;
                const totalHours = totalTime / (1000 * 60 * 60);
                return totalHours > 0 ? Math.round(totalSessions / totalHours) : 0;
            })()}</div>
            <div class="stat-subtitle">per hour avg</div>
            </div>
            <div class="stat-card">
            <div class="stat-label">Deep Work Sessions</div>
            <div class="stat-value">${data.deepWorkSessions?.count || 0}</div>
            <div class="stat-subtitle">Avg ${Math.round((data.deepWorkSessions?.avgDuration || 0) / 60000)} min each</div>
            </div>
            <div class="stat-card">
            <div class="stat-label">Peak Productivity</div>
            <div class="stat-value">${data.peakProductivityHour ? `${data.peakProductivityHour.hour === 0 ? 12 : data.peakProductivityHour.hour > 12 ? data.peakProductivityHour.hour - 12 : data.peakProductivityHour.hour} ${data.peakProductivityHour.hour >= 12 ? 'PM' : 'AM'}` : '-'}</div>
            <div class="stat-subtitle">${data.peakProductivityHour?.percentage || 0}% productive</div>
            </div>
            <div class="stat-card">
            <div class="stat-label">Most Productive Day</div>
            <div class="stat-value">${data.dailyScores && data.dailyScores.length > 0 ? (() => {
                const mostProductiveDay = data.dailyScores.reduce((max, day) => day.score > max.score ? day : max);
                const date = new Date(mostProductiveDay.date);
                return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            })() : '-'}</div>
            <div class="stat-subtitle">Score: ${data.dailyScores && data.dailyScores.length > 0 ? data.dailyScores.reduce((max, day) => day.score > max.score ? day : max).score : 0}</div>
            </div>
        </div>

        ${data.topProductive && data.topProductive.length > 0 ? `
            <h2>Top Productive Apps</h2>
            <table>
            <thead>
                <tr>
                <th style="width: 50px;">#</th>
                <th>Application</th>
                <th style="width: 120px;">Category</th>
                <th style="width: 120px;">Time</th>
                <th style="width: 100px;">Sessions</th>
                </tr>
            </thead>
            <tbody>
                ${data.topProductive.slice(0, 15).map((app, i) => `
                <tr style="border-left: 3px solid #4ade80;">
                    <td>${i + 1}</td>
                    <td>${app.name}</td>
                    <td><span style="color: #4ade80;">${app.category || 'Uncategorized'}</span></td>
                    <td>${formatTime(app.total_time)}</td>
                    <td>${app.session_count || 0}</td>
                </tr>
                `).join('')}
            </tbody>
            </table>
        ` : ''}

        ${data.topUnproductive && data.topUnproductive.length > 0 ? `
            <h2>Top Distracting Apps</h2>
            <table>
            <thead>
                <tr>
                <th style="width: 50px;">#</th>
                <th>Application</th>
                <th style="width: 120px;">Category</th>
                <th style="width: 120px;">Time</th>
                <th style="width: 100px;">Sessions</th>
                </tr>
            </thead>
            <tbody>
                ${data.topUnproductive.slice(0, 15).map((app, i) => `
                <tr style="border-left: 3px solid #ef4444;">
                    <td>${i + 1}</td>
                    <td>${app.name}</td>
                    <td><span style="color: #ef4444;">${app.category || 'Uncategorized'}</span></td>
                    <td>${formatTime(app.total_time)}</td>
                    <td>${app.session_count || 0}</td>
                </tr>
                `).join('')}
            </tbody>
            </table>
        ` : ''}

        ${data.categoryBreakdown && data.categoryBreakdown.length > 0 ? `
            <h2>Category Breakdown</h2>
            <div class="category-grid">
            ${data.categoryBreakdown.map(cat => {
                const percentage = ((cat.total_time / data.totalTime) * 100).toFixed(1);
                const color = cat.color || '#66c0f4';
                return `
                <div class="category-item" style="border-left-color: ${color};">
                <div class="category-name">${cat.category}</div>
                <div class="category-time">${formatTime(cat.total_time)}</div>
                <div class="category-apps">${cat.app_count} apps • ${percentage}% of total</div>
                </div>
                `;
            }).join('')}
            </div>
        ` : ''}

        ${insights && insights.length > 0 ? `
        <h2>Insights</h2>
        <div class="insights-grid">
            ${insights.map(insight => `
            <div class="insight-card">
                <div class="insight-icon">${insight.icon || '💡'}</div>
                <div class="insight-content">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-text">${insight.text}</div>
                </div>
            </div>
            `).join('')}
        </div>
        ` : ''}

        <script>
            ${chartRendererScript}

            // Render productivity trend chart
            const dailyScores = ${JSON.stringify(data.dailyScores || [])};

            if (dailyScores && dailyScores.length > 0) {
            // Transform daily scores to match the chart format (use total_time)
            const chartData = dailyScores.map(day => ({
                date: day.date,
                total_time: day.total_time || 0
            }));

            renderDailyChart(chartData);
            }
        </script>
        </body>
        </html>
    `;
    }
}

module.exports = { initializeProductivityExporter };