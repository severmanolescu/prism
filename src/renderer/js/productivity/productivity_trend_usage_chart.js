// Render a single-day chart using Canvas
function renderSingleDayProductivityChart(ctx, width, height, dayData) {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#16202d';
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 40, right: 50, bottom: 60, left: 50 };
    const barWidth = 100;
    const centerX = width / 2;

    // Calculate bar height based on score (0-100)
    const maxBarHeight = height - padding.top - padding.bottom;
    const scorePercentage = dayData.score / 100;
    const barHeight = maxBarHeight * scorePercentage * 0.7;
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

    // Score label on top
    ctx.fillStyle = '#66c0f4';
    ctx.font = 'bold 24px "Motiva Sans", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(dayData.score, centerX, barY - 20);

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

    // Productivity label
    ctx.fillStyle = '#66c0f4';
    ctx.font = '12px "Motiva Sans", Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Productivity Score`, centerX, height - padding.bottom + 30);
}

// Update trend chart using Canvas (matching analytics chart exactly)
function updateTrendChart(data) {
    const canvas = document.getElementById('productivity-trend-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Scale canvas for high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Use CSS size for calculations
    const width = rect.width;
    const height = rect.height;

    // Check if we have data
    if (!data || data.length === 0) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#16202d';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#8f98a0';
        ctx.font = '14px "Motiva Sans", Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No data available for this period', width / 2, height / 2);
        return;
    }

    // Special handling for single day
    if (data.length === 1) {
        renderSingleDayProductivityChart(ctx, width, height, data[0]);
        // Remove any existing event listeners
        canvas.onmousemove = null;
        canvas.onmouseleave = null;
        return;
    }

    // Prepare data points
    const dataPoints = data.map(item => ({
        date: item.date,
        score: item.score || 0,
        label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));

    const maxScore = Math.max(...dataPoints.map(d => d.score), 1);

    // Canvas dimensions
    const padding = { top: 30, right: 20, bottom: 40, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
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
        const value = maxScore * (1 - i / 5);
        const y = padding.top + (chartHeight / 5) * i;
        ctx.fillText(Math.round(value), padding.left - 10, y);
    }

    // Calculate points for the line and area
    const points = dataPoints.map((point, index) => ({
        x: padding.left + (chartWidth / (dataPoints.length - 1)) * index,
        y: padding.top + chartHeight - (point.score / maxScore) * chartHeight,
        score: point.score,
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

    // Draw points
    points.forEach((point) => {
        // Draw point with ring
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
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

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
            redrawChartWithHover(ctx, width, height, padding, chartWidth, chartHeight, dataPoints, maxScore, points, closestPoint, gradient, dpr);
        }
    };

    canvas.onmouseleave = () => {
        if (hoveredPoint) {
            hoveredPoint = null;
            canvas.style.cursor = 'default';
            // Redraw without hover state
            drawChartWithoutHover(ctx, width, height, padding, chartWidth, chartHeight, dataPoints, maxScore, points, gradient, dpr);
        }
    };
}

function drawChartWithoutHover(ctx, width, height, padding, chartWidth, chartHeight, dataPoints, maxScore, points, gradient, dpr) {
    // Save context and reset transform
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width * dpr, height * dpr);
    ctx.restore();

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
        const value = maxScore * (1 - i / 5);
        const y = padding.top + (chartHeight / 5) * i;
        ctx.fillText(Math.round(value), padding.left - 10, y);
    }

    // Draw area under the line
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

    // Draw points
    points.forEach((point) => {
        // Draw point with ring
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
}

function redrawChartWithHover(ctx, width, height, padding, chartWidth, chartHeight, dataPoints, maxScore, points, closestPoint, gradient, dpr) {
    // Save context and reset transform
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width * dpr, height * dpr);
    ctx.restore();

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
        const value = maxScore * (1 - i / 5);
        const y = padding.top + (chartHeight / 5) * i;
        ctx.fillText(Math.round(value), padding.left - 10, y);
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
        const tooltipText = `Score: ${closestPoint.score}`;
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
