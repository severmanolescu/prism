let categoryData = null;
let currentChartPeriod = 'daily';
let currentCategoryName = null;

// Listen for messages from parent window
window.addEventListener('message', (event) => {
    if (event.data.type === 'CATEGORY_INSIGHTS') {
        categoryData = event.data.data;
        currentCategoryName = event.data.categoryName;
        loadCategoryInsights();
        initializeDateRange();
    }
});

// Initialize date range controls
function initializeDateRange() {
    // Set default dates
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');

    if (startInput) startInput.value = startDate.toISOString().split('T')[0];
    if (endInput) endInput.value = endDate.toISOString().split('T')[0];

    // Add event listeners for date changes
    startInput?.addEventListener('change', handleDateRangeChange);
    endInput?.addEventListener('change', handleDateRangeChange);

    // Add event listeners for preset buttons
    document.querySelectorAll('.time-range-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.time-range-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const range = e.target.textContent.toLowerCase();
            const { start, end } = getDateRangeFromPreset(range);

            if (startInput) startInput.value = start;
            if (endInput) endInput.value = end;

            handleDateRangeChange();
        });
    });
}

function getDateRangeFromPreset(preset) {
    const end = new Date();
    const start = new Date();

    switch (preset) {
        case 'today':
            // Today only
            break;
        case 'week':
            start.setDate(end.getDate() - 7);
            break;
        case 'month':
            start.setDate(end.getDate() - 30);
            break;
        case 'year':
            start.setFullYear(end.getFullYear() - 1);
            break;
        case 'all time':
            start.setFullYear(2020, 0, 1); // Arbitrary start date
            break;
    }

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

async function handleDateRangeChange() {
    const startDate = document.getElementById('start-date')?.value;
    const endDate = document.getElementById('end-date')?.value;

    if (!startDate || !endDate || !currentCategoryName) return;

    // Calculate days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Update date info
    const dateInfo = document.querySelector('.date-info');
    if (dateInfo) {
        dateInfo.textContent = `${days} days of data available`;
    }

    // Request fresh data from parent with new date range
    // This would need to be implemented in the parent window handler
    // For now, we'll just reload with existing data filtered
    loadCategoryInsights();
}

// Load category insights
async function loadCategoryInsights() {
    if (!categoryData) {
        console.error('No category data available');
        return;
    }

    try {
        const { category, stats } = categoryData;

        // Update hero section
        updateHeroSection(category);

        // Update quick stats
        updateQuickStats(stats);

        // Update usage chart
        updateUsageChart(categoryData, currentChartPeriod);

        // Setup chart tabs
        setupChartTabs(categoryData);

        // Update monthly calendar
        updateMonthlyCalendar(categoryData);

        // Update top apps
        updateTopApps(categoryData.topApps || []);

        // Update day of week chart
        updateDayOfWeekChart(categoryData.dayOfWeekUsage || []);

        // Update heatmap
        updateHeatmap(categoryData.heatmapData || []);

        // Update insights
        updateInsights(categoryData);

        // Update category comparison
        updateCategoryComparison(categoryData);

    } catch (error) {
        console.error('Error loading category insights:', error);
    }
}

function updateHeroSection(category) {
    const heroTitle = document.querySelector('.category-title');
    const heroIcon = document.querySelector('.category-icon-large');
    const heroBg = document.querySelector('.category-hero');

    if (heroTitle) {
        heroTitle.textContent = category.name;
    }

    if (heroIcon) {
        heroIcon.textContent = category.icon || '📁';
    }

    if (heroBg && category.color) {
        // Convert hex to RGB for gradient (matching app-details)
        const rgb = hexToRgb(category.color);

        if (rgb) {
            const gradient = `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8) 0%, rgba(${Math.floor(rgb.r * 0.7)}, ${Math.floor(rgb.g * 0.7)}, ${Math.floor(rgb.b * 0.7)}, 0.9) 100%)`;
            heroBg.style.background = gradient;
        }
    }
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function updateQuickStats(stats) {
    const statValues = document.querySelectorAll('.quick-stat-value');

    if (statValues[0]) statValues[0].textContent = formatTime(stats.totalTime || 0);
    if (statValues[1]) statValues[1].textContent = stats.appCount || 0;
    if (statValues[2]) statValues[2].textContent = formatTime(stats.avgDaily || 0);
    if (statValues[3]) statValues[3].textContent = stats.sessionCount || 0;
    if (statValues[4]) statValues[4].textContent = formatTime(stats.avgSession || 0);
    if (statValues[5]) statValues[5].textContent = `${(stats.usagePercentage || 0).toFixed(1)}%`;
}

function setupChartTabs(data) {
    const tabs = document.querySelectorAll('.chart-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentChartPeriod = tab.dataset.period;
            updateUsageChart(data, currentChartPeriod);
        });
    });
}

function updateMonthlyCalendar(data) {
    const calendar = document.querySelector('.monthly-calendar');
    if (!calendar) return;

    const monthlyData = data.monthlyUsage || [];

    if (monthlyData.length === 0) {
        calendar.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 20px; grid-column: 1 / -1;">No data available for the last 30 days</div>';
        return;
    }

    const maxDuration = Math.max(...monthlyData.map(d => d.total_duration || 0), 1);

    // Get last 30 days
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.toISOString().split('T')[0]);
    }

    let html = [];

    // Add day labels
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayLabels.forEach(label => {
        html.push(`<div class="calendar-day-label">${label}</div>`);
    });

    // Add empty cells for alignment
    const firstDay = new Date(days[0]).getDay();
    for (let i = 0; i < firstDay; i++) {
        html.push('<div class="calendar-day empty"></div>');
    }

    // Add calendar days
    days.forEach(date => {
        const dayData = monthlyData.find(d => d.date === date);
        const duration = dayData?.total_duration || 0;
        const intensity = duration > 0 ? 0.2 + (duration / maxDuration) * 0.8 : 0.05;
        const day = new Date(date).getDate();

        html.push(`
            <div class="calendar-day"
                 style="background: rgba(102, 192, 244, ${intensity});"
                 title="${date}: ${formatTime(duration)}">
                ${day}
            </div>
        `);
    });

    calendar.innerHTML = html.join('');

    // Update trend stats
    updateTrendStats(data.stats);
}

function updateTrendStats(stats) {
    const trendStats = document.querySelectorAll('.trend-stat');
    if (trendStats.length < 4) return;

    const thisWeek = stats.thisWeek || 0;
    const lastWeek = stats.lastWeek || 0;
    const peakDay = stats.peakDay || 0;
    const usagePercentage = stats.usagePercentage || 0;

    const weeklyChange = lastWeek > 0
        ? ((thisWeek - lastWeek) / lastWeek) * 100
        : (thisWeek > 0 ? 100 : 0);

    // This Week
    trendStats[0].querySelector('.trend-value').textContent = formatTime(thisWeek);
    const changeEl = trendStats[0].querySelector('.trend-change');
    changeEl.textContent = `${weeklyChange >= 0 ? '+' : ''}${Math.round(weeklyChange)}%`;
    changeEl.className = `trend-change ${weeklyChange >= 0 ? 'positive' : 'negative'}`;

    // Last Week
    trendStats[1].querySelector('.trend-value').textContent = formatTime(lastWeek);

    // Peak Day
    trendStats[2].querySelector('.trend-value').textContent = formatTime(peakDay);

    // All Categories
    trendStats[3].querySelector('.trend-value').textContent = `${usagePercentage.toFixed(1)}%`;
}

// Helper function to adjust color brightness
function adjustBrightness(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
}
