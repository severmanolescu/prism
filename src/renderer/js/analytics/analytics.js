let topAppsListCount = 8;

function setupDateRangeControls() {
  const tabs = document.querySelectorAll('.time-range-btn');
  const dateInputs = document.querySelectorAll('.custom-date-picker input[type="date"]');

  tabs.forEach((tab, index) => {
    // Set data-period based on button text
    const periods = ['today', 'week', 'month', 'year', 'alltime'];
    tab.dataset.period = periods[index];

    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      // Add active class to clicked tab
      tab.classList.add('active');
      // Update the analytics view based on selected period
      currentPeriod = tab.dataset.period;

      // Update custom date inputs based on selected period
      updateCustomDatesForPeriod(tab.dataset.period, dateInputs);

      loadAnalyticsData(currentPeriod);
    });
  });

  // Setup custom date picker
  dateInputs.forEach(input => {
    input.addEventListener('change', () => {
      // When custom dates are changed, deactivate all buttons
      tabs.forEach(t => t.classList.remove('active'));

      // Load data for custom range
      const startDate = dateInputs[0].value;
      const endDate = dateInputs[1].value;
      if (startDate && endDate) {
        currentPeriod = 'custom';
        loadAnalyticsData('custom', startDate, endDate);
      }
    });
  });
}

// Update custom date inputs based on the selected period
function updateCustomDatesForPeriod(period, dateInputs) {
  const today = new Date();
  let startDate, endDate;

  switch(period) {
    case 'today':
      startDate = endDate = today;
      break;
    case 'week':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      endDate = today;
      break;
    case 'month':
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 1);
      endDate = today;
      break;
    case 'year':
      startDate = new Date(today);
      startDate.setFullYear(today.getFullYear() - 1);
      endDate = today;
      break;
    case 'alltime':
      // Set to earliest possible date in your app
      startDate = new Date(2020, 0, 1); // Jan 1, 2020
      endDate = today;
      break;
  }

  // Format dates as YYYY-MM-DD for input fields
  if (dateInputs[0]) dateInputs[0].value = formatDateForInput(startDate);
  if (dateInputs[1]) dateInputs[1].value = formatDateForInput(endDate);
}

// Helper function to format date for input fields
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Listen for data from parent window
window.addEventListener('message', (event) => {
  if (event.data.type === 'ANALYTICS_DATA_RESPONSE') {
    // Received analytics data from parent window
    console.log('Received analytics data:', event.data.data);
    updateAnalyticsUI(event.data.data);
  }
});

let currentPeriod = 'today';

// Calculate date range based on period
function calculateDateRange(period) {
  const today = new Date();
  let startDate, endDate;

  switch(period) {
    case 'today':
      startDate = endDate = today;
      break;
    case 'week':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      endDate = today;
      break;
    case 'month':
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 1);
      endDate = today;
      break;
    case 'year':
      startDate = new Date(today);
      startDate.setFullYear(today.getFullYear() - 1);
      endDate = today;
      break;
    case 'alltime':
      startDate = new Date(2020, 0, 1); // Jan 1, 2020
      endDate = today;
      break;
  }

  return { startDate, endDate };
}

// Load analytics data for the selected period
async function loadAnalyticsData(period, customStartDate, customEndDate) {
  try {
    let startDate, endDate;

    if (period === 'custom' && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      const range = calculateDateRange(period);
      startDate = formatDateForInput(range.startDate);
      endDate = formatDateForInput(range.endDate);
    }

    console.log('Loading analytics for:', startDate, 'to', endDate);

    // Request data from parent window (main renderer process)
    window.parent.postMessage({
      type: 'REQUEST_ANALYTICS_DATA',
      startDate: startDate,
      endDate: endDate
    }, '*');
  } catch (error) {
    console.error('Error loading analytics data:', error);
  }
}

// Update the UI with analytics data
function updateAnalyticsUI(data) {
  // Update stats cards
  updateStatsCards(data);
  // Update daily usage chart
  updateDailyUsageChart(data.dailyBreakdown);
  // Update top apps list
  updateTopAppsList(data.topApps);
  // Update category breakdown
  updateCategoryBreakdown(data.categoryBreakdown);
  // Update date info
  updateDateInfo(data.dateRange);
}

function updateStatsCards(data) {
  const { overallStats, mostActiveDay, leastActiveDay, dateRange } = data;

  // Total Time
  document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = formatTime(overallStats.totalTime);

  // Daily Average
  const dailyAvg = overallStats.totalTime / dateRange.days;
  document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = formatTime(dailyAvg);
  document.querySelector('.stat-card:nth-child(2) .stat-subtitle').textContent = `Across ${dateRange.days} days`;

  // Unique Apps
  document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = overallStats.uniqueApps;

  // Total Sessions
  document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = overallStats.totalSessions;
  const avgSessionTime = overallStats.avgSessionDuration || 0;
  document.querySelector('.stat-card:nth-child(4) .stat-subtitle').textContent =
    `Avg. ${Math.floor(avgSessionTime / (1000 * 60))} min`;

  // Most Active Day
  if (mostActiveDay) {
    document.querySelector('.stat-card:nth-child(5) .stat-value').textContent = formatTime(mostActiveDay.total_time);
    document.querySelector('.stat-card:nth-child(5) .stat-subtitle').textContent = mostActiveDay.date;
  }

  // Least Active Day
  if (leastActiveDay) {
    document.querySelector('.stat-card:nth-child(6) .stat-value').textContent = formatTime(leastActiveDay.total_time);
    document.querySelector('.stat-card:nth-child(6) .stat-subtitle').textContent = leastActiveDay.date;
  }
}

// Render a single-day chart using Canvas
function renderSingleDayCanvasChart(ctx, canvas, dayData) {
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#16202d';
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 40, right: 50, bottom: 60, left: 50 };
    const barWidth = 100;
    const centerX = width / 2;

    // Calculate bar height (max 70% of available height)
    const maxBarHeight = height - padding.top - padding.bottom;
    const barHeight = maxBarHeight * 0.7;
    const barY = padding.top + (maxBarHeight - barHeight);

    // Create gradient for bar
    const gradient = ctx.createLinearGradient(centerX, barY, centerX, barY + barHeight);
    gradient.addColorStop(0, '#66c0f4');
    gradient.addColorStop(1, '#417a9b');

    // Draw the bar
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(centerX - barWidth / 2, barY, barWidth, barHeight, 4);
    ctx.fill();

    // Draw top cap
    ctx.fillStyle = '#66c0f4';
    ctx.beginPath();
    ctx.roundRect(centerX - barWidth / 2, barY - 3, barWidth, 6, 3);
    ctx.fill();

    // Value label on top
    ctx.fillStyle = '#66c0f4';
    ctx.font = 'bold 24px "Motiva Sans", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(formatTime(dayData.total_time), centerX, barY - 20);

    // Date label at bottom
    const date = new Date(dayData.date);
    ctx.fillStyle = '#8f98a0';
    ctx.font = '14px "Motiva Sans", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }), centerX, height - padding.bottom + 10);

    // Session count label
    ctx.fillStyle = '#66c0f4';
    ctx.font = '12px "Motiva Sans", Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${dayData.session_count || 0} sessions`, centerX, height - padding.bottom + 30);

    // Remove any existing event listeners
    canvas.onmousemove = null;
    canvas.onmouseleave = null;
}

function updateDailyUsageChart(dailyBreakdown) {
    console.log('Daily breakdown:', dailyBreakdown);
    const canvas = document.getElementById('daily-usage-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Check if we have data
    if (!dailyBreakdown || dailyBreakdown.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#16202d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#8f98a0';
        ctx.font = '14px "Motiva Sans", Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No data available for this period', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Special handling for single day
    if (dailyBreakdown.length === 1) {
        renderSingleDayCanvasChart(ctx, canvas, dailyBreakdown[0]);
        return;
    }

    // Prepare data points
    const dataPoints = dailyBreakdown.map(item => ({
        date: item.date,
        duration: item.total_time || 0,
        label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));

    const maxDuration = Math.max(...dataPoints.map(d => d.duration), 1);

    // Canvas dimensions
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 20, bottom: 40, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#16202d';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#1a3548';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
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
    for (let i = 0; i <= 5; i++) {
        const value = maxDuration * (1 - i / 5);
        const y = padding.top + (chartHeight / 5) * i;
        ctx.fillText(formatTime(value), padding.left - 10, y);
    }

    // Calculate points for the line and area
    const points = dataPoints.map((point, index) => ({
        x: padding.left + (chartWidth / (dataPoints.length - 1)) * index,
        y: padding.top + chartHeight - (point.duration / maxDuration) * chartHeight,
        duration: point.duration,
        label: point.label
    }));

    // Draw area under the line (gradient)
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

    // Draw the line
    ctx.strokeStyle = '#66c0f4';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.stroke();

    // Draw points
    points.forEach((point) => {
        // Draw point with ring
        ctx.fillStyle = '#66c0f4';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
        ctx.fill();

        // Draw inner dot
        ctx.fillStyle = '#16202d';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw X-axis label
        ctx.fillStyle = '#8f98a0';
        ctx.font = '11px "Motiva Sans", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(point.label, point.x, height - padding.bottom + 10);
    });

    // Add hover interaction
    let hoveredPoint = null;

    canvas.style.cursor = 'default';
    canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        // Find closest point
        let closestPoint = null;
        let minDist = Infinity;
        points.forEach(point => {
            const dist = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));
            if (dist < minDist && dist < 40) {
                minDist = dist;
                closestPoint = point;
            }
        });

        // Only redraw if hover state changed
        if (hoveredPoint !== closestPoint) {
            hoveredPoint = closestPoint;
            canvas.style.cursor = closestPoint ? 'pointer' : 'default';
            redrawChartWithHover(ctx, width, height, padding, chartWidth, chartHeight, dataPoints, maxDuration, points, closestPoint, gradient);
        }
    };

    canvas.onmouseleave = () => {
        if (hoveredPoint) {
            hoveredPoint = null;
            canvas.style.cursor = 'default';
            // Redraw without hover state
            drawChartWithoutHover(ctx, width, height, padding, chartWidth, chartHeight, dataPoints, maxDuration, points, gradient);
        }
    };
}

function drawChartWithoutHover(ctx, width, height, padding, chartWidth, chartHeight, dataPoints, maxDuration, points, gradient) {
    // Clear and redraw everything
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#16202d';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#1a3548';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
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
    for (let i = 0; i <= 5; i++) {
        const value = maxDuration * (1 - i / 5);
        const y = padding.top + (chartHeight / 5) * i;
        ctx.fillText(formatTime(value), padding.left - 10, y);
    }

    // Draw area under the line
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding.bottom);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Draw the line
    ctx.strokeStyle = '#66c0f4';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.stroke();

    // Draw points
    points.forEach((point) => {
        // Draw point with ring
        ctx.fillStyle = '#66c0f4';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
        ctx.fill();

        // Draw inner dot
        ctx.fillStyle = '#16202d';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw X-axis label
        ctx.fillStyle = '#8f98a0';
        ctx.font = '11px "Motiva Sans", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(point.label, point.x, height - padding.bottom + 10);
    });
}

function redrawChartWithHover(ctx, width, height, padding, chartWidth, chartHeight, dataPoints, maxDuration, points, closestPoint, gradient) {
    // Clear and redraw everything
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#16202d';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#1a3548';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
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
    for (let i = 0; i <= 5; i++) {
        const value = maxDuration * (1 - i / 5);
        const y = padding.top + (chartHeight / 5) * i;
        ctx.fillText(formatTime(value), padding.left - 10, y);
    }

    // Draw area under the line
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding.bottom);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Draw vertical line to hovered point
    if (closestPoint) {
        ctx.strokeStyle = 'rgba(102, 192, 244, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(closestPoint.x, padding.top);
        ctx.lineTo(closestPoint.x, height - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw the line
    ctx.strokeStyle = '#66c0f4';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.stroke();

    // Draw points
    points.forEach((point) => {
        const isHovered = point === closestPoint;
        const radius = isHovered ? 9 : 7;

        // Outer circle
        ctx.fillStyle = isHovered ? '#ffffff' : '#66c0f4';
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner dot
        ctx.fillStyle = isHovered ? '#66c0f4' : '#16202d';
        ctx.beginPath();
        ctx.arc(point.x, point.y, isHovered ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw X-axis label (highlight if hovered)
        ctx.fillStyle = isHovered ? '#ffffff' : '#8f98a0';
        ctx.font = isHovered ? 'bold 12px "Motiva Sans", Arial' : '11px "Motiva Sans", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(point.label, point.x, height - padding.bottom + 10);
    });

    // Draw tooltip if hovering over a point
    if (closestPoint) {
        const tooltipText = formatTime(closestPoint.duration);
        ctx.font = 'bold 14px "Motiva Sans", Arial';
        const tooltipWidth = ctx.measureText(tooltipText).width + 24;
        const tooltipHeight = 36;
        const tooltipPadding = 12;
        let tooltipX = closestPoint.x - tooltipWidth / 2;
        let tooltipY = closestPoint.y - tooltipHeight - tooltipPadding;

        // Keep tooltip in bounds
        if (tooltipX < padding.left) tooltipX = padding.left;
        if (tooltipX + tooltipWidth > width - padding.right) tooltipX = width - padding.right - tooltipWidth;
        if (tooltipY < padding.top) tooltipY = closestPoint.y + tooltipPadding;

        // Draw tooltip shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.roundRect(tooltipX + 2, tooltipY + 2, tooltipWidth, tooltipHeight, 6);
        ctx.fill();

        // Draw tooltip background
        ctx.fillStyle = 'rgba(17, 37, 52, 0.98)';
        ctx.strokeStyle = '#66c0f4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 6);
        ctx.fill();
        ctx.stroke();

        // Draw tooltip text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tooltipText, tooltipX + tooltipWidth / 2, tooltipY + tooltipHeight / 2);
    }
}

function updateTopAppsList(topApps) {
    const top_apps_list = document.querySelector('.top-apps-list');
    if (!top_apps_list) return;

    // Clear the list
    top_apps_list.innerHTML = '';

    // Check if we have apps
    if (!topApps || topApps.length === 0) {
        top_apps_list.innerHTML = '<div class="app-row">No apps found for this period</div>';
        return;
    }

    // Only show up to 6 apps or however many we have
    const appsToShow = Math.min(topApps.length, topAppsListCount);

    for (let i = 0; i < appsToShow; i++) {
        const app = topApps[i];
        top_apps_list.innerHTML += `
        <div class="app-row">
            <div class="app-rank">${i + 1}</div>
            <div class="app-info">
                <div class="app-name">${app.name}</div>
            </div>
            <div class="app-time">${formatTime(app.total_time)}</div>
        </div>
        `;
    }
}

function updateCategoryBreakdown(categoryBreakdown) {
  // TODO: Update category breakdown with real data
  console.log('Category breakdown:', categoryBreakdown);
}

function updateDateInfo(dateRange) {
  const dateInfo = document.querySelector('.date-info');
  if (dateInfo) {
    dateInfo.textContent = `${dateRange.days} days of data available`;
  }
}

// Initialize analytics
function initAnalytics() {
  setupDateRangeControls();
  // Load default period (today)
  loadAnalyticsData(currentPeriod);
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initAnalytics);
