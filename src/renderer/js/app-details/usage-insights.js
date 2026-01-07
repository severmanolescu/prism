// Usage Insights
function updateUsageInsights(details) {
  // Update insight box titles to be period-aware
  updateInsightTitles();

  updateBestWorstDays(details);
  updateStreakHistory(details);
  updateAverageSession(details);
  updatePeakUsageTimes(details);
  updateTimeOfDay(details);
}

// Update insight box titles based on current period
function updateInsightTitles() {
  const insightBoxes = document.querySelectorAll('.insight-box');

  insightBoxes.forEach(box => {
    const titleEl = box.querySelector('.insight-title');
    if (!titleEl) return;

    const originalTitle = titleEl.getAttribute('data-original-title') || titleEl.textContent;
    if (!titleEl.getAttribute('data-original-title')) {
      titleEl.setAttribute('data-original-title', originalTitle);
    }

    // Update titles based on period
    if (originalTitle === 'Best Days' || originalTitle.includes('Best Days')) {
      titleEl.textContent = currentPeriod === 'all' ? 'Best Days' : 'Best Days in Period';
    } else if (originalTitle === 'Least Active Days' || originalTitle.includes('Least Active')) {
      titleEl.textContent = currentPeriod === 'all' ? 'Least Active Days' : 'Least Active in Period';
    } else if (originalTitle === 'Average Session' || originalTitle.includes('Average Session')) {
      titleEl.textContent = currentPeriod === 'all' ? 'Average Session' : 'Avg Session in Period';
    } else if (originalTitle === 'Peak Usage Times' || originalTitle.includes('Peak Usage')) {
      titleEl.textContent = currentPeriod === 'all' ? 'Peak Usage Times' : 'Peak Times in Period';
    }
  });
}

// Best & Worst Days
function updateBestWorstDays(details) {
  const monthlyData = details.monthlyUsage || [];

  if (monthlyData.length === 0) return;

  // Best days
  const bestDays = [...monthlyData]
    .filter(d => d.total_duration > 0)
    .sort((a, b) => b.total_duration - a.total_duration)
    .slice(0, 3);

  const bestList = document.querySelector('.best-days-list');
  if (bestList) {
    if (bestDays.length > 0) {
      bestList.innerHTML = bestDays.map(day => `
        <div class="day-item">
          <div class="day-item-date">${formatDate(day.date)}</div>
          <div class="day-item-value">${formatTime(day.total_duration)}</div>
        </div>
      `).join('');
    } else {
      bestList.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 10px; font-size: 10px;">No data</div>';
    }
  }

  // Worst days (days with activity, but lowest)
  const worstDays = [...monthlyData]
    .filter(d => d.total_duration > 0)
    .sort((a, b) => a.total_duration - b.total_duration)
    .slice(0, 3);

  const worstList = document.querySelector('.worst-days-list');
  if (worstList) {
    if (worstDays.length > 0) {
      worstList.innerHTML = worstDays.map(day => `
        <div class="day-item">
          <div class="day-item-date">${formatDate(day.date)}</div>
          <div class="day-item-value">${formatTime(day.total_duration)}</div>
        </div>
      `).join('');
    } else {
      worstList.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 10px; font-size: 10px;">No data</div>';
    }
  }
}

// Streak History
function updateStreakHistory(details) {
  const container = document.querySelector('.streak-history-container');
  if (!container) return;

  const streaks = details.streakHistory || [];

  if (streaks.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 10px; font-size: 10px;">No streak history</div>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];

  container.innerHTML = streaks.slice(0, 3).map((streak, index) => `
    <div class="streak-item">
      <div class="streak-rank">${medals[index] || '🏅'}</div>
      <div class="streak-info">
        <div class="streak-length">${streak.length} day${streak.length > 1 ? 's' : ''}</div>
        <div class="streak-dates">${formatDate(streak.start)} - ${formatDate(streak.end)}</div>
      </div>
    </div>
  `).join('');
}

// Average Session
function updateAverageSession(details) {
  const valueEl = document.querySelector('.avg-session-value');
  const subtitleEl = document.querySelector('.avg-session-subtitle');
  if (!valueEl) return;

  const avgSession = details.stats?.avgSession || 0;
  const sessionCount = details.stats?.sessionCount || 0;

  valueEl.textContent = formatTime(avgSession);

  if (subtitleEl) {
    if (currentPeriod === 'all') {
      subtitleEl.textContent = 'across all sessions';
    } else {
      subtitleEl.textContent = `across ${sessionCount} session${sessionCount !== 1 ? 's' : ''}`;
    }
  }
}

// Peak Usage Times
function updatePeakUsageTimes(details) {
  const container = document.querySelector('.peak-times-list');
  if (!container) return;

  const heatmapData = details.heatmapData || [];

  if (heatmapData.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 10px; font-size: 10px;">No data</div>';
    return;
  }

  // Group by hour and sum across all days
  const hourlyTotals = {};
  heatmapData.forEach(item => {
    const hour = item.hour;
    if (!hourlyTotals[hour]) {
      hourlyTotals[hour] = 0;
    }
    hourlyTotals[hour] += item.total_duration || 0;
  });

  // Convert to array and sort by duration
  const sortedHours = Object.entries(hourlyTotals)
    .map(([hour, duration]) => ({ hour: parseInt(hour), duration }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  if (sortedHours.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 10px; font-size: 10px;">No data</div>';
    return;
  }

  container.innerHTML = sortedHours.map(item => {
    const startHour = item.hour;
    const endHour = (item.hour + 1) % 24;
    const period = `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`;

    return `
      <div class="peak-time-item">
        <div class="peak-time-period">${period}</div>
        <div class="peak-time-value">${formatTime(item.duration)}</div>
      </div>
    `;
  }).join('');
}

// Time of Day Preference
function updateTimeOfDay(details) {
  const container = document.querySelector('.time-of-day-breakdown');
  if (!container) return;

  const heatmapData = details.heatmapData || [];

  if (heatmapData.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 10px; font-size: 10px;">No data</div>';
    return;
  }

  // Define time periods
  const periods = {
    'Morning': { start: 6, end: 11, icon: '🌅', duration: 0 },
    'Afternoon': { start: 12, end: 17, icon: '☀️', duration: 0 },
    'Evening': { start: 18, end: 22, icon: '🌆', duration: 0 },
    'Night': { start: 23, end: 5, icon: '🌙', duration: 0 }
  };

  // Calculate duration for each period
  heatmapData.forEach(item => {
    const hour = item.hour;
    const duration = item.total_duration || 0;

    if (hour >= periods.Morning.start && hour <= periods.Morning.end) {
      periods.Morning.duration += duration;
    } else if (hour >= periods.Afternoon.start && hour <= periods.Afternoon.end) {
      periods.Afternoon.duration += duration;
    } else if (hour >= periods.Evening.start && hour <= periods.Evening.end) {
      periods.Evening.duration += duration;
    } else {
      periods.Night.duration += duration;
    }
  });

  const maxDuration = Math.max(
    periods.Morning.duration,
    periods.Afternoon.duration,
    periods.Evening.duration,
    periods.Night.duration,
    1
  );

  container.innerHTML = Object.entries(periods).map(([name, data]) => {
    const percentage = (data.duration / maxDuration) * 100;
    return `
      <div class="time-period-item">
        <div class="time-period-label">${data.icon} ${name}</div>
        <div class="time-period-bar-container">
          <div class="time-period-bar" style="width: ${percentage}%;"></div>
        </div>
        <div class="time-period-value">${formatTime(data.duration)}</div>
      </div>
    `;
  }).join('');
}
