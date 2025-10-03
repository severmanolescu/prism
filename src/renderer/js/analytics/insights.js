function updateInsights(data) {
  const insightsGrid = document.querySelector('.insights-grid');
  if (!insightsGrid) return;

  insightsGrid.innerHTML = '';

  // 1. Focus Time (Longest Session)
  if (data.longestSession && data.longestSession.duration) {
    const focusTime = formatTime(data.longestSession.duration);
    const sessionDate = new Date(data.longestSession.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    insightsGrid.innerHTML += `
      <div class="insight-card">
        <div class="insight-icon">🎯</div>
        <div class="insight-content">
          <div class="insight-title">Focus Time</div>
          <div class="insight-text">Longest session: ${focusTime} on ${data.longestSession.app_name} (${sessionDate}).</div>
        </div>
      </div>
    `;
  }

  // 3. Variety Score (App Diversity)
  const varietyPercentage = Math.round((data.overallStats.uniqueApps / (data.topApps.length || 1)) * 100);
  let varietyMessage = '';
  if (data.overallStats.uniqueApps === 1) {
    varietyMessage = 'Highly focused - using only 1 app.';
  } else if (data.overallStats.uniqueApps <= 3) {
    varietyMessage = `Very focused - using ${data.overallStats.uniqueApps} different apps.`;
  } else if (data.overallStats.uniqueApps <= 7) {
    varietyMessage = `Balanced variety - ${data.overallStats.uniqueApps} apps used regularly.`;
  } else {
    varietyMessage = `High variety - switching between ${data.overallStats.uniqueApps} different apps.`;
  }

  insightsGrid.innerHTML += `
    <div class="insight-card">
      <div class="insight-icon">🎨</div>
      <div class="insight-content">
        <div class="insight-title">Variety Score</div>
        <div class="insight-text">${varietyMessage}</div>
      </div>
    </div>
  `;

  // 4. Time of Day Pattern (Peak Activity Hours)
  if (data.hourlyBreakdown && data.hourlyBreakdown.length > 0) {
    // Find peak hours
    let maxTime = 0;
    let peakHours = [];

    data.hourlyBreakdown.forEach(hour => {
      if (hour.total_time > maxTime) {
        maxTime = hour.total_time;
        peakHours = [hour.hour];
      } else if (hour.total_time === maxTime) {
        peakHours.push(hour.hour);
      }
    });

    // Group consecutive hours into ranges
    const formatHour = (h) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${hour12} ${period}`;
    };

    let peakTimeText = '';
    if (peakHours.length === 1) {
      peakTimeText = formatHour(peakHours[0]);
    } else if (peakHours.length === 2) {
      peakTimeText = `${formatHour(peakHours[0])} and ${formatHour(peakHours[1])}`;
    } else {
      const firstHour = Math.min(...peakHours);
      const lastHour = Math.max(...peakHours);
      peakTimeText = `${formatHour(firstHour)} - ${formatHour(lastHour)}`;
    }

    insightsGrid.innerHTML += `
      <div class="insight-card">
        <div class="insight-icon">⏰</div>
        <div class="insight-content">
          <div class="insight-title">Peak Activity Hours</div>
          <div class="insight-text">Most active around ${peakTimeText} (${formatTime(maxTime)} total).</div>
        </div>
      </div>
    `;
  }

  // 5. App Switching Rate
  if (data.overallStats.totalSessions > 0 && data.overallStats.totalTime > 0) {
    const totalHours = data.overallStats.totalTime / (1000 * 60 * 60);
    const switchesPerHour = Math.round(data.overallStats.totalSessions / totalHours);

    let switchingMessage = '';
    if (switchesPerHour <= 2) {
      switchingMessage = `Very focused - ${switchesPerHour} app switches per hour on average.`;
    } else if (switchesPerHour <= 5) {
      switchingMessage = `Moderately focused - ${switchesPerHour} app switches per hour.`;
    } else if (switchesPerHour <= 10) {
      switchingMessage = `Active switching - ${switchesPerHour} app switches per hour.`;
    } else {
      switchingMessage = `Highly dynamic - ${switchesPerHour} app switches per hour.`;
    }

    insightsGrid.innerHTML += `
      <div class="insight-card">
        <div class="insight-icon">🔄</div>
        <div class="insight-content">
          <div class="insight-title">App Switching Rate</div>
          <div class="insight-text">${switchingMessage}</div>
        </div>
      </div>
    `;
  }
}
