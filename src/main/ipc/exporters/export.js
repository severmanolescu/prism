const { ipcMain, dialog, BrowserWindow, app } = require('electron');
const fs = require('fs').promises;
const path = require('path');

function initializeExportHandlers() {
  /**
   * Generate PDF from analytics page
   * Creates a hidden window with full content height and exports to PDF
   */
  ipcMain.handle('export-analytics-pdf', async (event, data) => {
    let pdfWindow = null;

    try {
      const { dateRange } = data;

      // Fetch analytics data using the existing service
      const { getAnalyticsData } = require('../../services/data-access');
      const analyticsData = await getAnalyticsData(dateRange.start, dateRange.end);

      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Save Analytics Report as PDF',
        defaultPath: `analytics_${dateRange.start}_to_${dateRange.end}.pdf`,
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
      const htmlContent = await generateAnalyticsHTML(analyticsData, dateRange);
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

  // Helper function to generate HTML for PDF
  async function generateAnalyticsHTML(data, dateRange) {
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

    // Calculate additional stats
    const totalTime = data.overallStats.totalTime;
    const dailyAverage = totalTime / Math.max(1, data.overallStats.dayCount || 1);
    const avgSessionLength = totalTime / Math.max(1, data.overallStats.totalSessions);

    // Build category color map from the data
    const categoryColors = {};
    data.categoryBreakdown.forEach(cat => {
      if (cat.color) {
        categoryColors[cat.category] = cat.color;
      }
    });

    // Default color for categories without a color
    const defaultCategoryColor = '#66c0f4';

    // Build app category color map
    const appCategoryColors = {};
    data.topApps.forEach(app => {
      if (app.category && categoryColors[app.category]) {
        appCategoryColors[app.name] = categoryColors[app.category];
      }
    });

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
        <h1>📊 Analytics Report</h1>
        <div class="date-range">${dateRange.start} to ${dateRange.end}</div>

        <h2>Daily Usage</h2>
        <div class="chart-container">
          <canvas id="daily-chart" width="1000" height="300"></canvas>
        </div>

        <h2>Overview</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Time</div>
            <div class="stat-value">${formatTime(totalTime)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Daily Average</div>
            <div class="stat-value">${formatTime(dailyAverage)}</div>
            <div class="stat-subtitle">Across ${data.dateRange?.days || data.overallStats.dayCount || 1} days</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Unique Apps</div>
            <div class="stat-value">${data.overallStats.uniqueApps}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Sessions</div>
            <div class="stat-value">${data.overallStats.totalSessions}</div>
            <div class="stat-subtitle">Avg. ${Math.floor((data.overallStats.avgSessionDuration || avgSessionLength) / 60000)} min</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Most Active</div>
            <div class="stat-value">${data.mostActiveDay ? formatTime(data.mostActiveDay.total_time) : '0h 0m'}</div>
            <div class="stat-subtitle">${data.mostActiveDay?.date || 'Never'}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Least Active</div>
            <div class="stat-value">${data.leastActiveDay ? formatTime(data.leastActiveDay.total_time) : '0h 0m'}</div>
            <div class="stat-subtitle">${data.leastActiveDay?.date || 'Never'}</div>
          </div>
        </div>

        <h2>All Applications</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>Application</th>
              <th style="width: 120px;">Category</th>
              <th style="width: 120px;">Time</th>
              <th style="width: 100px;">Sessions</th>
              <th style="width: 100px;">Avg. Session</th>
            </tr>
          </thead>
          <tbody>
            ${data.topApps.slice(0, 200).map((app, i) => {
              const avgSession = app.total_time / Math.max(1, app.session_count || 1);
              const categoryColor = categoryColors[app.category] || defaultCategoryColor;
              return `
              <tr style="border-left: 3px solid ${categoryColor};">
                <td>${i + 1}</td>
                <td>${app.name}</td>
                <td><span style="color: ${categoryColor};">${app.category || 'Uncategorized'}</span></td>
                <td>${formatTime(app.total_time)}</td>
                <td>${app.session_count || 0}</td>
                <td>${Math.round(avgSession / 60000)} min</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <h2>Category Breakdown</h2>
        <div class="category-grid">
          ${data.categoryBreakdown.map(cat => {
            const percentage = ((cat.total_time / totalTime) * 100).toFixed(1);
            const color = cat.color || defaultCategoryColor;
            return `
            <div class="category-item" style="border-left-color: ${color};">
              <div class="category-name">${cat.category}</div>
              <div class="category-time">${formatTime(cat.total_time)}</div>
              <div class="category-apps">${cat.app_count} apps • ${percentage}% of total</div>
            </div>
            `;
          }).join('')}
        </div>

        <script>
          ${chartRendererScript}

          // Render chart when page loads
          const dailyBreakdown = ${JSON.stringify(data.dailyBreakdown || [])};
          renderDailyChart(dailyBreakdown);
        </script>
      </body>
      </html>
    `;
  }

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
                ${goal.streak_days > 0 ? `<span class="goal-streak">🔥 ${goal.streak_days} day streak</span>` : ''}
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
                ${goal.streak_days > 0 ? `<span class="goal-streak">🔥 ${goal.streak_days} day streak</span>` : ''}
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
                ${goal.streak_days > 0 ? `<span class="goal-streak">🔥 ${goal.streak_days} day streak</span>` : ''}
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

  const dailySuccessRate = [];

  // Calculate success rate for each of the last N days
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    // Get goals that existed on this date
    const goals = db.prepare(`
      SELECT id, frequency FROM goals
      WHERE is_active = 1 AND DATE(created_at/1000, 'unixepoch', 'localtime') <= ?
    `).all(dateString);

    if (goals.length === 0) {
      dailySuccessRate.push({
        date: dateString,
        successRate: null,
        achieved: 0,
        total: 0
      });
      continue;
    }

    // Get progress for daily goals on this date
    const dailyGoals = goals.filter(g => g.frequency === 'daily');

    if (dailyGoals.length === 0) {
      dailySuccessRate.push({
        date: dateString,
        successRate: null,
        achieved: 0,
        total: 0
      });
      continue;
    }

    const progress = db.prepare(`
      SELECT status FROM goal_progress
      WHERE date = ? AND goal_id IN (${dailyGoals.map(() => '?').join(',')})
    `).all(dateString, ...dailyGoals.map(g => g.id));

    const achieved = progress.filter(p => p.status === 'achieved').length;
    const total = dailyGoals.length;
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

module.exports = { initializeExportHandlers };
