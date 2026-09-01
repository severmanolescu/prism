let appDetails = null;
let currentChartPeriod = 'daily';
let currentPeriod = 'today';
let currentAppId = null;
let currentStartDate = null;
let currentEndDate = null;

// Initialize date range controls
function initializeDateRangeControls() {
  setupDateRangeControls({
    onPeriodChange: (period, startDate, endDate) => {
      currentPeriod = period;
      if (currentAppId) {
        loadAppData(currentAppId, period, startDate, endDate);
      }
    },
    onCustomDateChange: (startDate, endDate) => {
      currentPeriod = 'custom';
      if (currentAppId) {
        loadAppData(currentAppId, 'custom', startDate, endDate);
      }
    }
  });
}

// Helper function to get period display text
function getPeriodDisplayText(period, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  switch(period) {
    case 'today':
      return 'Today';
    case 'week':
      return 'This Week';
    case 'month':
      return 'This Month';
    case 'year':
      return 'This Year';
    case 'all':
      return 'All Time';
    case 'custom':
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (days === 1) {
        return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    default:
      return '';
  }
}

// Load app data for the selected period
async function loadAppData(appId, period, customStartDate, customEndDate) {
  currentAppId = appId;

  let startDate, endDate;

  if (period === 'custom' && customStartDate && customEndDate) {
    startDate = customStartDate;
    endDate = customEndDate;
  } else {
    const range = calculateDateRange(period);
    startDate = range.startDate;
    endDate = range.endDate;
  }

  // Store current date range
  currentStartDate = startDate;
  currentEndDate = endDate;

  // Calculate days for date info
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  // Update date info
  const dateInfo = document.querySelector('.date-info');
  if (dateInfo) {
    dateInfo.textContent = `${days} day${days !== 1 ? 's' : ''} of data available`;
  }

  // Request data from parent window with date range
  window.parent.postMessage({
    type: 'REQUEST_APP_DETAILS',
    appId: appId,
    startDate: startDate,
    endDate: endDate
  }, '*');
}

// Update section headers based on selected period
function updateSectionHeaders() {
  const periodText = getPeriodDisplayText(currentPeriod, currentStartDate, currentEndDate);

  // Update main sections
  const headers = {
    'Activity Timeline': currentPeriod === 'today' ? "Today's Activity Timeline" : `Activity Timeline - ${periodText}`,
    'Recent Sessions': currentPeriod === 'all' ? 'All Sessions' : `Sessions in ${periodText}`,
  };

  // Find and update section headers
  document.querySelectorAll('.section-header').forEach(header => {
    const text = header.textContent.trim();

    // Activity Timeline
    if (text.includes('Activity Timeline')) {
      header.textContent = headers['Activity Timeline'];
    }
    // Recent Sessions
    else if (text.includes('Sessions') && text.includes('Recent')) {
      header.textContent = headers['Recent Sessions'];
    }
  });
}

// Load app details
async function loadAppDetails() {
  if (!appDetails) {
    console.error('No app details available');
    return;
  }

  try {
    const details = appDetails;

    // Update section headers based on period
    updateSectionHeaders();

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

      // Convert hex to RGB for gradient
      const rgb = hexToRgb(categoryColor);

      if (rgb) {
        const gradient = `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8) 0%, rgba(${Math.floor(rgb.r * 0.7)}, ${Math.floor(rgb.g * 0.7)}, ${Math.floor(rgb.b * 0.7)}, 0.9) 100%)`;
        hero.style.background = gradient;
      }
    }

    // Update hero icon
    const heroIcon = document.querySelector('.app-hero-icon');
    if (details.app.icon_path) {
      // Extract just the filename from the path (handles both full paths and relative paths)
      const iconFilename = details.app.icon_path.replace(/^.*[\\\/]/, '').replace('icons/', '');
      heroIcon.innerHTML = `<img src="app-icon://${escapeHtml(iconFilename)}"
        style="width: 120px; height: 120px; object-fit: contain;">`;
    }

    // Get all stat elements once
    const statValues = document.querySelectorAll('.stat-value');
    const { stats, weeklyUsage } = details;

    if (statValues.length === 6){
      // Update quick stats
      statValues[0].textContent = formatTime(stats.totalTime);
      statValues[1].textContent = formatTime(stats.thisWeek);
      statValues[2].textContent = `${stats.streak} days`;
      statValues[3].textContent = stats.sessionCount;
      statValues[4].textContent = stats.firstUsed
        ? new Date(stats.firstUsed).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        : 'Unknown';

      // Find and update peak day
      const peakDay = weeklyUsage.reduce(
        (max, day) => (day.total_duration > (max?.total_duration || 0) ? day : max),
        null
      );
      statValues[5].textContent = peakDay ? formatTime(peakDay.total_duration) : '0m';
    }


    // Update usage chart (now always uses daily view based on date range)
    updateUsageChart(details, 'daily');

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
      updateSessionPatterns(details);
    } catch (error) {
      console.error('Error updating session patterns:', error);
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

// Session Patterns
function updateSessionPatterns(details) {
  const stats = details.stats || {};
  const sessions = details.recentSessions || [];
  const heatmapData = details.heatmapData || [];
  const weeklyUsage = details.weeklyUsage || [];

  // Calculate session frequency (sessions per day)
  const start = new Date(currentStartDate);
  const end = new Date(currentEndDate);
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const activeDays = weeklyUsage.filter(d => d.total_duration > 0).length;
  const frequency = activeDays > 0 ? (stats.sessionCount / activeDays).toFixed(1) : 0;

  // Average session length
  document.getElementById('pattern-avg-length').textContent = formatTime(stats.avgSession || 0);

  // Session frequency
  document.getElementById('pattern-frequency').textContent = `${frequency}/day`;

  // Find longest and shortest sessions
  if (sessions.length > 0) {
    const durations = sessions.map(s => s.duration);
    const longest = Math.max(...durations);
    const shortest = Math.min(...durations);

    document.getElementById('pattern-longest').textContent = formatTime(longest);
    document.getElementById('pattern-shortest').textContent = formatTime(shortest);
  } else {
    document.getElementById('pattern-longest').textContent = '0m';
    document.getElementById('pattern-shortest').textContent = '0m';
  }

  // Most common time (hour with most sessions)
  if (heatmapData.length > 0) {
    const hourCounts = {};
    heatmapData.forEach(item => {
      const hour = item.hour;
      if (!hourCounts[hour]) {
        hourCounts[hour] = 0;
      }
      hourCounts[hour] += item.total_duration || 0;
    });

    const mostCommonHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0][0];

    const nextHour = (parseInt(mostCommonHour) + 1) % 24;
    document.getElementById('pattern-common-time').textContent =
      `${mostCommonHour.toString().padStart(2, '0')}:00-${nextHour.toString().padStart(2, '0')}:00`;
  } else {
    document.getElementById('pattern-common-time').textContent = '--:--';
  }

  // Active days
  document.getElementById('pattern-active-days').textContent =
    `${activeDays} of ${totalDays}`;
}

// Monthly Calendar
function updateMonthlyCalendar(details) {
  const calendar = document.querySelector('.monthly-calendar');
  if (!calendar) {
    console.log('Monthly calendar element not found');
    return;
  }

  const monthlyData = details.monthlyUsage || [];

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
    // Format date in local time (YYYY-MM-DD) to match SQL 'localtime'
    const dateStr = date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
    days.push(dateStr);
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

// =====================
// Productivity Level Handling
// =====================

let currentProductivityLevel = null;
let currentCategoryProductivityLevel = null;

// Helper function to update the dropdown button display
function updateDropdownButton(level, categoryDefault = null) {
  const levelConfig = {
    'productive': { icon: '✅', text: 'Productive' },
    'neutral': { icon: '⚪', text: 'Neutral' },
    'unproductive': { icon: '❌', text: 'Unproductive' },
    'inherit': { icon: '↩️', text: 'Use Category Default' }
  };

  let displayLevel = level;
  let effectiveLevel = level;

  // If level is 'inherit' and we have category default, we can show more info
  if (level === 'inherit' && categoryDefault) {
    // Still show "Use Category Default" but we know what that default is
    currentCategoryProductivityLevel = categoryDefault;
    effectiveLevel = categoryDefault;
  }

  const config = levelConfig[displayLevel];
  if (config) {
    const productivityIcon = document.getElementById('productivity-icon');
    const productivityText = document.getElementById('productivity-text');
    if (productivityIcon) productivityIcon.textContent = config.icon;
    if (productivityText) productivityText.textContent = config.text;
  }

  // Update the productivity stat card
  updateProductivityStatCard(effectiveLevel, level === 'inherit');
}

// Helper function to update the productivity stat card in quick stats
function updateProductivityStatCard(level, isInherited = false) {
  const statCard = document.getElementById('productivity-stat-card');
  const statIcon = document.getElementById('productivity-stat-icon');
  const statValue = document.getElementById('productivity-stat-value');
  const statSubtitle = document.getElementById('productivity-stat-subtitle');

  if (!statCard || !statIcon || !statValue) return;

  const levelConfig = {
    'productive': {
      icon: '✅',
      text: 'Productive',
      class: 'productive'
    },
    'neutral': {
      icon: '⚪',
      text: 'Neutral',
      class: 'neutral'
    },
    'unproductive': {
      icon: '❌',
      text: 'Unproductive',
      class: 'unproductive'
    }
  };

  const config = levelConfig[level] || levelConfig['neutral'];

  // Update icon and text
  statIcon.textContent = config.icon;
  statValue.textContent = config.text;

  // Update subtitle
  if (statSubtitle) {
    if (isInherited) {
      statSubtitle.textContent = `From category default`;
    } else {
      statSubtitle.textContent = `Custom setting`;
    }
  }

  // Remove all productivity classes
  statCard.classList.remove('productive', 'neutral', 'unproductive');

  // Add the appropriate class
  statCard.classList.add(config.class);
}

async function initializeProductivitySelector() {
  if (!appDetails) return;

  const appId = appDetails.app.id;

  try {
    // Get the app's override value
    const hasOverride = appDetails.app.productivity_level_override != null;
    const overrideLevel = appDetails.app.productivity_level_override;

    // Request categories from parent to get category default
    window.parent.postMessage({
      type: 'GET_CATEGORIES'
    }, '*');

    // We'll update the dropdown when we receive the categories response
    // For now, set based on what we know
    if (hasOverride) {
      updateDropdownButton(overrideLevel);
    } else {
      // Will be updated when we get category data
      updateDropdownButton('inherit');
    }

    // Setup click handlers for old inline buttons (if they still exist)
    const buttons = document.querySelectorAll('.productivity-btn-inline');
    buttons.forEach(btn => {
      btn.onclick = async () => {
        const level = btn.dataset.level;
        await setProductivityLevel(level, appId);
      };
    });
  } catch (error) {
    console.error('Error initializing productivity selector:', error);
  }
}

async function setProductivityLevel(level, appId) {
  try {
    // Since we're in an iframe, send message to parent window to handle IPC
    window.parent.postMessage({
      type: 'SET_PRODUCTIVITY_LEVEL',
      appId: appId,
      level: level
    }, '*');

    // Update UI immediately (optimistic update)
    if (level === 'inherit') {
      showInheritedInfo(appDetails.app.category, currentCategoryProductivityLevel);
    } else {
      hideInheritedInfo();
    }

    // Update active state
    const buttons = document.querySelectorAll('.productivity-btn-inline');
    buttons.forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-level="${level}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    currentProductivityLevel = level === 'inherit' ? currentCategoryProductivityLevel : level;
  } catch (error) {
    console.error('Error setting productivity level:', error);
    console.error('Error stack:', error.stack);
  }
}

function showInheritedInfo(category, level) {
  const inheritedInfo = document.getElementById('productivity-inherited-info');
  const inheritedText = document.getElementById('productivity-inherited-text');

  // These elements don't exist in the new dropdown design, so just skip if not found
  if (!inheritedInfo || !inheritedText) {
    console.log('Inherited info elements not found (expected for dropdown design)');
    return;
  }

  const levelNames = {
    'productive': 'Productive',
    'neutral': 'Neutral',
    'unproductive': 'Unproductive'
  };

  inheritedText.textContent = `Using "${category}" default: ${levelNames[level]}`;
  inheritedInfo.style.display = 'block';
}

function hideInheritedInfo() {
  const inheritedInfo = document.getElementById('productivity-inherited-info');

  // Element doesn't exist in the new dropdown design, so just skip if not found
  if (!inheritedInfo) {
    return;
  }

  inheritedInfo.style.display = 'none';
}

// Initialize date range controls on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeDateRangeControls();
});
