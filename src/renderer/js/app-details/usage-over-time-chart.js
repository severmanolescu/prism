function setupChartTabs(details) {
  const tabs = document.querySelectorAll('.chart-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      // Add active class to clicked tab
      tab.classList.add('active');
      // Update chart
      currentChartPeriod = tab.dataset.period;
      updateUsageChart(details, currentChartPeriod);
    });
  });
}

function updateUsageChart(details, period) {
  let data, labelFormat;

  switch(period) {
    case 'daily':
      // Last 7 days
      data = getLast7DaysData(details.weeklyUsage);
      labelFormat = (date) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const d = new Date(date);
        return `${days[d.getDay()]} ${d.getDate()}`;
      };
      break;
    case 'weekly':
      // Last 12 weeks
      data = getLast12WeeksData(details);
      labelFormat = (date) => {
        const d = new Date(date);
        return `Week ${getWeekNumber(d)}`;
      };
      break;
    case 'monthly':
      // Last 12 months
      data = getLast12MonthsData(details);
      labelFormat = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short' });
      };
      break;
  }

  drawChart(data, labelFormat);
}

function getLast7DaysData(weeklyData) {
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayData = weeklyData.find(d => d.date === dateStr);
    last7Days.push({
      date: dateStr,
      duration: dayData?.total_duration || 0
    });
  }
  return last7Days;
}

function getLast12WeeksData(details) {
  const weeks = [];
  for (let i = 11; i >= 0; i--) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (i * 7));
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);

    // Sum up the week's data from monthlyUsage
    let weekDuration = 0;
    if (details.monthlyUsage) {
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayData = details.monthlyUsage.find(m => m.date === dateStr);
        if (dayData) weekDuration += dayData.total_duration;
      }
    }

    weeks.push({
      date: endDate.toISOString().split('T')[0],
      duration: weekDuration
    });
  }
  return weeks;
}

function getLast12MonthsData(details) {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    date.setDate(1);

    const year = date.getFullYear();
    const month = date.getMonth();

    // Sum up the month's data from monthlyUsage
    let monthDuration = 0;
    if (details.monthlyUsage) {
      details.monthlyUsage.forEach(dayData => {
        const dayDate = new Date(dayData.date);
        if (dayDate.getFullYear() === year && dayDate.getMonth() === month) {
          monthDuration += dayData.total_duration;
        }
      });
    }

    months.push({
      date: date.toISOString().split('T')[0],
      duration: monthDuration
    });
  }
  return months;
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}


function drawChart(chartData, labelFormat) {
  const canvas = document.getElementById('usage-line-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

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
  const padding = { top: 30, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw background
  ctx.fillStyle = '#0a1e2f';
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
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
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

  // Draw points and hover areas
  points.forEach((point, index) => {
    // Draw point
    ctx.fillStyle = '#66c0f4';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw inner dot
    ctx.fillStyle = '#0a1e2f';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw X-axis label
    ctx.fillStyle = '#8f98a0';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
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
      ctx.fillStyle = '#0a1e2f';
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
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
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

      // Draw points
      points.forEach((point) => {
        const isHovered = point === closestPoint;
        const radius = isHovered ? 7 : 5;

        // Outer circle
        ctx.fillStyle = isHovered ? '#ffffff' : '#66c0f4';
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner dot
        ctx.fillStyle = isHovered ? '#66c0f4' : '#0a1e2f';
        ctx.beginPath();
        ctx.arc(point.x, point.y, isHovered ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw X-axis label (highlight if hovered)
        ctx.fillStyle = isHovered ? '#ffffff' : '#8f98a0';
        ctx.font = isHovered ? 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' : '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(point.label, point.x, height - padding.bottom + 10);
      });

      // Draw tooltip if hovering over a point
      if (closestPoint) {
        const tooltipText = formatTime(closestPoint.duration);
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
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
