
function updateMilestones(details) {
  const milestonesGrid = document.querySelector('.milestones-grid');
  if (!milestonesGrid) return;

  const stats = details.stats;
  const milestones = [];

  // Convert totalTime to hours
  const totalHours = Math.floor(stats.totalTime / (1000 * 60 * 60));
  const totalMinutes = Math.floor(stats.totalTime / (1000 * 60));

  // Time-based milestones
  if (totalHours >= 1000) {
    milestones.push({
      icon: '🏆',
      title: '1000+ Hours',
      value: 'Legendary',
      priority: 1
    });
  } else if (totalHours >= 500) {
    milestones.push({
      icon: '🏆',
      title: '500+ Hours',
      value: 'Master',
      priority: 2
    });
  } else if (totalHours >= 100) {
    milestones.push({
      icon: '🏆',
      title: '100+ Hours',
      value: 'Achieved',
      priority: 3
    });
  } else if (totalHours >= 50) {
    milestones.push({
      icon: '🏆',
      title: 'First 50 Hours',
      value: 'Achieved',
      priority: 4
    });
  } else if (totalHours >= 10) {
    milestones.push({
      icon: '🏆',
      title: 'First 10 Hours',
      value: 'Achieved',
      priority: 5
    });
  } else if (totalMinutes >= 60) {
    milestones.push({
      icon: '⏱️',
      title: 'First Hour',
      value: 'Achieved',
      priority: 6
    });
  }

  // Streak milestone
  if (stats.streak >= 30) {
    milestones.push({
      icon: '🔥',
      title: `${stats.streak} Day Streak`,
      value: 'Unstoppable!',
      priority: 1
    });
  } else if (stats.streak >= 7) {
    milestones.push({
      icon: '🔥',
      title: `${stats.streak} Day Streak`,
      value: 'On Fire!',
      priority: 3
    });
  } else if (stats.streak >= 3) {
    milestones.push({
      icon: '🔥',
      title: `${stats.streak} Day Streak`,
      value: 'Active',
      priority: 5
    });
  } else if (stats.streak > 0) {
    milestones.push({
      icon: '📅',
      title: `${stats.streak} Day${stats.streak > 1 ? 's' : ''}`,
      value: 'Started',
      priority: 6
    });
  }

  // Session count milestone
  if (stats.sessionCount >= 1000) {
    milestones.push({
      icon: '📊',
      title: '1000+ Sessions',
      value: 'Veteran',
      priority: 2
    });
  } else if (stats.sessionCount >= 500) {
    milestones.push({
      icon: '📊',
      title: '500+ Sessions',
      value: 'Experienced',
      priority: 3
    });
  } else if (stats.sessionCount >= 100) {
    milestones.push({
      icon: '📊',
      title: '100+ Sessions',
      value: 'Regular',
      priority: 4
    });
  } else if (stats.sessionCount >= 50) {
    milestones.push({
      icon: '📊',
      title: '50+ Sessions',
      value: 'Frequent',
      priority: 5
    });
  }

  // Peak usage milestone (longest session)
  const longestHours = Math.floor(stats.longestSession / (1000 * 60 * 60));
  if (longestHours >= 8) {
    milestones.push({
      icon: '📈',
      title: 'Peak Usage',
      value: formatTime(stats.longestSession),
      priority: 2
    });
  } else if (longestHours >= 4) {
    milestones.push({
      icon: '📈',
      title: 'Peak Session',
      value: formatTime(stats.longestSession),
      priority: 4
    });
  } else if (stats.longestSession > 0) {
    milestones.push({
      icon: '📈',
      title: 'Longest Session',
      value: formatTime(stats.longestSession),
      priority: 5
    });
  }

  // Weekly usage milestone
  const weeklyHours = Math.floor(stats.thisWeek / (1000 * 60 * 60));
  if (weeklyHours >= 40) {
    milestones.push({
      icon: '⭐',
      title: 'Heavy This Week',
      value: formatTime(stats.thisWeek),
      priority: 1
    });
  } else if (weeklyHours >= 20) {
    milestones.push({
      icon: '⭐',
      title: 'Active This Week',
      value: formatTime(stats.thisWeek),
      priority: 3
    });
  } else if (weeklyHours >= 10) {
    milestones.push({
      icon: '⭐',
      title: 'Used This Week',
      value: formatTime(stats.thisWeek),
      priority: 4
    });
  }

  // Additional milestones
  // Days since first use
  const daysSinceFirstUse = stats.firstUsed
    ? Math.floor((Date.now() - stats.firstUsed) / (1000 * 60 * 60 * 24))
    : 0;

  if (daysSinceFirstUse >= 365) {
    milestones.push({
      icon: '🎂',
      title: 'Using for ' + Math.floor(daysSinceFirstUse / 365) + '+ Year' + (Math.floor(daysSinceFirstUse / 365) > 1 ? 's' : ''),
      value: 'Loyal User',
      priority: 1
    });
  } else if (daysSinceFirstUse >= 180) {
    milestones.push({
      icon: '🎂',
      title: 'Using for 6+ Months',
      value: 'Committed',
      priority: 3
    });
  } else if (daysSinceFirstUse >= 90) {
    milestones.push({
      icon: '🎂',
      title: 'Using for 3+ Months',
      value: 'Regular',
      priority: 4
    });
  } else if (daysSinceFirstUse >= 30) {
    milestones.push({
      icon: '🎂',
      title: 'Using for 1+ Month',
      value: 'Growing',
      priority: 5
    });
  }

  // Consistency milestone (sessions per day since first use)
  const sessionsPerDay = daysSinceFirstUse > 0 ? stats.sessionCount / daysSinceFirstUse : 0;
  if (sessionsPerDay >= 3) {
    milestones.push({
      icon: '💪',
      title: 'Super Consistent',
      value: sessionsPerDay.toFixed(1) + '/day',
      priority: 2
    });
  } else if (sessionsPerDay >= 1) {
    milestones.push({
      icon: '💪',
      title: 'Daily User',
      value: sessionsPerDay.toFixed(1) + '/day',
      priority: 4
    });
  }

  // Average session compared to median
  if (stats.avgSession > 2 * 60 * 60 * 1000) {
    milestones.push({
      icon: '🎮',
      title: 'Deep Focus Sessions',
      value: 'Immersive',
      priority: 3
    });
  }

  // Weekend warrior - high weekend usage
  if (details.dayOfWeekUsage) {
    const weekdayUsage = details.dayOfWeekUsage
      .filter(d => d.day_of_week >= 1 && d.day_of_week <= 5)
      .reduce((sum, d) => sum + (d.total_duration || 0), 0);
    const weekendUsage = details.dayOfWeekUsage
      .filter(d => d.day_of_week === 0 || d.day_of_week === 6)
      .reduce((sum, d) => sum + (d.total_duration || 0), 0);

    if (weekendUsage > weekdayUsage * 1.5) {
      milestones.push({
        icon: '🎉',
        title: 'Weekend Warrior',
        value: 'Free Time Hero',
        priority: 3
      });
    } else if (weekdayUsage > weekendUsage * 1.5) {
      milestones.push({
        icon: '💼',
        title: 'Weekday Focus',
        value: 'Work Week',
        priority: 3
      });
    }
  }

  // Night owl or early bird
  if (details.heatmapData && details.heatmapData.length > 0) {
    const nightUsage = details.heatmapData
      .filter(d => d.hour >= 22 || d.hour <= 4)
      .reduce((sum, d) => sum + (d.total_duration || 0), 0);
    const morningUsage = details.heatmapData
      .filter(d => d.hour >= 5 && d.hour <= 11)
      .reduce((sum, d) => sum + (d.total_duration || 0), 0);
    const totalDayUsage = details.heatmapData
      .reduce((sum, d) => sum + (d.total_duration || 0), 0);

    if (nightUsage > totalDayUsage * 0.4) {
      milestones.push({
        icon: '🦉',
        title: 'Night Owl',
        value: 'Late Night',
        priority: 4
      });
    } else if (morningUsage > totalDayUsage * 0.4) {
      milestones.push({
        icon: '🌅',
        title: 'Early Bird',
        value: 'Rise & Shine',
        priority: 4
      });
    }
  }

  // Marathon sessions (4+ hours)
  if (details.sessionDurations) {
    const marathonSessions = details.sessionDurations.filter(d => d >= 4 * 60 * 60 * 1000).length;
    if (marathonSessions >= 50) {
      milestones.push({
        icon: '🏃',
        title: 'Marathon Runner',
        value: marathonSessions + ' x 4h+',
        priority: 2
      });
    } else if (marathonSessions >= 20) {
      milestones.push({
        icon: '🏃',
        title: 'Endurance Pro',
        value: marathonSessions + ' x 4h+',
        priority: 3
      });
    } else if (marathonSessions >= 10) {
      milestones.push({
        icon: '🏃',
        title: 'Long Sessions',
        value: marathonSessions + ' x 4h+',
        priority: 4
      });
    }
  }

  // Quick sessions (under 15 minutes)
  if (details.sessionDurations) {
    const quickSessions = details.sessionDurations.filter(d => d < 15 * 60 * 1000 && d > 0).length;
    const totalSessions = details.sessionDurations.length;
    if (quickSessions > totalSessions * 0.5 && totalSessions >= 20) {
      milestones.push({
        icon: '⚡',
        title: 'Quick Launcher',
        value: 'Short Bursts',
        priority: 5
      });
    }
  }

  // Variety seeker (many different days with usage)
  if (details.monthlyUsage) {
    const activeDays = details.monthlyUsage.filter(d => d.total_duration > 0).length;
    if (activeDays >= 25) {
      milestones.push({
        icon: '📆',
        title: 'Daily Driver',
        value: activeDays + ' Active Days',
        priority: 3
      });
    } else if (activeDays >= 15) {
      milestones.push({
        icon: '📆',
        title: 'Regular Routine',
        value: activeDays + ' Active Days',
        priority: 4
      });
    }
  }

  // Power user (high recent activity)
  const recentHours = Math.floor(stats.thisWeek / (1000 * 60 * 60));
  if (recentHours >= 60) {
    milestones.push({
      icon: '⚡',
      title: 'Power User',
      value: 'High Activity',
      priority: 1
    });
  } else if (recentHours >= 40) {
    milestones.push({
      icon: '⚡',
      title: 'Super Active',
      value: 'Going Strong',
      priority: 2
    });
  }

  // Comeback achievement
  if (stats.lastWeek && stats.thisWeek > stats.lastWeek * 2 && stats.lastWeek > 0) {
    milestones.push({
      icon: '🔄',
      title: 'Strong Comeback',
      value: '+' + Math.round((stats.thisWeek / stats.lastWeek - 1) * 100) + '%',
      priority: 2
    });
  }

  // Balanced user (consistent across all days)
  if (details.dayOfWeekUsage && details.dayOfWeekUsage.length === 7) {
    const durations = details.dayOfWeekUsage.map(d => d.total_duration || 0).filter(d => d > 0);
    if (durations.length >= 5) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const variance = durations.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / avg;

      if (coefficientOfVariation < 0.3) {
        milestones.push({
          icon: '⚖️',
          title: 'Balanced Schedule',
          value: 'Consistent',
          priority: 4
        });
      }
    }
  }

  // Sort all milestones by priority
  milestones.sort((a, b) => a.priority - b.priority);

  // Update the milestones grid
  milestonesGrid.innerHTML = milestones.map(milestone => `
    <div class="milestone-card">
      <div class="milestone-icon">${milestone.icon}</div>
      <div class="milestone-title">${milestone.title}</div>
      <div class="milestone-value">${milestone.value}</div>
    </div>
  `).join('');
}
