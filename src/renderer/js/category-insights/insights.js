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

  const monthlyData = categoryData.monthlyUsage || [];

  if (monthlyData.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 10px; font-size: 11px;">No data</div>';
    return;
  }

  // Get top 3 most active days
  const bestDays = [...monthlyData]
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

// Productivity Breakdown (placeholder - would need productivity data from backend)
function updateProductivityBreakdown(categoryData) {
  const container = document.querySelector('.productivity-breakdown');
  if (!container) return;

  // This would require querying productivity levels of apps in the category
  // For now, show a placeholder
  container.innerHTML = `
    <div style="text-align: center; color: #8f98a0; padding: 20px; font-size: 11px;">
      Productivity tracking coming soon
    </div>
  `;
}

// Category Comparison Chart
function updateCategoryComparison(categoryData) {
  const container = document.querySelector('.category-comparison-chart');
  if (!container) return;

  // This would require getting all categories data from backend
  // For now, show a placeholder
  container.innerHTML = `
    <div style="text-align: center; color: #8f98a0; padding: 40px;">
      Category comparison coming soon
    </div>
  `;
}
