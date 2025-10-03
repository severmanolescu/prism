// Heatmap
function updateHeatmap(details) {
  const container = document.querySelector('.heatmap-container');
  if (!container) return;

  const heatmapData = details.heatmapData || [];

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
