// Render success rate line chart (canvas)
function renderSuccessRateChart(data) {
    const canvas = document.getElementById('successRateChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    canvas.width = containerWidth;
    // Use a simple aspect ratio based on width
    const aspectRatio = containerWidth < 400 ? 0.7 : 0.48;
    canvas.height = containerWidth * aspectRatio;

    const maxRate = 100;
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }

    // Draw Y-axis labels
    ctx.fillStyle = '#8f98a0';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
        const value = maxRate * (1 - i / 4);
        const y = padding.top + (chartHeight / 4) * i;
        ctx.fillText(`${value}%`, padding.left - 8, y);
    }

    // Calculate points
    const points = data.map((point, index) => {
        const rate = point.successRate !== null && point.total > 0 ? point.successRate : 0;
        return {
            x: padding.left + (chartWidth / (data.length - 1)) * index,
            y: padding.top + chartHeight - (rate / maxRate) * chartHeight,
            successRate: point.successRate,
            achieved: point.achieved,
            total: point.total,
            date: point.date
        };
    });

    // Draw area under line
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

    // Draw line
    ctx.strokeStyle = '#66c0f4';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.stroke();

    // Draw points and labels
    points.forEach((point, index) => {
        // Draw point
        ctx.fillStyle = '#66c0f4';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw X-axis label
        const date = new Date(point.date);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const label = `${days[date.getDay()]} ${date.getDate()}`;

        ctx.fillStyle = '#8f98a0';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, point.x, height - padding.bottom + 8);
    });

    // Add hover interaction
    let hoveredPoint = null;

    canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        let closestPoint = null;
        let minDist = Infinity;
        points.forEach(point => {
            const dist = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));
            if (dist < minDist && dist < 30) {
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
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, width, height);

            // Draw grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = padding.top + (chartHeight / 4) * i;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(width - padding.right, y);
                ctx.stroke();
            }

            // Draw Y-axis labels
            ctx.fillStyle = '#8f98a0';
            ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (let i = 0; i <= 4; i++) {
                const value = maxRate * (1 - i / 4);
                const y = padding.top + (chartHeight / 4) * i;
                ctx.fillText(`${value}%`, padding.left - 8, y);
            }

            // Draw area under line
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

            // Draw line
            ctx.strokeStyle = '#66c0f4';
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            points.forEach(point => ctx.lineTo(point.x, point.y));
            ctx.stroke();

            // Draw points and labels
            points.forEach((point, index) => {
                const isHovered = point === closestPoint;
                const radius = isHovered ? 6 : 4;

                // Draw point
                ctx.fillStyle = isHovered ? '#ffffff' : '#66c0f4';
                ctx.beginPath();
                ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = isHovered ? '#66c0f4' : 'rgba(0, 0, 0, 0.2)';
                ctx.beginPath();
                ctx.arc(point.x, point.y, isHovered ? 2.5 : 1.5, 0, Math.PI * 2);
                ctx.fill();

                // Draw X-axis label
                const date = new Date(point.date);
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const label = `${days[date.getDay()]} ${date.getDate()}`;

                ctx.fillStyle = isHovered ? '#ffffff' : '#8f98a0';
                ctx.font = isHovered ? 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' : '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(label, point.x, height - padding.bottom + 8);
            });

            // Draw tooltip if hovering
            if (closestPoint) {
                const tooltipText = closestPoint.total > 0
                    ? `${closestPoint.successRate}%`
                    : 'No goals';

                ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
                const tooltipWidth = ctx.measureText(tooltipText).width + 20;
                const tooltipHeight = 30;
                const tooltipPadding = 10;
                let tooltipX = closestPoint.x - tooltipWidth / 2;
                let tooltipY = closestPoint.y - tooltipHeight - tooltipPadding;

                // Keep tooltip in bounds
                if (tooltipX < padding.left) tooltipX = padding.left;
                if (tooltipX + tooltipWidth > width - padding.right) tooltipX = width - padding.right - tooltipWidth;
                if (tooltipY < padding.top) tooltipY = closestPoint.y + tooltipPadding;

                // Draw tooltip background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.strokeStyle = '#66c0f4';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 4);
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
        renderSuccessRateChart(data);
    };
}
