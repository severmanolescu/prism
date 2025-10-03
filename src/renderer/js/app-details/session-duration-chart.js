// Session Duration Distribution
function updateSessionDurationChart(details) {
  const chart = document.querySelector('.session-duration-chart');
  if (!chart) return;

  const durations = details.sessionDurations || [];

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
