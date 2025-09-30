let appDetails = null;

// Listen for data from parent window
window.addEventListener('message', (event) => {
  if (event.data.type === 'APP_DETAILS') {
    appDetails = event.data.data;
    loadAppDetails();
  } else if (event.data.type === 'FAVORITE_UPDATED') {
    // Update favorite button text
    const favoriteBtn = document.getElementById('favorite-btn');
    if (favoriteBtn) {
      const btnText = favoriteBtn.querySelector('span:last-child');
      if (btnText) {
        btnText.textContent = event.data.isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
      }
    }
  }
});

// Format time helper
function formatTime(milliseconds) {
  if (!milliseconds || milliseconds === 0) {
    return '0s';  // Changed from '0m' to '0s'
  }

  // Convert milliseconds to seconds
  const totalSeconds = Math.floor(milliseconds / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';

  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function formatTimeRange(start, end) {
  const startTime = new Date(start).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const endTime = end ? new Date(end).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) : 'ongoing';
  return `${startTime} - ${endTime}`;
}

function getRelativeTime(timestamp) {
  if (!timestamp) return 'Unknown';

  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}

// Load app details
async function loadAppDetails() {
  if (!appDetails) {
    console.error('No app details available');
    return;
  }

  try {
    const details = appDetails;
    console.log('Loading app details:', details);

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

    // Update weekly chart
    updateWeeklyChart(details.weeklyUsage);

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

function updateWeeklyChart(weeklyData) {
  const chartContainer = document.querySelector('.usage-chart');
  if (!chartContainer) return;

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get last 7 days
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    last7Days.push(date.toISOString().split('T')[0]);
  }

  const maxDuration = Math.max(...weeklyData.map(d => d.total_duration), 1);

  // Clear and rebuild chart
  chartContainer.innerHTML = '';

  last7Days.forEach((date, index) => {
    const dayData = weeklyData.find(d => d.date === date);
    const duration = dayData?.total_duration || 0;
    const height = (duration / maxDuration) * 100;
    const dayDate = new Date(date);

    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${Math.max(height, 5)}%`;
    bar.innerHTML = `
      <span class="chart-bar-value">${formatTime(duration)}</span>
      <span class="chart-bar-label">${days[dayDate.getDay()]} ${dayDate.getDate()}</span>
    `;
    chartContainer.appendChild(bar);
  });
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

function updateMilestones(details) {
  const milestonesGrid = document.querySelector('.milestones-grid');
  if (!milestonesGrid) return;

  const stats = details.stats;
  const milestones = [];

  // Convert totalTime to hours
  const totalHours = Math.floor(stats.totalTime / (1000 * 60 * 60));
  const totalMinutes = Math.floor(stats.totalTime / (1000 * 60));

  // Time-based milestones
  if (totalHours >= 1000) {
    milestones.push({
      icon: '🏆',
      title: '1000+ Hours',
      value: 'Legendary',
      priority: 1
    });
  } else if (totalHours >= 500) {
    milestones.push({
      icon: '🏆',
      title: '500+ Hours',
      value: 'Master',
      priority: 2
    });
  } else if (totalHours >= 100) {
    milestones.push({
      icon: '🏆',
      title: '100+ Hours',
      value: 'Achieved',
      priority: 3
    });
  } else if (totalHours >= 50) {
    milestones.push({
      icon: '🏆',
      title: 'First 50 Hours',
      value: 'Achieved',
      priority: 4
    });
  } else if (totalHours >= 10) {
    milestones.push({
      icon: '🏆',
      title: 'First 10 Hours',
      value: 'Achieved',
      priority: 5
    });
  } else if (totalMinutes >= 60) {
    milestones.push({
      icon: '⏱️',
      title: 'First Hour',
      value: 'Achieved',
      priority: 6
    });
  }

  // Streak milestone
  if (stats.streak >= 30) {
    milestones.push({
      icon: '🔥',
      title: `${stats.streak} Day Streak`,
      value: 'Unstoppable!',
      priority: 1
    });
  } else if (stats.streak >= 7) {
    milestones.push({
      icon: '🔥',
      title: `${stats.streak} Day Streak`,
      value: 'On Fire!',
      priority: 3
    });
  } else if (stats.streak >= 3) {
    milestones.push({
      icon: '🔥',
      title: `${stats.streak} Day Streak`,
      value: 'Active',
      priority: 5
    });
  } else if (stats.streak > 0) {
    milestones.push({
      icon: '📅',
      title: `${stats.streak} Day${stats.streak > 1 ? 's' : ''}`,
      value: 'Started',
      priority: 6
    });
  }

  // Session count milestone
  if (stats.sessionCount >= 1000) {
    milestones.push({
      icon: '📊',
      title: '1000+ Sessions',
      value: 'Veteran',
      priority: 2
    });
  } else if (stats.sessionCount >= 500) {
    milestones.push({
      icon: '📊',
      title: '500+ Sessions',
      value: 'Experienced',
      priority: 3
    });
  } else if (stats.sessionCount >= 100) {
    milestones.push({
      icon: '📊',
      title: '100+ Sessions',
      value: 'Regular',
      priority: 4
    });
  } else if (stats.sessionCount >= 50) {
    milestones.push({
      icon: '📊',
      title: '50+ Sessions',
      value: 'Frequent',
      priority: 5
    });
  }

  // Peak usage milestone (longest session)
  const longestHours = Math.floor(stats.longestSession / (1000 * 60 * 60));
  if (longestHours >= 8) {
    milestones.push({
      icon: '📈',
      title: 'Peak Usage',
      value: formatTime(stats.longestSession),
      priority: 2
    });
  } else if (longestHours >= 4) {
    milestones.push({
      icon: '📈',
      title: 'Peak Session',
      value: formatTime(stats.longestSession),
      priority: 4
    });
  } else if (stats.longestSession > 0) {
    milestones.push({
      icon: '📈',
      title: 'Longest Session',
      value: formatTime(stats.longestSession),
      priority: 5
    });
  }

  // Weekly usage milestone
  const weeklyHours = Math.floor(stats.thisWeek / (1000 * 60 * 60));
  if (weeklyHours >= 40) {
    milestones.push({
      icon: '⭐',
      title: 'Heavy This Week',
      value: formatTime(stats.thisWeek),
      priority: 1
    });
  } else if (weeklyHours >= 20) {
    milestones.push({
      icon: '⭐',
      title: 'Active This Week',
      value: formatTime(stats.thisWeek),
      priority: 3
    });
  } else if (weeklyHours >= 10) {
    milestones.push({
      icon: '⭐',
      title: 'Used This Week',
      value: formatTime(stats.thisWeek),
      priority: 4
    });
  }

  // Sort by priority and limit to top 4
  milestones.sort((a, b) => a.priority - b.priority);
  const topMilestones = milestones.slice(0, 4);

  // If we have less than 4, add some default ones
  while (topMilestones.length < 4) {
    if (topMilestones.length === 0) {
      topMilestones.push({
        icon: '🎯',
        title: 'Getting Started',
        value: formatTime(stats.totalTime)
      });
    } else if (topMilestones.length === 1) {
      topMilestones.push({
        icon: '📅',
        title: 'Total Sessions',
        value: stats.sessionCount.toString()
      });
    } else if (topMilestones.length === 2) {
      topMilestones.push({
        icon: '⏱️',
        title: 'Avg. Session',
        value: formatTime(stats.avgSession)
      });
    } else {
      topMilestones.push({
        icon: '🗓️',
        title: 'First Used',
        value: stats.firstUsed ? formatDate(stats.firstUsed) : 'Unknown'
      });
    }
  }

  // Update the milestones grid
  milestonesGrid.innerHTML = topMilestones.map(milestone => `
    <div class="milestone-card">
      <div class="milestone-icon">${milestone.icon}</div>
      <div class="milestone-title">${milestone.title}</div>
      <div class="milestone-value">${milestone.value}</div>
    </div>
  `).join('');
}

// Productivity Score Calculation
function updateProductivityScore(details) {
  const scoreValue = document.querySelector('.score-value');
  const insightsContainer = document.querySelector('.productivity-insights');

  if (!scoreValue || !insightsContainer) return;

  const stats = details.stats || {};
  const app = details.app || {};
  const insights = [];
  let score = 0;

  // Calculate productivity score (0-100)
  const totalTime = stats.totalTime || 0;
  const avgSession = stats.avgSession || 0;
  const totalHours = totalTime / (1000 * 60 * 60);
  const avgSessionHours = avgSession / (1000 * 60 * 60);
  const streak = stats.streak || 0;
  const sessionCount = stats.sessionCount || 0;
  const thisWeek = stats.thisWeek || 0;

  // Score components
  if (streak > 0) score += Math.min(streak * 2, 30);
  if (avgSessionHours >= 1) score += 20;
  if (totalHours >= 10) score += 20;
  if (sessionCount >= 50) score += 15;
  if (thisWeek > 0) score += 15;

  score = Math.min(Math.round(score), 100);
  scoreValue.textContent = score;

  // Generate insights
  if (streak >= 7) {
    insights.push({
      icon: '🔥',
      text: `Amazing! You've maintained a ${streak}-day streak with this app.`
    });
  }

  const lastWeek = stats.lastWeek || 0;
  const weeklyChange = lastWeek > 0
    ? ((thisWeek - lastWeek) / lastWeek) * 100
    : 0;

  if (weeklyChange > 20) {
    insights.push({
      icon: '📈',
      text: `Your usage increased by ${Math.round(weeklyChange)}% compared to last week.`
    });
  } else if (weeklyChange < -20) {
    insights.push({
      icon: '📉',
      text: `Your usage decreased by ${Math.abs(Math.round(weeklyChange))}% compared to last week.`
    });
  }

  if (avgSessionHours >= 2) {
    insights.push({
      icon: '⏱️',
      text: `You typically use this app for ${formatTime(avgSession)} per session - great focus!`
    });
  }

  const categoryRank = stats.categoryRank || 0;
  if (categoryRank === 1) {
    insights.push({
      icon: '🏆',
      text: `This is your #1 most-used app in the ${app.category || 'this'} category!`
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: '📊',
      text: 'Keep using this app to unlock more insights!'
    });
  }

  insightsContainer.innerHTML = insights.map(insight => `
    <div class="insight-item">
      <div class="insight-icon">${insight.icon}</div>
      <div class="insight-text">${insight.text}</div>
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

// Day of Week Chart
function updateDayOfWeekChart(details) {
  const chart = document.querySelector('.day-of-week-chart');
  if (!chart) return;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayData = details.dayOfWeekUsage || [];
  console.log('Day of week data:', dayData);

  if (!dayData || dayData.length === 0) {
    chart.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 20px;">No data available</div>';
    return;
  }

  const maxDuration = Math.max(...dayData.map(d => d.total_duration || 0), 1);

  chart.innerHTML = dayNames.map((name, index) => {
    const data = dayData.find(d => d.day_of_week === index);
    const duration = data?.total_duration || 0;
    const width = (duration / maxDuration) * 100;

    return `
      <div class="day-bar-container">
        <div class="day-label">${name.slice(0, 3)}</div>
        <div class="day-bar-wrapper">
          <div class="day-bar" style="width: ${width}%;"></div>
          <div class="day-bar-value">${formatTime(duration)}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Session Duration Distribution
function updateSessionDurationChart(details) {
  const chart = document.querySelector('.session-duration-chart');
  if (!chart) return;

  const durations = details.sessionDurations || [];
  console.log('Session durations:', durations);
  console.log('Session durations length:', durations.length);

  if (!durations || durations.length === 0) {
    chart.innerHTML = '<div style="text-align: center; color: #8f98a0;">No session data available</div>';
    return;
  }

  // Create buckets: 0-15min, 15-30min, 30-60min, 1-2h, 2-4h, 4h+
  const buckets = [
    { label: '0-15m', min: 0, max: 15 * 60 * 1000, count: 0 },
    { label: '15-30m', min: 15 * 60 * 1000, max: 30 * 60 * 1000, count: 0 },
    { label: '30-60m', min: 30 * 60 * 1000, max: 60 * 60 * 1000, count: 0 },
    { label: '1-2h', min: 60 * 60 * 1000, max: 2 * 60 * 60 * 1000, count: 0 },
    { label: '2-4h', min: 2 * 60 * 60 * 1000, max: 4 * 60 * 60 * 1000, count: 0 },
    { label: '4h+', min: 4 * 60 * 60 * 1000, max: Infinity, count: 0 }
  ];

  durations.forEach(duration => {
    const bucket = buckets.find(b => duration >= b.min && duration < b.max);
    if (bucket) bucket.count++;
  });

  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  chart.innerHTML = buckets.map(bucket => {
    const height = (bucket.count / maxCount) * 100;
    return `
      <div class="duration-bar" style="height: ${height}%;" title="${bucket.label}: ${bucket.count} sessions">
        <span class="duration-bar-label">${bucket.label}</span>
      </div>
    `;
  }).join('');
}

// Heatmap
function updateHeatmap(details) {
  const container = document.querySelector('.heatmap-container');
  if (!container) return;

  const heatmapData = details.heatmapData || [];
  console.log('Heatmap data:', heatmapData);
  console.log('Heatmap data length:', heatmapData.length);

  if (!heatmapData || heatmapData.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 20px;">No heatmap data available</div>';
    return;
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const maxDuration = Math.max(...heatmapData.map(d => d.total_duration || 0), 1);

  let html = '<div class="heatmap-grid">';

  // Add header row with hours
  html += '<div class="heatmap-row-label"></div>';
  for (let hour = 0; hour < 24; hour++) {
    html += `<div class="heatmap-header">${hour}</div>`;
  }

  // Add rows for each day
  dayNames.forEach((day, dayIndex) => {
    html += `<div class="heatmap-row-label">${day}</div>`;
    for (let hour = 0; hour < 24; hour++) {
      const data = heatmapData.find(d => d.day_of_week === dayIndex && d.hour === hour);
      const duration = data?.total_duration || 0;
      const intensity = duration > 0 ? 0.2 + (duration / maxDuration) * 0.8 : 0.05;

      html += `
        <div class="heatmap-cell"
             style="background: rgba(102, 192, 244, ${intensity});"
             title="${day} ${hour}:00 - ${formatTime(duration)}"></div>
      `;
    }
  });

  html += '</div>';
  container.innerHTML = html;
}

// Streak History
function updateStreakHistory(details) {
  const container = document.querySelector('.streak-history-container');
  if (!container) return;

  const streaks = details.streakHistory || [];

  if (streaks.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 20px;">No streak history available</div>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];

  container.innerHTML = streaks.map((streak, index) => `
    <div class="streak-item">
      <div class="streak-rank">${medals[index] || '🏅'}</div>
      <div class="streak-info">
        <div class="streak-length">${streak.length} day${streak.length > 1 ? 's' : ''} streak</div>
        <div class="streak-dates">${formatDate(streak.start)} - ${formatDate(streak.end)}</div>
      </div>
    </div>
  `).join('');
}

// Best & Worst Days
function updateBestWorstDays(details) {
  const monthlyData = details.monthlyUsage || [];

  if (monthlyData.length === 0) return;

  // Best days
  const bestDays = [...monthlyData]
    .filter(d => d.total_duration > 0)
    .sort((a, b) => b.total_duration - a.total_duration)
    .slice(0, 5);

  const bestList = document.querySelector('.best-days-list');
  if (bestList) {
    if (bestDays.length > 0) {
      bestList.innerHTML = bestDays.map(day => `
        <div class="day-item">
          <div class="day-item-date">${formatDate(day.date)}, ${new Date(day.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</div>
          <div class="day-item-value">${formatTime(day.total_duration)}</div>
        </div>
      `).join('');
    } else {
      bestList.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 20px;">No data available</div>';
    }
  }

  // Worst days (days with activity, but lowest)
  const worstDays = [...monthlyData]
    .filter(d => d.total_duration > 0)
    .sort((a, b) => a.total_duration - b.total_duration)
    .slice(0, 5);

  const worstList = document.querySelector('.worst-days-list');
  if (worstList) {
    if (worstDays.length > 0) {
      worstList.innerHTML = worstDays.map(day => `
        <div class="day-item">
          <div class="day-item-date">${formatDate(day.date)}, ${new Date(day.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</div>
          <div class="day-item-value">${formatTime(day.total_duration)}</div>
        </div>
      `).join('');
    } else {
      worstList.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 20px;">No data available</div>';
    }
  }
}

// Export functionality
document.getElementById('export-csv-btn')?.addEventListener('click', async () => {
  if (!appDetails) return;

  const sessions = appDetails.recentSessions || [];
  const csvContent = [
    ['Date', 'Start Time', 'End Time', 'Duration (minutes)'],
    ...sessions.map(session => [
      new Date(session.start_time).toLocaleDateString(),
      new Date(session.start_time).toLocaleTimeString(),
      session.end_time ? new Date(session.end_time).toLocaleTimeString() : 'ongoing',
      Math.round(session.duration / (1000 * 60))
    ])
  ].map(row => row.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${appDetails.app.name}-sessions.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('export-json-btn')?.addEventListener('click', async () => {
  if (!appDetails) return;

  const exportData = {
    app: appDetails.app,
    stats: appDetails.stats,
    sessions: appDetails.recentSessions,
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${appDetails.app.name}-data.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// Launch app button
document.getElementById('launch-btn')?.addEventListener('click', async () => {
  if (!appDetails) return;

  try {
    // Send message to parent window to launch app
    window.parent.postMessage({
      type: 'LAUNCH_APP',
      appId: appDetails.app.id
    }, '*');
  } catch (error) {
    console.error('Error launching app:', error);
  }
});

// Add to favorites button
document.getElementById('favorite-btn')?.addEventListener('click', async () => {
  if (!appDetails) return;

  try {
    // Send message to parent window to toggle favorite
    window.parent.postMessage({
      type: 'TOGGLE_FAVORITE',
      appId: appDetails.app.id
    }, '*');
  } catch (error) {
    console.error('Error toggling favorite:', error);
  }
});

// Properties button
document.getElementById('properties-btn')?.addEventListener('click', () => {
  if (!appDetails) return;

  const modal = document.getElementById('properties-modal');
  if (modal) {
    // Populate properties
    document.getElementById('prop-name').textContent = appDetails.app.name;
    document.getElementById('prop-category').textContent = appDetails.app.category;
    document.getElementById('prop-executable').textContent = appDetails.app.executable || '-';
    document.getElementById('prop-path').textContent = appDetails.app.path || '-';
    document.getElementById('prop-first-added').textContent = appDetails.app.first_used
      ? new Date(appDetails.app.first_used).toLocaleString()
      : '-';
    document.getElementById('prop-last-used').textContent = appDetails.app.last_used
      ? new Date(appDetails.app.last_used).toLocaleString()
      : '-';
    document.getElementById('prop-total-time').textContent = formatTime(appDetails.app.total_time);
    document.getElementById('prop-launch-count').textContent = appDetails.app.launch_count || 0;

    modal.style.display = 'flex';
  }
});

// Close modal
document.querySelector('.modal-close')?.addEventListener('click', () => {
  const modal = document.getElementById('properties-modal');
  if (modal) {
    modal.style.display = 'none';
  }
});

// Close modal on outside click
window.addEventListener('click', (e) => {
  const modal = document.getElementById('properties-modal');
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

// Helper functions
// Note: Category color is now passed from parent window via details.categoryColor
// This function is no longer needed in iframe context
async function getCategoryColor(categoryName) {
  console.warn('getCategoryColor called in iframe context - this should not happen');
  console.log('Category color should be passed from parent window via details.categoryColor');
  try {
    const categories = await window.electronAPI.getCategories();
    console.log('All categories:', categories);
    console.log('Looking for category:', categoryName);

    const category = categories.find(c => c.name === categoryName);
    console.log('Found category:', category);

    const color = category ? (category.color || '#092442') : '#092442';
    console.log('Returning color:', color);

    return color;
  } catch (error) {
    console.error('Error getting category color:', error);
    return '#092442';
  }
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Back button handler
document.querySelector('.back-button')?.addEventListener('click', () => {
  // Send message to parent to go back to library
  window.parent.postMessage({ type: 'BACK_TO_LIBRARY' }, '*');
});
