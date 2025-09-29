// Update today's stats display
async function updateTodayStats() {
    console.log('updateTodayStats called');
    try {
        console.log('Calling getTodayStats...');
        const stats = await window.electronAPI.getTodayStats();
        console.log('Stats received:', stats);
        
        const timeElement = document.getElementById('todayTotalTime');
        const countElement = document.getElementById('todayAppCount');
        
        if (timeElement) {
            timeElement.textContent = formatTime(stats.totalTime || 0);
        }
        
        if (countElement) {
            countElement.textContent = stats.appCount || 0;
        }
    } catch (error) {
        console.error('Error updating today stats:', error);
        const timeElement = document.getElementById('todayTotalTime');
        const countElement = document.getElementById('todayAppCount');
        if (timeElement) timeElement.textContent = '0h 0m';
        if (countElement) countElement.textContent = '0';
    }
}

// Initialize stats on page load
document.addEventListener('DOMContentLoaded', () => {
    updateTodayStats();
    
    // Update stats every minute
    setInterval(updateTodayStats, 60000);
});