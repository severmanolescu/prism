// Update insights and recommendations
function updateInsights(data) {
    const insights = [];
    const totalHours = data.totalTime / (1000 * 60 * 60);

    // Insight 1: Peak Productivity Hour
    if (data.peakProductivityHour && totalHours > 0) {
        const hour = data.peakProductivityHour.hour;
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

        insights.push({
            icon: '💡',
            title: 'Peak Performance',
            text: `You're most productive around ${displayHour} ${period}. Schedule important tasks during this time for best results.`,
            type: 'positive'
        });
    }

    // Insight 2: Context Switching
    const totalSessions = data.breakdown.productive.sessions + data.breakdown.neutral.sessions + data.breakdown.unproductive.sessions;
    if (totalHours > 0 && totalSessions > 0) {
        const switchesPerHour = Math.round(totalSessions / totalHours);
        if (switchesPerHour > 15) {
            insights.push({
                icon: '🔄',
                title: 'High Context Switching',
                text: `You're switching apps ${switchesPerHour} times per hour. Try batching similar tasks to improve focus.`,
                type: 'suggestion'
            });
        } else if (switchesPerHour <= 6) {
            insights.push({
                icon: '🎯',
                title: 'Great Focus',
                text: `You're maintaining excellent focus with ${switchesPerHour} app switches per hour. This helps build deep work sessions.`,
                type: 'positive'
            });
        }
    }

    // Insight 3: Deep Work Sessions
    if (data.deepWorkSessions && data.deepWorkSessions.count > 0) {
        const avgMinutes = Math.round(data.deepWorkSessions.avgDuration / (1000 * 60));
        insights.push({
            icon: '🌟',
            title: 'Deep Work Achievement',
            text: `You completed ${data.deepWorkSessions.count} deep work session${data.deepWorkSessions.count > 1 ? 's' : ''} (25+ minutes), averaging ${avgMinutes} minutes each. Excellent!`,
            type: 'positive'
        });
    } else if (data.breakdown.productive.time > 0 && totalHours >= 2) {
        insights.push({
            icon: '💎',
            title: 'Deep Work Opportunity',
            text: `Try maintaining focus on productive apps for 25+ minutes at a time to unlock deep work sessions.`,
            type: 'suggestion'
        });
    }

    // Insight 4: Productivity Score Trend (more positive framing)
    if (data.dailyScores && data.dailyScores.length >= 2) {
        const recentScores = data.dailyScores.slice(-3);
        const avgRecentScore = Math.round(recentScores.reduce((sum, day) => sum + day.score, 0) / recentScores.length);

        if (avgRecentScore >= 70) {
            const consecutiveDays = data.dailyScores.filter(day => day.score >= 70).length;
            insights.push({
                icon: '🔥',
                title: 'Productivity Streak',
                text: `Amazing! Your productivity score is ${avgRecentScore}. You've maintained high productivity for ${consecutiveDays} day${consecutiveDays > 1 ? 's' : ''}!`,
                type: 'positive'
            });
        } else if (avgRecentScore >= 50) {
            insights.push({
                icon: '📊',
                title: 'Good Progress',
                text: `Your productivity score is ${avgRecentScore}. You're building solid habits - keep it up!`,
                type: 'positive'
            });
        } else if (avgRecentScore > 0) {
            insights.push({
                icon: '🌱',
                title: 'Getting Started',
                text: `Every journey starts somewhere! Your productivity tracking is helping you build better awareness.`,
                type: 'positive'
            });
        }
    }

    // Insight 5: Productive time highlight
    if (data.breakdown.productive.time > 0) {
        const productiveHours = (data.breakdown.productive.time / (1000 * 60 * 60)).toFixed(1);
        const productivePercentage = data.breakdown.productive.percentage;

        if (productiveHours >= 2) {
            insights.push({
                icon: '⭐',
                title: 'Time Well Spent',
                text: `You've invested ${productiveHours} hours (${productivePercentage}%) in productive activities. That's great dedication!`,
                type: 'positive'
            });
        }
    }

    // Insight 6: Top Distraction (gentle suggestion)
    if (data.topUnproductive && data.topUnproductive.length > 0 && data.totalTime > 0) {
        const topDistraction = data.topUnproductive[0];
        const distractionHours = (topDistraction.total_time / (1000 * 60 * 60)).toFixed(1);
        const distractionPercentage = Math.round((topDistraction.total_time / data.totalTime) * 100);

        if (distractionPercentage > 30) {
            insights.push({
                icon: '⏰',
                title: 'Balance Opportunity',
                text: `${topDistraction.name} used ${distractionHours}h (${distractionPercentage}%). Small reductions here could free up time for your goals.`,
                type: 'suggestion'
            });
        }
    }

    // Insight 7: Most productive app
    if (data.topProductive && data.topProductive.length > 0) {
        const topApp = data.topProductive[0];
        const topAppHours = (topApp.total_time / (1000 * 60 * 60)).toFixed(1);

        insights.push({
            icon: '🏆',
            title: 'Top Productive App',
            text: `${topApp.name} is your productivity champion with ${topAppHours} hours of focused work!`,
            type: 'positive'
        });
    }

    // Insight 8: Productivity Balance
    const productivePercentage = data.breakdown.productive.percentage;

    if (productivePercentage > 60) {
        insights.push({
            icon: '✨',
            title: 'Excellent Balance',
            text: `${productivePercentage}% of your time is productive. You're maintaining a great work rhythm!`,
            type: 'positive'
        });
    }

    // Limit to 4 insights and render
    const selectedInsights = insights.slice(0, 4);
    const insightsContainer = document.getElementById('insightsContainer');

    if (insightsContainer) {
        if (selectedInsights.length === 0) {
            insightsContainer.innerHTML = '<p style="text-align: center; color: #8f98a0; padding: 40px;">Not enough data to generate insights yet.</p>';
        } else {
            insightsContainer.innerHTML = selectedInsights.map(insight => `
        <div class="insight-card">
          <div class="insight-icon">${insight.icon}</div>
          <div class="insight-content">
            <div class="insight-title">${insight.title}</div>
            <div class="insight-text">${insight.text}</div>
          </div>
        </div>
      `).join('');
        }
    }
}
