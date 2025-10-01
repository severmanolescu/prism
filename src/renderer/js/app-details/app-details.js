let appDetails = null;
let currentChartPeriod = 'daily';

// Load app details
async function loadAppDetails() {
  if (!appDetails) {
    console.error('No app details available');
    return;
  }

  try {
    const details = appDetails;

    // Update title and category
    document.querySelector('.app-title').textContent = details.app.name;
    document.querySelector('.app-category').textContent =
      `${details.app.category} • Last used ${getRelativeTime(details.app.last_used)}`;

    // Update favorite button text based on current state
    // This will be checked via parent window
    window.parent.postMessage({
      type: 'CHECK_FAVORITE',
      appId: details.app.id
    }, '*');

    // Update hero background with category color (passed from parent window)
    const hero = document.querySelector('.app-hero');
    if (hero) {
      const categoryColor = details.categoryColor || '#092442';
      console.log('Category color from parent:', categoryColor);

      // Convert hex to RGB for gradient
      const rgb = hexToRgb(categoryColor);
      console.log('RGB values:', rgb);

      if (rgb) {
        const gradient = `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8) 0%, rgba(${Math.floor(rgb.r * 0.7)}, ${Math.floor(rgb.g * 0.7)}, ${Math.floor(rgb.b * 0.7)}, 0.9) 100%)`;
        console.log('Setting gradient:', gradient);
        hero.style.background = gradient;
      }
    }

    // Update hero icon
    const heroIcon = document.querySelector('.app-hero-icon');
    if (details.app.icon_path) {
      heroIcon.innerHTML = `<img src="app-icon://${details.app.icon_path.replace('icons/', '')}"
        style="width: 120px; height: 120px; object-fit: contain;">`;
    }

    // Update quick stats
    document.querySelectorAll('.quick-stat-value')[0].textContent = formatTime(details.stats.totalTime);
    document.querySelectorAll('.quick-stat-value')[1].textContent = formatTime(details.stats.thisWeek);
    document.querySelectorAll('.quick-stat-value')[2].textContent = `${details.stats.streak} days`;
    document.querySelectorAll('.quick-stat-value')[3].textContent = details.stats.sessionCount;
    document.querySelectorAll('.quick-stat-value')[4].textContent =
      details.stats.firstUsed ? new Date(details.stats.firstUsed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown';

    // Find peak day from weekly usage
    const peakDay = details.weeklyUsage.reduce((max, day) =>
      day.total_duration > (max?.total_duration || 0) ? day : max, null);
    document.querySelectorAll('.quick-stat-value')[5].textContent =
      peakDay ? formatTime(peakDay.total_duration) : '0m';

    // Update usage chart
    updateUsageChart(details, currentChartPeriod);

    // Setup chart tab listeners
    setupChartTabs(details);

    // Update time distribution
    updateTimeDistribution(details.stats);

    // Update today's timeline
    updateTodayTimeline(details.todayActivity);

    // Update recent sessions
    updateRecentSessions(details.recentSessions);

    // Update milestones
    updateMilestones(details);

    // Update all sections with error handling
    try {
      updateUsageTrends(details);
    } catch (error) {
      console.error('Error updating usage trends:', error);
    }

    try {
      updateUsageInsights(details);
    } catch (error) {
      console.error('Error updating usage insights:', error);
    }

    try {
      updateMonthlyCalendar(details);
    } catch (error) {
      console.error('Error updating monthly calendar:', error);
    }

    try {
      updateDayOfWeekChart(details);
    } catch (error) {
      console.error('Error updating day of week chart:', error);
    }

    try {
      updateSessionDurationChart(details);
    } catch (error) {
      console.error('Error updating session duration chart:', error);
    }

    try {
      updateHeatmap(details);
    } catch (error) {
      console.error('Error updating heatmap:', error);
    }

  } catch (error) {
    console.error('Error loading app details:', error);
  }
}

function updateTimeDistribution(stats) {
  const today = stats.thisWeek / 7;
  const thisWeek = stats.thisWeek;
  const thisMonth = stats.totalTime * 0.4;
  const allTime = stats.totalTime;

  const maxTime = allTime || 1;

  const bars = document.querySelectorAll('.distribution-bar');
  const values = document.querySelectorAll('.distribution-value');

  if (bars[0]) bars[0].style.width = `${(today / maxTime) * 100}%`;
  if (bars[1]) bars[1].style.width = `${(thisWeek / maxTime) * 100}%`;
  if (bars[2]) bars[2].style.width = `${(thisMonth / maxTime) * 100}%`;
  if (bars[3]) bars[3].style.width = '100%';

  if (values[0]) values[0].textContent = formatTime(today);
  if (values[1]) values[1].textContent = formatTime(thisWeek);
  if (values[2]) values[2].textContent = formatTime(thisMonth);
  if (values[3]) values[3].textContent = formatTime(allTime);
}

function updateTodayTimeline(hourlyData) {
  const timelineGrid = document.querySelector('.timeline-grid');
  if (!timelineGrid) return;

  const maxDuration = Math.max(...hourlyData.map(h => h.total_duration), 1);

  // Clear and rebuild timeline
  timelineGrid.innerHTML = '';

  // Create 24 cells for each hour of the day
  for (let hour = 0; hour < 24; hour++) {
    const hourData = hourlyData.find(h => h.hour === hour);
    const duration = hourData?.total_duration || 0;
    const opacity = duration > 0 ? 0.2 + (duration / maxDuration) * 0.8 : 0.1;

    const cell = document.createElement('div');
    cell.className = 'timeline-cell';
    cell.style.background = `rgba(102, 192, 244, ${opacity})`;
    if (duration > 0) {
      cell.title = `${hour}:00 - ${formatTime(duration)}`;
    }
    timelineGrid.appendChild(cell);
  }
}

function updateRecentSessions(sessions) {
  const sessionsList = document.querySelector('.sessions-list');
  if (!sessionsList || !sessions || sessions.length === 0) {
    if (sessionsList) {
      sessionsList.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 20px;">No recent sessions</div>';
    }
    return;
  }

  sessionsList.innerHTML = sessions.map(session => `
    <div class="session-item">
      <div>
        <div class="session-date">${formatDate(session.start_time)}, ${new Date(session.start_time).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</div>
        <div class="session-time">${formatTimeRange(session.start_time, session.end_time)}</div>
      </div>
      <div class="session-duration">${formatTime(session.duration)}</div>
    </div>
  `).join('');
}

// Usage Trends
function updateUsageTrends(details) {
  const trendStats = document.querySelectorAll('.trend-stat');
  if (trendStats.length < 4) return;

  const stats = details.stats || {};
  const thisWeek = stats.thisWeek || 0;
  const lastWeek = stats.lastWeek || 0;

  const weeklyChange = lastWeek > 0
    ? ((thisWeek - lastWeek) / lastWeek) * 100
    : (thisWeek > 0 ? 100 : 0);

  // This Week
  trendStats[0].querySelector('.trend-value').textContent = formatTime(thisWeek);
  const changeEl = trendStats[0].querySelector('.trend-change');
  changeEl.textContent = `${weeklyChange >= 0 ? '+' : ''}${Math.round(weeklyChange)}%`;
  changeEl.className = `trend-change ${weeklyChange >= 0 ? 'positive' : 'negative'}`;

  // Last Week
  trendStats[1].querySelector('.trend-value').textContent = formatTime(lastWeek);
  trendStats[1].querySelector('.trend-change').textContent = 'previous';

  // Category Rank
  const categoryRank = stats.categoryRank || 1;
  const totalInCategory = stats.totalInCategory || 1;
  trendStats[2].querySelector('.trend-value').textContent = `#${categoryRank}`;
  trendStats[2].querySelector('.trend-change').textContent = `of ${totalInCategory}`;

  // Total Usage %
  const usagePercent = stats.usagePercentage || 0;
  trendStats[3].querySelector('.trend-value').textContent = `${usagePercent.toFixed(1)}%`;
  trendStats[3].querySelector('.trend-change').textContent = 'of all apps';
}

// Monthly Calendar
function updateMonthlyCalendar(details) {
  const calendar = document.querySelector('.monthly-calendar');
  if (!calendar) {
    console.log('Monthly calendar element not found');
    return;
  }

  const monthlyData = details.monthlyUsage || [];
  console.log('Monthly data:', monthlyData);
  console.log('Monthly data type:', typeof monthlyData);
  console.log('Is array:', Array.isArray(monthlyData));

  if (!monthlyData || monthlyData.length === 0) {
    calendar.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 20px; grid-column: 1 / -1;">No data available for the last 30 days</div>';
    return;
  }

  const maxDuration = Math.max(...monthlyData.map(d => d.total_duration || 0), 1);

  // Get last 30 days
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split('T')[0]);
  }

  // Build HTML array
  let html = [];

  // Add day labels first
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayLabels.forEach(label => {
    html.push(`<div class="calendar-day-label">${label}</div>`);
  });

  // Add empty cells for alignment to start on correct day
  const firstDay = new Date(days[0]).getDay();
  for (let i = 0; i < firstDay; i++) {
    html.push('<div class="calendar-day empty"></div>');
  }

  // Add calendar days
  days.forEach(date => {
    const dayData = monthlyData.find(d => d.date === date);
    const duration = dayData?.total_duration || 0;
    const intensity = duration > 0 ? 0.2 + (duration / maxDuration) * 0.8 : 0.05;
    const day = new Date(date).getDate();

    html.push(`
      <div class="calendar-day"
           style="background: rgba(102, 192, 244, ${intensity});"
           title="${date}: ${formatTime(duration)}">
        ${day}
      </div>
    `);
  });

  calendar.innerHTML = html.join('');
}
