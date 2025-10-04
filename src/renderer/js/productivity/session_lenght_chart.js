// Update session length distribution chart
function updateSessionLengthChart(sessionData) {
    const canvas = document.getElementById('session-length-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!sessionData || sessionData.length === 0) {
        ctx.fillStyle = '#8f98a0';
        ctx.font = '12px "Motiva Sans", Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No session data available', width / 2, height / 2);
        return;
    }

    // Define all buckets to ensure complete axis
    const allBuckets = ['0-15m', '15-30m', '30-60m', '1-2h', '2-4h', '4h+'];
    const dataMap = {};
    sessionData.forEach(d => {
        dataMap[d.bucket] = d.count;
    });

    const data = allBuckets.map(bucket => ({
        bucket,
        count: dataMap[bucket] || 0
    }));

    const maxCount = Math.max(...data.map(d => d.count), 1);
    const barWidth = chartWidth / data.length * 0.7;
    const spacing = chartWidth / data.length;

    // Store bar positions for hover detection
    const bars = [];

    // Draw function
    const draw = (hoveredIndex = -1) => {
        ctx.clearRect(0, 0, width, height);

        // Draw bars
        data.forEach((item, index) => {
            const barHeight = (item.count / maxCount) * chartHeight;
            const x = padding.left + index * spacing + (spacing - barWidth) / 2;
            const y = padding.top + chartHeight - barHeight;

            // Store bar position
            if (bars.length < data.length) {
                bars.push({ x, y, width: barWidth, height: barHeight, data: item });
            }

            // Draw bar with gradient (brighter if hovered)
            const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
            if (index === hoveredIndex) {
                gradient.addColorStop(0, '#76c9f7');
                gradient.addColorStop(1, '#4e8ab1');
            } else {
                gradient.addColorStop(0, '#66c0f4');
                gradient.addColorStop(1, '#417a9b');
            }
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);

            // Draw count label on top of bar
            if (item.count > 0) {
                ctx.fillStyle = '#c7d5e0';
                ctx.font = '11px "Motiva Sans", Arial';
                ctx.textAlign = 'center';
                ctx.fillText(item.count, x + barWidth / 2, y - 5);
            }

            // Draw x-axis labels
            ctx.fillStyle = '#8f98a0';
            ctx.font = '10px "Motiva Sans", Arial';
            ctx.textAlign = 'center';
            ctx.fillText(item.bucket, x + barWidth / 2, height - padding.bottom + 20);
        });

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
        ctx.fillText('Number of Sessions', 0, 0);
        ctx.restore();
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
