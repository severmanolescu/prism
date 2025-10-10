/**
 * Chart rendering utilities for PDF exports
 * Can be injected into HTML for canvas-based chart rendering
 */

// Format time helper
function formatTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

// Render daily usage chart
function renderDailyChart(dailyBreakdown) {
  const canvas = document.getElementById('daily-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  if (!dailyBreakdown || dailyBreakdown.length === 0) {
    ctx.fillStyle = '#16202d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#8f98a0';
    ctx.font = '14px "Motiva Sans", Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
    return;
  }

  // Single day chart
  if (dailyBreakdown.length === 1) {
    renderSingleDayChart(ctx, canvas, dailyBreakdown[0]);
    return;
  }

  // Multi-day chart
  renderMultiDayChart(ctx, canvas, dailyBreakdown);
}

// Render single day bar chart
function renderSingleDayChart(ctx, canvas, dayData) {
  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = '#16202d';
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 40, right: 50, bottom: 60, left: 50 };
  const barWidth = 100;
  const centerX = width / 2;
  const maxBarHeight = height - padding.top - padding.bottom;
  const barHeight = maxBarHeight * 0.7;
  const barY = padding.top + (maxBarHeight - barHeight);

  const gradient = ctx.createLinearGradient(centerX, barY, centerX, barY + barHeight);
  gradient.addColorStop(0, '#66c0f4');
  gradient.addColorStop(1, '#417a9b');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(centerX - barWidth / 2, barY, barWidth, barHeight, 4);
  ctx.fill();

  ctx.fillStyle = '#66c0f4';
  ctx.beginPath();
  ctx.roundRect(centerX - barWidth / 2, barY - 3, barWidth, 6, 3);
  ctx.fill();

  ctx.fillStyle = '#66c0f4';
  ctx.font = 'bold 24px "Motiva Sans", Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(formatTime(dayData.total_time), centerX, barY - 20);

  const date = new Date(dayData.date);
  ctx.fillStyle = '#8f98a0';
  ctx.font = '14px "Motiva Sans", Arial';
  ctx.textBaseline = 'top';
  ctx.fillText(date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), centerX, height - padding.bottom + 10);
}

// Render multi-day line chart
function renderMultiDayChart(ctx, canvas, dailyBreakdown) {
  const dataPoints = dailyBreakdown.map(item => ({
    date: item.date,
    duration: item.total_time || 0,
    label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));

  const maxDuration = Math.max(...dataPoints.map(d => d.duration), 1);
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 30, right: 20, bottom: 40, left: 70 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#16202d';
  ctx.fillRect(0, 0, width, height);

  // Grid lines
  ctx.strokeStyle = '#1a3548';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  // Y-axis labels
  ctx.fillStyle = '#8f98a0';
  ctx.font = '12px "Motiva Sans", Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 5; i++) {
    const value = maxDuration * (1 - i / 5);
    const y = padding.top + (chartHeight / 5) * i;
    ctx.fillText(formatTime(value), padding.left - 10, y);
  }

  // Calculate points
  const points = dataPoints.map((point, index) => ({
    x: padding.left + (chartWidth / (dataPoints.length - 1)) * index,
    y: padding.top + chartHeight - (point.duration / maxDuration) * chartHeight,
    duration: point.duration,
    label: point.label
  }));

  // Area gradient
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(102, 192, 244, 0.3)');
  gradient.addColorStop(1, 'rgba(102, 192, 244, 0.05)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(points[0].x, height - padding.bottom);
  points.forEach(point => ctx.lineTo(point.x, point.y));
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.closePath();
  ctx.fill();

  // Line
  ctx.strokeStyle = '#66c0f4';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach(point => ctx.lineTo(point.x, point.y));
  ctx.stroke();

  // Points
  points.forEach((point) => {
    ctx.fillStyle = '#66c0f4';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#16202d';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8f98a0';
    ctx.font = '11px "Motiva Sans", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(point.label, point.x, height - padding.bottom + 10);
  });
}
