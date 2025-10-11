// Day of Week Chart for Category Insights
function updateDayOfWeekChart(categoryData) {
  const chart = document.querySelector('.day-of-week-chart');
  if (!chart) return;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayData = categoryData.dayOfWeekUsage || [];

  if (!dayData || dayData.length === 0) {
    chart.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 20px;">No data available</div>';
    return;
  }

  const maxDuration = Math.max(...dayData.map(d => d.total_duration || 0), 1);

  chart.innerHTML = dayNames.map((name, index) => {
    const data = dayData.find(d => d.day === index);
    const duration = data?.total_duration || 0;
    const width = (duration / maxDuration) * 100;

    return `
      <div class="day-bar-container">
        <div class="day-label">${name.slice(0, 3)}</div>
        <div class="day-bar-wrapper">
          <div class="day-bar" style="width: ${width}%;">
            <div class="day-bar-text">${formatTime(duration)}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}
