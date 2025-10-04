// Update app switching frequency chart
function updateAppSwitchingChart(switchingData) {
    const canvas = document.getElementById('app-switching-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 20, bottom: 40, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!switchingData || switchingData.length === 0) {
        ctx.fillStyle = '#8f98a0';
        ctx.font = '12px "Motiva Sans", Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No switching data available', width / 2, height / 2);
        return;
    }

    const maxSwitches = Math.max(...switchingData.map(d => d.switches), 1);
    const isSingleDay = switchingData.length === 1;

    // Store bar positions for hover detection
    const bars = [];

    // Draw function
    const draw = (hoveredIndex = -1) => {
        ctx.clearRect(0, 0, width, height);

        if (isSingleDay) {
            // Single bar for one day (matching Productivity Trend style)
            const barWidth = 100;
            const centerX = width / 2;

            // Calculate bar height based on switches
            const maxBarHeight = chartHeight;
            const switchesPercentage = switchingData[0].switches / maxSwitches;
            const barHeight = maxBarHeight * switchesPercentage * 0.7;
            const barY = padding.top + (maxBarHeight - barHeight);

            // Update bar position for hover detection
            bars.length = 0;
            bars.push({ x: centerX - barWidth / 2, y: barY, width: barWidth, height: barHeight, data: switchingData[0] });

            // Create gradient for bar
            const gradient = ctx.createLinearGradient(centerX, barY, centerX, barY + barHeight);
            gradient.addColorStop(0, '#66c0f4');
            gradient.addColorStop(1, '#417a9b');

            // Draw the bar with rounded corners
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(centerX - barWidth / 2, barY, barWidth, barHeight, 4);
            ctx.fill();

            // Draw top cap
            ctx.fillStyle = '#66c0f4';
            ctx.beginPath();
            ctx.roundRect(centerX - barWidth / 2, barY - 3, barWidth, 6, 3);
            ctx.fill();

            // Switches count label on top
            ctx.fillStyle = '#66c0f4';
            ctx.font = 'bold 24px "Motiva Sans", Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(switchingData[0].switches, centerX, barY - 20);

            // Date label at bottom
            const date = new Date(switchingData[0].date);
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

            // "App Switches" label
            ctx.fillStyle = '#66c0f4';
            ctx.font = '12px "Motiva Sans", Arial';
            ctx.textAlign = 'center';
            ctx.fillText('App Switches', centerX, height - padding.bottom + 30);
        } else {
            // Line chart for multiple days (matching Productivity Trend style)
            const points = [];

            // Calculate points
            switchingData.forEach((item, index) => {
                const x = padding.left + (index / (switchingData.length - 1 || 1)) * chartWidth;
                const y = padding.top + chartHeight - (item.switches / maxSwitches) * chartHeight;
                const date = new Date(item.date);
                const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                points.push({ x, y, data: item, switches: item.switches, label });

                if (bars.length < switchingData.length) {
                    bars.push({ x: x - 20, y: y - 20, width: 40, height: 40, data: item });
                }
            });

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
                const value = maxSwitches * (1 - i / 5);
                const y = padding.top + (chartHeight / 5) * i;
                ctx.fillText(Math.round(value), padding.left - 10, y);
            }

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

            // Draw vertical line to hovered point
            if (hoveredIndex >= 0) {
                const hoveredPoint = points[hoveredIndex];
                ctx.strokeStyle = 'rgba(102, 192, 244, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(hoveredPoint.x, padding.top);
                ctx.lineTo(hoveredPoint.x, height - padding.bottom);
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
            points.forEach((point, index) => {
                const isHovered = index === hoveredIndex;
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
            if (hoveredIndex >= 0) {
                const hoveredPoint = points[hoveredIndex];
                const tooltipText = `${hoveredPoint.switches} switches`;
                ctx.font = 'bold 14px "Motiva Sans", Arial';
                const tooltipWidth = ctx.measureText(tooltipText).width + 24;
                const tooltipHeight = 36;
                const tooltipPadding = 12;
                let tooltipX = hoveredPoint.x - tooltipWidth / 2;
                let tooltipY = hoveredPoint.y - tooltipHeight - tooltipPadding;

                // Keep tooltip in bounds
                if (tooltipX < padding.left) tooltipX = padding.left;
                if (tooltipX + tooltipWidth > width - padding.right) tooltipX = width - padding.right - tooltipWidth;
                if (tooltipY < padding.top) tooltipY = hoveredPoint.y + tooltipPadding;

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

        // Only draw axes for single day view (multi-day has grid)
        if (isSingleDay) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding.left, padding.top + chartHeight);
            ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(padding.left, padding.top);
            ctx.lineTo(padding.left, padding.top + chartHeight);
            ctx.stroke();
        }
    };

    // Initial draw
    draw();

    // Add hover effect
    canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let hoveredIndex = -1;

        bars.forEach((bar, index) => {
            if (mouseX >= bar.x && mouseX <= bar.x + bar.width &&
                mouseY >= bar.y && mouseY <= bar.y + bar.height) {
                hoveredIndex = index;
                canvas.style.cursor = 'pointer';
            }
        });

        if (hoveredIndex === -1) {
            canvas.style.cursor = 'default';
        }

        draw(hoveredIndex);
    };

    canvas.onmouseleave = () => {
        canvas.style.cursor = 'default';
        draw();
    };
}
