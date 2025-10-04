// Update productivity by hour chart
function updateProductivityByHourChart(hourlyData) {
    const canvas = document.getElementById('productivity-by-hour-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 40, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!hourlyData || hourlyData.length === 0) {
        ctx.fillStyle = '#8f98a0';
        ctx.font = '12px "Motiva Sans", Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No hourly data available', width / 2, height / 2);
        return;
    }

    // Process data into hour buckets with stacked productivity levels
    const hourData = {};
    for (let h = 0; h < 24; h++) {
        hourData[h] = { productive: 0, neutral: 0, unproductive: 0, total: 0 };
    }

    hourlyData.forEach(item => {
        const hour = item.hour;
        const level = item.productivity_level;
        hourData[hour][level] = item.total_time;
        hourData[hour].total += item.total_time;
    });

    const maxTime = Math.max(...Object.values(hourData).map(h => h.total), 1);
    const barWidth = chartWidth / 24 * 0.8;
    const spacing = chartWidth / 24;

    // Store bar positions for hover detection
    const bars = [];

    // Draw function
    const draw = (hoveredIndex = -1) => {
        ctx.clearRect(0, 0, width, height);

        // Store tooltip data for drawing after all bars
        let tooltipData = null;

        // Draw stacked bars
        Object.keys(hourData).forEach((hour, index) => {
            const data = hourData[hour];
            const x = padding.left + index * spacing + (spacing - barWidth) / 2;
            let currentY = padding.top + chartHeight;
            const isHovered = index === hoveredIndex;

            // Store bar position
            if (bars.length < 24) {
                bars.push({ x, y: currentY, width: barWidth, hour, data });
            }

            // Apply brightness if hovered
            const brighten = isHovered ? 1.2 : 1;

            // Draw unproductive (bottom)
            if (data.unproductive > 0) {
                const barHeight = (data.unproductive / maxTime) * chartHeight;
                currentY -= barHeight;
                ctx.fillStyle = isHovered ? '#ff5c4c' : '#e74c3c';
                ctx.fillRect(x, currentY, barWidth, barHeight);
            }

            // Draw neutral (middle)
            if (data.neutral > 0) {
                const barHeight = (data.neutral / maxTime) * chartHeight;
                currentY -= barHeight;
                ctx.fillStyle = isHovered ? '#ffac22' : '#f39c12';
                ctx.fillRect(x, currentY, barWidth, barHeight);
            }

            // Draw productive (top)
            if (data.productive > 0) {
                const barHeight = (data.productive / maxTime) * chartHeight;
                currentY -= barHeight;
                ctx.fillStyle = isHovered ? '#96c827' : '#86b817';
                ctx.fillRect(x, currentY, barWidth, barHeight);
            }

            // Draw hour labels (show every 3 hours)
            if (index % 3 === 0) {
                const hourNum = parseInt(hour);
                const displayHour = hourNum === 0 ? '12 AM' : hourNum < 12 ? `${hourNum} AM` : hourNum === 12 ? '12 PM' : `${hourNum - 12} PM`;
                ctx.fillStyle = '#8f98a0';
                ctx.font = '9px "Motiva Sans", Arial';
                ctx.textAlign = 'center';
                ctx.fillText(displayHour, x + barWidth / 2, height - padding.bottom + 20);
            }

            // Store tooltip data for later rendering (on top of all bars)
            if (isHovered && data.total > 0) {
                const hourNum = parseInt(hour);
                const displayHour = hourNum === 0 ? '12 AM' : hourNum < 12 ? `${hourNum} AM` : hourNum === 12 ? '12 PM' : `${hourNum - 12} PM`;

                const productiveTime = formatTime(data.productive);
                const neutralTime = formatTime(data.neutral);
                const unproductiveTime = formatTime(data.unproductive);
                const totalTime = formatTime(data.total);

                const tooltipLines = [
                    displayHour,
                    `Total: ${totalTime}`,
                    data.productive > 0 ? `Productive: ${productiveTime}` : null,
                    data.neutral > 0 ? `Neutral: ${neutralTime}` : null,
                    data.unproductive > 0 ? `Unproductive: ${unproductiveTime}` : null
                ].filter(line => line !== null);

                tooltipData = { x, currentY, tooltipLines };
            }
        });

        // Draw tooltip on top of all bars
        if (tooltipData) {
            const { x, currentY, tooltipLines } = tooltipData;

            ctx.font = '11px "Motiva Sans", Arial';
            const maxWidth = Math.max(...tooltipLines.map(line => ctx.measureText(line).width));
            const tooltipWidth = maxWidth + 16;
            const tooltipHeight = tooltipLines.length * 16 + 8;
            let tooltipX = x + barWidth / 2 - tooltipWidth / 2;
            let tooltipY = currentY - tooltipHeight - 10;

            // Keep tooltip in bounds
            if (tooltipY < padding.top) {
                // If tooltip goes above top, position it to the side of the bar
                tooltipY = Math.max(padding.top, currentY);
                tooltipX = x + barWidth + 10;
                // If still goes off right, try left side
                if (tooltipX + tooltipWidth > width - padding.right) {
                    tooltipX = x - tooltipWidth - 10;
                    // If goes off left, center it vertically in available space
                    if (tooltipX < padding.left) {
                        tooltipX = x + barWidth / 2 - tooltipWidth / 2;
                        tooltipY = padding.top + (chartHeight - tooltipHeight) / 2;
                    }
                }
            }
            // Ensure horizontal bounds
            if (tooltipX < padding.left) {
                tooltipX = padding.left;
            }
            if (tooltipX + tooltipWidth > width - padding.right) {
                tooltipX = width - padding.right - tooltipWidth;
            }
            // Ensure vertical bounds
            if (tooltipY + tooltipHeight > height - padding.bottom) {
                tooltipY = height - padding.bottom - tooltipHeight;
            }

            // Draw tooltip background
            ctx.fillStyle = 'rgba(17, 37, 52, 0.98)';
            ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

            // Draw tooltip border
            ctx.strokeStyle = '#66c0f4';
            ctx.lineWidth = 2;
            ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

            // Draw tooltip text
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            tooltipLines.forEach((line, i) => {
                ctx.fillText(line, tooltipX + 8, tooltipY + 16 + i * 16);
            });
        }

        // Draw axes
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

        // Y-axis label
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#8f98a0';
        ctx.font = '11px "Motiva Sans", Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Time Spent', 0, 0);
        ctx.restore();
    };

    // Draw legend (after draw so it's always on top)
    const drawLegend = () => {
        const legendY = 10;
        const legendX = width - padding.right - 240;

        ctx.fillStyle = '#86b817';
        ctx.fillRect(legendX, legendY, 12, 12);
        ctx.fillStyle = '#c7d5e0';
        ctx.font = '10px "Motiva Sans", Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Productive', legendX + 16, legendY + 10);

        ctx.fillStyle = '#f39c12';
        ctx.fillRect(legendX + 80, legendY, 12, 12);
        ctx.fillStyle = '#c7d5e0';
        ctx.fillText('Neutral', legendX + 96, legendY + 10);

        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(legendX + 145, legendY, 12, 12);
        ctx.fillStyle = '#c7d5e0';
        ctx.fillText('Unproductive', legendX + 161, legendY + 10);
    };

    // Initial draw
    draw();
    drawLegend();

    // Add hover effect
    canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let hoveredIndex = -1;
        bars.forEach((bar, index) => {
            if (mouseX >= bar.x && mouseX <= bar.x + bar.width &&
                mouseY >= padding.top && mouseY <= bar.y) {
                hoveredIndex = index;
                canvas.style.cursor = 'pointer';
            }
        });

        if (hoveredIndex === -1) {
            canvas.style.cursor = 'default';
        }

        draw(hoveredIndex);
        drawLegend();
    };

    canvas.onmouseleave = () => {
        canvas.style.cursor = 'default';
        draw();
        drawLegend();
    };
}
