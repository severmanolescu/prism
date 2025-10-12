// Heatmap for Category Insights
function updateHeatmap(heatmapData) {
  const container = document.querySelector('.heatmap-container');
  if (!container) return;

  if (!heatmapData || heatmapData.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 20px;">No heatmap data available</div>';
    return;
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Find which days have data
  const daysWithData = new Set(heatmapData.map(d => d.day));
  const activeDays = Array.from(daysWithData).sort((a, b) => a - b);

  // If no days have data, show message
  if (activeDays.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 20px;">No heatmap data available</div>';
    return;
  }

  const maxDuration = Math.max(...heatmapData.map(d => d.total_duration || 0), 1);

  let html = '<div class="heatmap-grid">';

  // Add empty cell for top-left corner
  html += '<div class="heatmap-label"></div>';

  // Add header row with hours
  for (let hour = 0; hour < 24; hour++) {
    html += `<div class="heatmap-hour">${hour}</div>`;
  }

  // Add rows only for days that have data
  activeDays.forEach(dayIndex => {
    const day = dayNames[dayIndex];
    html += `<div class="heatmap-label">${day}</div>`;
    for (let hour = 0; hour < 24; hour++) {
      const data = heatmapData.find(d => d.day === dayIndex && d.hour === hour);
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
