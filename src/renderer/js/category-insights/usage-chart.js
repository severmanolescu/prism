// Usage chart for category insights (Similar to app-details usage-over-time-chart.js)

function updateUsageChart(categoryData, period) {
    let data, labelFormat;

    switch(period) {
        case 'daily':
            data = getLast7DaysData(categoryData.weeklyUsage || []);
            labelFormat = (date) => {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const d = new Date(date);
                return `${days[d.getDay()]} ${d.getDate()}`;
            };
            break;
        case 'weekly':
            data = getLast12WeeksData(categoryData);
            labelFormat = (date) => {
                const d = new Date(date);
                return `Week ${getWeekNumber(d)}`;
            };
            break;
        case 'monthly':
            data = getLast12MonthsData(categoryData);
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

function getLast12WeeksData(categoryData) {
    const weeks = [];
    const monthlyUsage = categoryData.monthlyUsage || [];

    for (let i = 11; i >= 0; i--) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - (i * 7));
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6);

        let weekDuration = 0;
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const dayData = monthlyUsage.find(m => m.date === dateStr);
            if (dayData) weekDuration += dayData.total_duration;
        }

        weeks.push({
            date: endDate.toISOString().split('T')[0],
            duration: weekDuration
        });
    }
    return weeks;
}

function getLast12MonthsData(categoryData) {
    const months = [];
    const monthlyUsage = categoryData.monthlyUsage || [];

    for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        date.setDate(1);

        const year = date.getFullYear();
        const month = date.getMonth();

        let monthDuration = 0;
        monthlyUsage.forEach(dayData => {
            const dayDate = new Date(dayData.date);
            if (dayDate.getFullYear() === year && dayDate.getMonth() === month) {
                monthDuration += dayData.total_duration;
            }
        });

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
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    canvas.width = containerWidth;
    canvas.height = containerWidth * 0.4;

    const dataPoints = chartData.map(item => ({
        date: item.date,
        duration: item.duration,
        label: labelFormat(item.date)
    }));

    const maxDuration = Math.max(...dataPoints.map(d => d.duration), 1);
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0a1e2f';
    ctx.fillRect(0, 0, width, height);

    // Draw grid and labels
    ctx.strokeStyle = '#1a3548';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }

    ctx.fillStyle = '#8f98a0';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
        const value = maxDuration * (1 - i / 5);
        const y = padding.top + (chartHeight / 5) * i;
        ctx.fillText(formatTime(value), padding.left - 10, y);
    }

    const points = dataPoints.map((point, index) => ({
        x: padding.left + (chartWidth / (dataPoints.length - 1)) * index,
        y: padding.top + chartHeight - (point.duration / maxDuration) * chartHeight,
        duration: point.duration,
        label: point.label
    }));

    // Draw area gradient
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
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.stroke();

    // Draw points and labels
    points.forEach((point) => {
        ctx.fillStyle = '#66c0f4';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0a1e2f';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#8f98a0';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(point.label, point.x, height - padding.bottom + 10);
    });
}
