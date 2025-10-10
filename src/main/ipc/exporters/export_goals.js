const { ipcMain, dialog, BrowserWindow } = require('electron');
const fs = require('fs').promises;
const path = require('path');

function initializeGoalsExporter() {
    /**
   * Generate PDF from goals page
   */
    ipcMain.handle('export-goals-pdf', async (event, data) => {
        let pdfWindow = null;

        try {
            const { date, dateFormatted } = data;

            // Fetch goals data using the goals module
            const { getGoalsDataForDate } = require('./../goals');
            const goalsData = getGoalsDataForDate(date);

            // Show save dialog
            const result = await dialog.showSaveDialog({
                title: 'Save Goals Report as PDF',
                defaultPath: `goals_${date}.pdf`,
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
            const htmlContent = await generateGoalsHTML(goalsData, date, dateFormatted);
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
            if (pdfWindow) pdfWindow.close();
            return { success: false, error: error.message };
        }
    });

    // Helper function to generate HTML for goals PDF
    async function generateGoalsHTML(data, date, dateFormatted) {
        const getStatusBadge = (status) => {
            if (status === 'achieved') return '<span style="color: #4ade80;">✅ Achieved</span>';
            if (status === 'failed') return '<span style="color: #ef4444;">❌ Failed</span>';
            return '<span style="color: #fbbf24;">⏳ In Progress</span>';
        };

        const getGoalTypeLabel = (type) => {
            const labels = {
                'productivity_score': '🎯 Productivity Score',
                'productivity_time': '⏰ Focus Time',
                'work_sessions': '🌟 Work Sessions',
                'app': '💻 App Specific',
                'category': '📁 Category'
            };
            return labels[type] || type;
        };

        const failedCount = data.goals?.filter(g => g.status === 'failed').length || 0;

        const getStatusColor = (status) => {
            if (status === 'achieved') return '#4ade80';
            if (status === 'failed') return '#ef4444';
            return '#fbbf24';
        };

        // Read CSS and chart renderer files
        const cssPath = path.join(__dirname, 'export.css');
        const cssContent = await fs.readFile(cssPath, 'utf-8');

        // Get insights data for the chart (last 7 days)
        const { getDb } = require('../../services/database');
        const db = getDb();
        const insightsData = await getGoalInsightsData(db, 7);

        // Group goals by type
        const productivityGoals = data.goals?.filter(g =>
            g.type === 'productivity_score' || g.type === 'productivity_time' || g.type === 'work_sessions'
        ) || [];
        const appGoals = data.goals?.filter(g => g.type === 'app') || [];
        const categoryGoals = data.goals?.filter(g => g.type === 'category') || [];

        return `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <style>
            ${cssContent}

            /* Additional goals-specific styles */
            .goal-card {
            background: rgba(27, 40, 56, 0.95);
            padding: 20px;
            border-radius: 4px;
            border-left: 3px solid #66c0f4;
            margin-bottom: 20px;
            page-break-inside: avoid;
            }
            .goal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            }
            .goal-name {
            font-size: 18px;
            font-weight: bold;
            color: #fff;
            }
            .goal-type {
            font-size: 12px;
            color: #8f98a0;
            margin-bottom: 8px;
            }
            .goal-description {
            font-size: 14px;
            color: #c6d4df;
            margin-bottom: 12px;
            font-style: italic;
            }
            .goal-target {
            font-size: 14px;
            color: #c6d4df;
            margin-bottom: 12px;
            }
            .progress-bar {
            background: rgba(0, 0, 0, 0.3);
            height: 10px;
            border-radius: 5px;
            overflow: hidden;
            margin-bottom: 10px;
            }
            .progress-fill {
            background: linear-gradient(90deg, #66c0f4, #4ade80);
            height: 100%;
            transition: width 0.3s ease;
            }
            .progress-fill.failed {
            background: linear-gradient(90deg, #ef4444, #dc2626);
            }
            .progress-fill.achieved {
            background: linear-gradient(90deg, #4ade80, #22c55e);
            }
            .progress-text {
            font-size: 13px;
            color: #c6d4df;
            display: flex;
            justify-content: space-between;
            align-items: center;
            }
            .goal-streak {
            color: #fbbf24;
            font-weight: bold;
            }
            .empty-state {
            text-align: center;
            color: #8f98a0;
            padding: 40px 20px;
            font-style: italic;
            }
        </style>
        </head>
        <body>
        <h1>🎯 Goals Report</h1>
        <div class="date-range">${dateFormatted || date}</div>

        <h2>7-Day Success Rate</h2>
        <div class="chart-container">
            <canvas id="success-rate-chart" width="1000" height="250"></canvas>
        </div>

        <h2>Overview</h2>
        <div class="stats-grid">
            <div class="stat-card">
            <div class="stat-label">Active Goals</div>
            <div class="stat-value">${data.stats?.activeGoals || 0}</div>
            <div class="stat-subtitle">Total goals tracked</div>
            </div>
            <div class="stat-card" style="border-left-color: #4ade80;">
            <div class="stat-label">Achieved Today</div>
            <div class="stat-value" style="color: #4ade80;">${data.stats?.achievedToday || 0}</div>
            <div class="stat-subtitle">Successfully completed</div>
            </div>
            <div class="stat-card" style="border-left-color: #ef4444;">
            <div class="stat-label">Failed</div>
            <div class="stat-value" style="color: #ef4444;">${failedCount}</div>
            <div class="stat-subtitle">Targets not met</div>
            </div>
            <div class="stat-card" style="border-left-color: #fbbf24;">
            <div class="stat-label">Day Streak</div>
            <div class="stat-value" style="color: #fbbf24;">${data.stats?.dayStreak || 0}</div>
            <div class="stat-subtitle">Consecutive days</div>
            </div>
            <div class="stat-card" style="border-left-color: #66c0f4;">
            <div class="stat-label">Success Rate</div>
            <div class="stat-value">${data.stats?.successRate || 0}%</div>
            <div class="stat-subtitle">Overall completion</div>
            </div>
        </div>

        ${productivityGoals.length > 0 ? `
            <h2>Productivity Goals</h2>
            ${productivityGoals.map(goal => `
            <div class="goal-card" style="border-left-color: ${getStatusColor(goal.status)};">
                <div class="goal-header">
                <div class="goal-name">${goal.icon || '🎯'} ${goal.name}</div>
                <div>${getStatusBadge(goal.status)}</div>
                </div>
                <div class="goal-type">${getGoalTypeLabel(goal.type)}</div>
                ${goal.description ? `<div class="goal-description">${goal.description}</div>` : ''}
                <div class="goal-target">
                Target: ${goal.target_value} ${goal.target_unit} (${goal.target_type})
                </div>
                <div class="progress-bar">
                <div class="progress-fill ${goal.status}" style="width: ${Math.min(goal.progress_percentage || 0, 100)}%"></div>
                </div>
                <div class="progress-text">
                <span>${goal.current_value || 0} / ${goal.target_value} ${goal.target_unit} (${goal.progress_percentage || 0}%)</span>
                </div>
            </div>
            `).join('')}
        ` : ''}

        ${appGoals.length > 0 ? `
            <h2>App-Specific Goals</h2>
            ${appGoals.map(goal => `
            <div class="goal-card" style="border-left-color: ${getStatusColor(goal.status)};">
                <div class="goal-header">
                <div class="goal-name">${goal.icon || '💻'} ${goal.name}</div>
                <div>${getStatusBadge(goal.status)}</div>
                </div>
                <div class="goal-type">${getGoalTypeLabel(goal.type)}</div>
                ${goal.description ? `<div class="goal-description">${goal.description}</div>` : ''}
                <div class="goal-target">
                Target: ${goal.target_value} ${goal.target_unit} (${goal.target_type})
                </div>
                <div class="progress-bar">
                <div class="progress-fill ${goal.status}" style="width: ${Math.min(goal.progress_percentage || 0, 100)}%"></div>
                </div>
                <div class="progress-text">
                <span>${goal.current_value || 0} / ${goal.target_value} ${goal.target_unit} (${goal.progress_percentage || 0}%)</span>
                </div>
            </div>
            `).join('')}
        ` : ''}

        ${categoryGoals.length > 0 ? `
            <h2>Category Goals</h2>
            ${categoryGoals.map(goal => `
            <div class="goal-card" style="border-left-color: ${getStatusColor(goal.status)};">
                <div class="goal-header">
                <div class="goal-name">${goal.icon || '📁'} ${goal.name}</div>
                <div>${getStatusBadge(goal.status)}</div>
                </div>
                <div class="goal-type">${getGoalTypeLabel(goal.type)}</div>
                ${goal.description ? `<div class="goal-description">${goal.description}</div>` : ''}
                <div class="goal-target">
                Target: ${goal.target_value} ${goal.target_unit} (${goal.target_type})
                </div>
                <div class="progress-bar">
                <div class="progress-fill ${goal.status}" style="width: ${Math.min(goal.progress_percentage || 0, 100)}%"></div>
                </div>
                <div class="progress-text">
                <span>${goal.current_value || 0} / ${goal.target_value} ${goal.target_unit} (${goal.progress_percentage || 0}%)</span>
                </div>
            </div>
            `).join('')}
        ` : ''}

        ${!data.goals || data.goals.length === 0 ? `
            <div class="empty-state">
            <p>No goals tracked for this date.</p>
            <p>Create goals to track your productivity and progress!</p>
            </div>
        ` : ''}

        <script>
            // Render success rate chart
            function renderSuccessRateChart(data) {
            const canvas = document.getElementById('success-rate-chart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            const padding = { top: 30, right: 20, bottom: 50, left: 60 };
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;
            const maxRate = 100;

            // Clear and draw background
            ctx.fillStyle = '#16202d';
            ctx.fillRect(0, 0, width, height);

            // Draw grid lines
            ctx.strokeStyle = '#1a3548';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = padding.top + (chartHeight / 4) * i;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(width - padding.right, y);
                ctx.stroke();
            }

            // Draw Y-axis labels
            ctx.fillStyle = '#8f98a0';
            ctx.font = '12px "Motiva Sans", Arial';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (let i = 0; i <= 4; i++) {
                const value = maxRate * (1 - i / 4);
                const y = padding.top + (chartHeight / 4) * i;
                ctx.fillText(value + '%', padding.left - 10, y);
            }

            // Calculate points
            const points = data.map((point, index) => {
                const rate = point.successRate !== null && point.total > 0 ? point.successRate : 0;
                return {
                x: padding.left + (chartWidth / (data.length - 1)) * index,
                y: padding.top + chartHeight - (rate / maxRate) * chartHeight,
                successRate: point.successRate,
                date: point.date
                };
            });

            // Draw area gradient
            const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
            gradient.addColorStop(0, 'rgba(102, 192, 244, 0.3)');
            gradient.addColorStop(1, 'rgba(102, 192, 244, 0.05)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(points[0].x, height - padding.bottom);
            points.forEach(point => ctx.lineTo(point.x, point.y));
            ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
            ctx.closePath();
            ctx.fill();

            // Draw line
            ctx.strokeStyle = '#66c0f4';
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            points.forEach(point => ctx.lineTo(point.x, point.y));
            ctx.stroke();

            // Draw points and labels
            points.forEach((point, index) => {
                // Draw point
                ctx.fillStyle = '#66c0f4';
                ctx.beginPath();
                ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#16202d';
                ctx.beginPath();
                ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
                ctx.fill();

                // Draw X-axis label
                const date = new Date(point.date);
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const label = days[date.getDay()] + ' ' + date.getDate();

                ctx.fillStyle = '#8f98a0';
                ctx.font = '11px "Motiva Sans", Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(label, point.x, height - padding.bottom + 10);
            });
            }

            // Render the chart
            const insightsData = ${JSON.stringify(insightsData)};
            renderSuccessRateChart(insightsData);
        </script>
        </body>
        </html>
    `;
    }
}

// Helper function to get goal insights data
async function getGoalInsightsData(db, days = 7) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Helper function to format date consistently
    const getLocalDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayString = getLocalDateString(today);
    const dailySuccessRate = [];

    // Calculate success rate for each of the last N days (including today)
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = getLocalDateString(date);  // Use getLocalDateString consistently
        const dayOfWeek = date.getDay();

        // Get all goals that existed on this date (including active_days info)
        const allGoals = db.prepare(`
      SELECT id, frequency, active_days FROM goals
      WHERE is_active = 1 AND DATE(created_at/1000, 'unixepoch', 'localtime') <= ?
    `).all(dateString);

        if (allGoals.length === 0) {
            dailySuccessRate.push({
                date: dateString,
                successRate: null,
                achieved: 0,
                total: 0
            });
            continue;
        }

        // Filter goals to only include daily goals that are active on this specific day
        const dailyGoals = allGoals.filter(g => {
            if (g.frequency !== 'daily') return false;

            // Check if goal has active_days restriction
            if (g.active_days) {
                const activeDays = g.active_days.split(',').map(d => parseInt(d));
                return activeDays.includes(dayOfWeek);
            }

            return true; // No active_days restriction
        });

        if (dailyGoals.length === 0) {
            dailySuccessRate.push({
                date: dateString,
                successRate: null,
                achieved: 0,
                total: 0
            });
            continue;
        }

        let achieved = 0;
        let total = dailyGoals.length;

        // Special case for today: calculate progress in real-time
        if (dateString === todayString) {
            // Get the goals module to access calculation functions
            const { calculateGoalProgress, determineGoalStatus } = require('./../goals');

            // Get full goal objects with progress
            const goalsWithProgress = dailyGoals.map(goalInfo => {
                const goal = db.prepare(`SELECT * FROM goals WHERE id = ?`).get(goalInfo.id);
                // Use the exported functions from goals module
                const currentValue = calculateGoalProgress(db, goal, dateString);
                const status = determineGoalStatus(goal, currentValue);
                return { ...goal, status };
            });

            achieved = goalsWithProgress.filter(g => g.status === 'achieved').length;
        } else {
            // For past dates: use saved progress
            const progress = db.prepare(`
        SELECT status FROM goal_progress
        WHERE date = ? AND goal_id IN (${dailyGoals.map(() => '?').join(',')})
      `).all(dateString, ...dailyGoals.map(g => g.id));

            achieved = progress.filter(p => p.status === 'achieved').length;
        }

        const successRate = total > 0 ? Math.round((achieved / total) * 100) : 0;

        dailySuccessRate.push({
            date: dateString,
            successRate,
            achieved,
            total
        });
    }

    return dailySuccessRate;
}

module.exports = { initializeGoalsExporter };
