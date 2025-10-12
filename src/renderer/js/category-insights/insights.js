// Usage Insights for Category
function updateInsights(categoryData) {
  updateMostActiveDays(categoryData);
  updatePeakUsageTimes(categoryData);
  updateTimeOfDay(categoryData);
  updateProductivityBreakdown(categoryData);
}

// Most Active Days
function updateMostActiveDays(categoryData) {
  const container = document.querySelector('.best-days-list');
  if (!container) return;

  const dailyData = categoryData.dailyUsage || [];

  if (dailyData.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 10px; font-size: 11px;">No data</div>';
    return;
  }

  // Get top 3 most active days
  const bestDays = [...dailyData]
    .filter(d => d.total_duration > 0)
    .sort((a, b) => b.total_duration - a.total_duration)
    .slice(0, 3);

  if (bestDays.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 10px; font-size: 11px;">No data</div>';
    return;
  }

  container.innerHTML = bestDays.map(day => `
    <div class="insight-item">
      <span class="insight-item-label">${formatDate(day.date)}</span>
      <span class="insight-item-value">${formatTime(day.total_duration)}</span>
    </div>
  `).join('');
}

// Peak Usage Times
function updatePeakUsageTimes(categoryData) {
  const container = document.querySelector('.peak-times-list');
  if (!container) return;

  const heatmapData = categoryData.heatmapData || [];

  if (heatmapData.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 10px; font-size: 11px;">No data</div>';
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
    .slice(0, 3);

  if (sortedHours.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 10px; font-size: 11px;">No data</div>';
    return;
  }

  container.innerHTML = sortedHours.map(item => {
    const startHour = item.hour;
    const endHour = (item.hour + 1) % 24;
    const period = `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`;

    return `
      <div class="insight-item">
        <span class="insight-item-label">${period}</span>
        <span class="insight-item-value">${formatTime(item.duration)}</span>
      </div>
    `;
  }).join('');
}

// Time of Day Breakdown
function updateTimeOfDay(categoryData) {
  const container = document.querySelector('.time-of-day-breakdown');
  if (!container) return;

  const heatmapData = categoryData.heatmapData || [];

  if (heatmapData.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 10px; font-size: 11px;">No data</div>';
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

  container.innerHTML = Object.entries(periods).map(([name, data]) => `
    <div class="insight-item">
      <span class="insight-item-label">${data.icon} ${name}</span>
      <span class="insight-item-value">${formatTime(data.duration)}</span>
    </div>
  `).join('');
}

// Usage Patterns
function updateProductivityBreakdown(categoryData) {
  const container = document.querySelector('.productivity-breakdown');
  if (!container) return;

  const dailyData = categoryData.dailyUsage || [];
  const stats = categoryData.stats || {};

  if (dailyData.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 10px; font-size: 11px;">No data</div>';
    return;
  }

  // Calculate active days (days with usage > 0)
  const activeDays = dailyData.filter(d => d.total_duration > 0).length;

  // Calculate consistency score (percentage of days with activity)
  const totalDays = dailyData.length;
  const consistencyScore = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0;

  // Calculate growth trend (compare first half vs second half)
  const halfPoint = Math.floor(dailyData.length / 2);
  const firstHalf = dailyData.slice(0, halfPoint);
  const secondHalf = dailyData.slice(halfPoint);

  const firstHalfTotal = firstHalf.reduce((sum, d) => sum + (d.total_duration || 0), 0);
  const secondHalfTotal = secondHalf.reduce((sum, d) => sum + (d.total_duration || 0), 0);

  let trendText = 'Stable';
  let trendIcon = '➡️';
  if (firstHalf.length > 0 && secondHalf.length > 0) {
    const firstAvg = firstHalfTotal / firstHalf.length;
    const secondAvg = secondHalfTotal / secondHalf.length;
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 10) {
      trendText = `Growing +${Math.round(change)}%`;
      trendIcon = '📈';
    } else if (change < -10) {
      trendText = `Declining ${Math.round(change)}%`;
      trendIcon = '📉';
    }
  }

  // Find busiest day of week
  const dayOfWeekTotals = {
    0: { name: 'Sunday', total: 0 },
    1: { name: 'Monday', total: 0 },
    2: { name: 'Tuesday', total: 0 },
    3: { name: 'Wednesday', total: 0 },
    4: { name: 'Thursday', total: 0 },
    5: { name: 'Friday', total: 0 },
    6: { name: 'Saturday', total: 0 }
  };

  dailyData.forEach(d => {
    const date = new Date(d.date);
    const dayOfWeek = date.getDay();
    dayOfWeekTotals[dayOfWeek].total += d.total_duration || 0;
  });

  const busiestDay = Object.values(dayOfWeekTotals)
    .sort((a, b) => b.total - a.total)[0];

  container.innerHTML = `
    <div class="insight-item">
      <span class="insight-item-label">📅 Active Days</span>
      <span class="insight-item-value">${activeDays}/${totalDays}</span>
    </div>
    <div class="insight-item">
      <span class="insight-item-label">🎯 Consistency</span>
      <span class="insight-item-value">${consistencyScore}%</span>
    </div>
    <div class="insight-item">
      <span class="insight-item-label">${trendIcon} Trend</span>
      <span class="insight-item-value">${trendText}</span>
    </div>
    <div class="insight-item">
      <span class="insight-item-label">⭐ Busiest Day</span>
      <span class="insight-item-value">${busiestDay.name}</span>
    </div>
  `;
}

// Category Comparison Chart
async function updateCategoryComparison(categoryData, categories) {
  const container = document.querySelector('.category-comparison-chart');
  if (!container) return;

  if (!categories || categories.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #8f98a0; padding: 40px;">
        No category data available
      </div>
    `;
    return;
  }

  // Get current category name
  const currentCategoryName = categoryData?.category?.name;

  // Find max time for scaling
  const maxTime = Math.max(...categories.map(c => c.total_time));

  // Limit to top 10 categories
  const topCategories = categories.slice(0, 10);

  // Get colors for all categories
  const categoriesWithColors = await Promise.all(
    topCategories.map(async (cat) => {
      const color = cat.color || await getCategoryColor(cat.name) || '#66c0f4';
      return { ...cat, color };
    })
  );

  const html = categoriesWithColors.map(cat => {
    const percentage = maxTime > 0 ? Math.round((cat.total_time / maxTime) * 100) : 0;
    const isCurrent = cat.name === currentCategoryName;

    // Convert hex to RGB for gradient
    const rgb = hexToRgb(cat.color);
    const lighterRgb = {
      r: Math.min(255, rgb.r + 30),
      g: Math.min(255, rgb.g + 30),
      b: Math.min(255, rgb.b + 30)
    };

    const gradient = `linear-gradient(90deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1) 0%, rgba(${lighterRgb.r}, ${lighterRgb.g}, ${lighterRgb.b}, 1) 100%)`;

    return `
      <div class="comparison-item">
        <div class="comparison-label" title="${cat.name}">
          ${cat.icon || '📁'} ${cat.name}
        </div>
        <div class="comparison-bar-wrapper">
          <div class="comparison-bar ${isCurrent ? 'current' : ''}" style="width: ${percentage}%; background: ${gradient};">
            <span class="comparison-bar-text">${formatTime(cat.total_time)}</span>
          </div>
        </div>
        <div class="comparison-percentage">${percentage}%</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="comparison-bar-container">
      ${html}
    </div>
  `;
}
