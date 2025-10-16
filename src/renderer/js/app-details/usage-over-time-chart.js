// Render a single-day chart using Canvas
function renderSingleDayCanvasChart(ctx, canvas, dayData) {
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw background
  ctx.fillStyle = '#16202d';
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 40, right: 50, bottom: 60, left: 50 };
  const barWidth = 100;
  const centerX = width / 2;
  const duration = dayData.duration || 0;

  // Calculate bar height (max 70% of available height)
  const maxBarHeight = height - padding.top - padding.bottom;
  const barHeight = maxBarHeight * 0.7;
  const barY = padding.top + (maxBarHeight - barHeight);

  // Create gradient for bar
  const gradient = ctx.createLinearGradient(centerX, barY, centerX, barY + barHeight);
  gradient.addColorStop(0, '#66c0f4');
  gradient.addColorStop(1, '#417a9b');

  // Draw the bar
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(centerX - barWidth / 2, barY, barWidth, barHeight, 4);
  ctx.fill();

  // Draw top cap
  ctx.fillStyle = '#66c0f4';
  ctx.beginPath();
  ctx.roundRect(centerX - barWidth / 2, barY - 3, barWidth, 6, 3);
  ctx.fill();

  // Value label on top
  ctx.fillStyle = '#66c0f4';
  ctx.font = 'bold 24px "Motiva Sans", Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(formatTime(duration), centerX, barY - 20);

  // Date label at bottom
  const date = new Date(dayData.date);
  ctx.fillStyle = '#8f98a0';
  ctx.font = '14px "Motiva Sans", Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }), centerX, height - padding.bottom + 10);

  // Session count label
  ctx.fillStyle = '#66c0f4';
  ctx.font = '12px "Motiva Sans", Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${dayData.session_count || 0} sessions`, centerX, height - padding.bottom + 30);

  // Remove any existing event listeners
  canvas.onmousemove = null;
  canvas.onmouseleave = null;
}

function updateUsageChart(details, period) {
  // Use the weeklyUsage data which now contains data based on the selected date range
  const data = details.weeklyUsage || [];

  // Auto-detect label format based on date range size
  const labelFormat = (date) => {
    if (data.length <= 7) {
      // Short range: show day of week + date
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const d = new Date(date);
      return `${days[d.getDay()]} ${d.getDate()}`;
    } else if (data.length <= 31) {
      // Medium range: show month + date
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    } else {
      // Long range: show month/day
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
  };

  const chartData = data.map(item => ({
    date: item.date,
    duration: item.total_duration || 0
  }));

  // Special handling for single day
  const canvas = document.getElementById('usage-line-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Check if we have no data
  if (!chartData || chartData.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#16202d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#8f98a0';
    ctx.font = '14px "Motiva Sans", Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No data available for this period', canvas.width / 2, canvas.height / 2);
    return;
  }

  // Render single day as bar chart
  if (chartData.length === 1) {
    renderSingleDayCanvasChart(ctx, canvas, chartData[0]);
    return;
  }

  drawChart(chartData, labelFormat);
}


function drawChart(chartData, labelFormat) {
  const canvas = document.getElementById('usage-line-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Use fixed dimensions like analytics chart for consistent appearance
  canvas.width = 800;
  canvas.height = 350;

  // Prepare data points
  const dataPoints = chartData.map(item => ({
    date: item.date,
    duration: item.duration,
    label: labelFormat(item.date)
  }));

  const maxDuration = Math.max(...dataPoints.map(d => d.duration), 1);

  // Canvas dimensions
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 30, right: 20, bottom: 40, left: 70 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw background (match analytics chart color)
  ctx.fillStyle = '#16202d';
  ctx.fillRect(0, 0, width, height);

  // Draw grid lines
  ctx.strokeStyle = '#1a3548';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  // Draw Y-axis labels
  ctx.fillStyle = '#8f98a0';
  ctx.font = '12px "Motiva Sans", Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 5; i++) {
    const value = maxDuration * (1 - i / 5);
    const y = padding.top + (chartHeight / 5) * i;
    ctx.fillText(formatTime(value), padding.left - 10, y);
  }

  // Calculate points for the line and area
  const points = dataPoints.map((point, index) => ({
    x: padding.left + (chartWidth / (dataPoints.length - 1)) * index,
    y: padding.top + chartHeight - (point.duration / maxDuration) * chartHeight,
    duration: point.duration,
    label: point.label
  }));

  // Draw area under the line (gradient)
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

  // Draw the line
  ctx.strokeStyle = '#66c0f4';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach(point => ctx.lineTo(point.x, point.y));
  ctx.stroke();

  // Draw points (match analytics chart sizes)
  points.forEach((point, index) => {
    // Draw point
    ctx.fillStyle = '#66c0f4';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
    ctx.fill();

    // Draw inner dot
    ctx.fillStyle = '#16202d';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw X-axis label
    ctx.fillStyle = '#8f98a0';
    ctx.font = '11px "Motiva Sans", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(point.label, point.x, height - padding.bottom + 10);
  });

  // Add hover interaction
  let hoveredPoint = null;

  canvas.style.cursor = 'default';
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Find closest point
    let closestPoint = null;
    let minDist = Infinity;
    points.forEach(point => {
      const dist = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));
      if (dist < minDist && dist < 40) {
        minDist = dist;
        closestPoint = point;
      }
    });

    // Only redraw if hover state changed
    if (hoveredPoint !== closestPoint) {
      hoveredPoint = closestPoint;
      canvas.style.cursor = closestPoint ? 'pointer' : 'default';

      // Redraw chart
      ctx.clearRect(0, 0, width, height);

      // Draw background
      ctx.fillStyle = '#16202d';
      ctx.fillRect(0, 0, width, height);

      // Draw grid lines
      ctx.strokeStyle = '#1a3548';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }

      // Draw Y-axis labels
      ctx.fillStyle = '#8f98a0';
      ctx.font = '12px "Motiva Sans", Arial';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= 5; i++) {
        const value = maxDuration * (1 - i / 5);
        const y = padding.top + (chartHeight / 5) * i;
        ctx.fillText(formatTime(value), padding.left - 10, y);
      }

      // Draw area under the line
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(points[0].x, height - padding.bottom);
      points.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
      ctx.closePath();
      ctx.fill();

      // Draw vertical line to hovered point
      if (closestPoint) {
        ctx.strokeStyle = 'rgba(102, 192, 244, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(closestPoint.x, padding.top);
        ctx.lineTo(closestPoint.x, height - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw the line
      ctx.strokeStyle = '#66c0f4';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.stroke();

      // Draw points (match analytics chart)
      points.forEach((point) => {
        const isHovered = point === closestPoint;
        const radius = isHovered ? 9 : 7;

        // Outer circle
        ctx.fillStyle = isHovered ? '#ffffff' : '#66c0f4';
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner dot
        ctx.fillStyle = isHovered ? '#66c0f4' : '#16202d';
        ctx.beginPath();
        ctx.arc(point.x, point.y, isHovered ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw X-axis label (highlight if hovered)
        ctx.fillStyle = isHovered ? '#ffffff' : '#8f98a0';
        ctx.font = isHovered ? 'bold 12px "Motiva Sans", Arial' : '11px "Motiva Sans", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(point.label, point.x, height - padding.bottom + 10);
      });

      // Draw tooltip if hovering over a point
      if (closestPoint) {
        const tooltipText = formatTime(closestPoint.duration);
        ctx.font = 'bold 14px "Motiva Sans", Arial';
        const tooltipWidth = ctx.measureText(tooltipText).width + 24;
        const tooltipHeight = 36;
        const tooltipPadding = 12;
        let tooltipX = closestPoint.x - tooltipWidth / 2;
        let tooltipY = closestPoint.y - tooltipHeight - tooltipPadding;

        // Keep tooltip in bounds
        if (tooltipX < padding.left) tooltipX = padding.left;
        if (tooltipX + tooltipWidth > width - padding.right) tooltipX = width - padding.right - tooltipWidth;
        if (tooltipY < padding.top) tooltipY = closestPoint.y + tooltipPadding;

        // Draw tooltip shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.roundRect(tooltipX + 2, tooltipY + 2, tooltipWidth, tooltipHeight, 6);
        ctx.fill();

        // Draw tooltip background
        ctx.fillStyle = 'rgba(17, 37, 52, 0.98)';
        ctx.strokeStyle = '#66c0f4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 6);
        ctx.fill();
        ctx.stroke();

        // Draw tooltip text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tooltipText, tooltipX + tooltipWidth / 2, tooltipY + tooltipHeight / 2);
      }
    }
  };

  canvas.onmouseleave = () => {
    hoveredPoint = null;
    canvas.style.cursor = 'default';
    drawChart(chartData, labelFormat);
  };
}
