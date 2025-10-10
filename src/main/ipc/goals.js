const { ipcMain } = require('electron');
const { getDb } = require('../services/database');
const { getAllTemplates, getTemplatesByCategory, createGoalFromTemplate } = require('../utils/goal-templates');

// Helper function to get local date string from Date object
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initializeGoalHandlers() {
  // Get all goal templates
  ipcMain.handle('goals:getTemplates', async () => {
    try {
      return getAllTemplates();
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  });

  // Get templates grouped by category
  ipcMain.handle('goals:getTemplatesByCategory', async () => {
    try {
      return getTemplatesByCategory();
    } catch (error) {
      console.error('Error getting templates by category:', error);
      throw error;
    }
  });

  // Create goal from template
  ipcMain.handle('goals:createFromTemplate', async (event, templateId, customizations) => {
    try {
      const db = getDb();
      const goalData = createGoalFromTemplate(templateId, customizations);

      const result = db.prepare(`
        INSERT INTO goals (
          name, description, icon, type,
          target_value, target_unit, target_type,
          reference_type, reference_id, min_session_duration,
          frequency, active_days
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        goalData.name,
        goalData.description,
        goalData.icon,
        goalData.type,
        goalData.target_value,
        goalData.target_unit,
        goalData.target_type,
        goalData.reference_type,
        goalData.reference_id,
        goalData.min_session_duration,
        goalData.frequency,
        goalData.active_days || null
      );

      console.log(`Created goal from template: "${goalData.name}" (ID: ${result.lastInsertRowid})`);

      return {
        success: true,
        goalId: result.lastInsertRowid,
        goal: {
          id: result.lastInsertRowid,
          ...goalData
        }
      };
    } catch (error) {
      console.error('Error creating goal from template:', error);
      throw error;
    }
  });
  // Get all active goals
  ipcMain.handle('goals:getAll', async () => {
    try {
      const db = getDb();

      const goals = db.prepare(`
        SELECT * FROM goals
        WHERE is_active = 1
        ORDER BY type, created_at DESC
      `).all();

      return goals;
    } catch (error) {
      console.error('Error getting goals:', error);
      throw error;
    }
  });

  // Get goals for a specific date
  ipcMain.handle('goals:getForDate', async (event, date) => {
    try {
      const db = getDb();
      const today = getLocalDateString(new Date());

      // Get day of week for the specified date (0=Sunday, 1=Monday, etc.)
      const dayOfWeek = new Date(date).getDay();

      // Get all active goals with app/category names
      const goals = db.prepare(`
        SELECT
          g.*,
          CASE
            WHEN g.reference_type = 'app' THEN a.name
            WHEN g.reference_type = 'category' THEN c.name
            ELSE NULL
          END as reference_name
        FROM goals g
        LEFT JOIN apps a ON g.reference_type = 'app' AND g.reference_id = a.id
        LEFT JOIN categories c ON g.reference_type = 'category' AND g.reference_id = c.name
        WHERE g.is_active = 1
        ORDER BY g.type, g.created_at DESC
      `).all();

      // Separate active and inactive goals based on active_days
      const activeGoals = [];
      const inactiveGoals = [];

      goals.forEach(goal => {
        if (!goal.active_days) {
          // No active_days restriction, goal is active every day
          activeGoals.push(goal);
        } else {
          // Check if the day of week is in the active_days list
          const activeDays = goal.active_days.split(',').map(d => parseInt(d));
          if (activeDays.includes(dayOfWeek)) {
            activeGoals.push(goal);
          } else {
            inactiveGoals.push(goal);
          }
        }
      });

      // Get progress for active goals
      const goalsWithProgress = activeGoals.map(goal => {
        // Get the date range for this goal based on frequency
        const { startDate, endDate } = getDateRangeForGoal(goal, date);

        // Check if the goal existed on the date we're viewing
        const goalCreatedDate = getLocalDateString(new Date(goal.created_at));
        if (goalCreatedDate > date) {
          // Goal didn't exist on this date, skip it
          return null;
        }

        // For weekly/monthly goals, check if we're viewing the current period
        // AND if the period end date hasn't passed yet
        const isCurrentPeriod = date >= startDate && endDate >= today;

        // For saved progress, use the end date of the period as the key
        const progressKey = endDate;

        const progress = db.prepare(`
          SELECT * FROM goal_progress
          WHERE goal_id = ? AND date = ?
        `).get(goal.id, progressKey);

        let currentValue = 0;
        let status = 'pending';

        if (date === today || (isCurrentPeriod && date < today)) {
          // For today or dates within current period: calculate in real-time
          // For weekly/monthly goals in current period, always calculate up to today
          const calculateUpTo = (goal.frequency === 'weekly' || goal.frequency === 'monthly') && isCurrentPeriod ? today : date;
          currentValue = calculateGoalProgress(db, goal, calculateUpTo);
          status = determineGoalStatus(goal, currentValue);
        } else if (progress) {
          // For past periods with saved progress: use saved data
          currentValue = progress.current_value;
          status = progress.status;
        } else {
          // For past periods without saved progress: skip this goal
          return null;
        }

        return {
          ...goal,
          current_value: currentValue,
          status: status,
          progress_percentage: calculateProgressPercentage(goal, currentValue),
          period_start: startDate,
          period_end: endDate
        };
      }).filter(goal => goal !== null); // Remove goals with no data for past periods

      // Get progress for inactive goals (simplified - just show the goal without calculating progress)
      const inactiveGoalsData = inactiveGoals.map(goal => {
        // Check if the goal existed on the date we're viewing
        const goalCreatedDate = getLocalDateString(new Date(goal.created_at));
        if (goalCreatedDate > date) {
          return null;
        }

        return {
          ...goal,
          current_value: 0,
          status: 'inactive',
          progress_percentage: 0,
          period_start: date,
          period_end: date
        };
      }).filter(goal => goal !== null);

      // Calculate stats for the day
      const stats = calculateDayStats(db, date, goalsWithProgress);

      return {
        goals: goalsWithProgress,
        inactiveGoals: inactiveGoalsData,
        stats: stats,
        isToday: date === today
      };
    } catch (error) {
      console.error('Error getting goals for date:', error);
      throw error;
    }
  });

  // Create a new goal
  ipcMain.handle('goals:create', async (event, goalData) => {
    try {
      const db = getDb();

      const result = db.prepare(`
        INSERT INTO goals (
          name, description, icon, type,
          target_value, target_unit, target_type,
          reference_type, reference_id, min_session_duration,
          frequency, active_days
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        goalData.name,
        goalData.description,
        goalData.icon,
        goalData.type,
        goalData.target_value,
        goalData.target_unit,
        goalData.target_type,
        goalData.reference_type,
        goalData.reference_id,
        goalData.min_session_duration,
        goalData.frequency,
        goalData.active_days || null
      );

      return { id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  });

  // Update a goal
  ipcMain.handle('goals:update', async (event, goalId, goalData) => {
    try {
      const db = getDb();

      db.prepare(`
        UPDATE goals SET
          name = ?,
          description = ?,
          icon = ?,
          target_value = ?,
          target_unit = ?,
          target_type = ?,
          reference_type = ?,
          reference_id = ?,
          min_session_duration = ?,
          frequency = ?,
          active_days = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        goalData.name,
        goalData.description,
        goalData.icon,
        goalData.target_value,
        goalData.target_unit,
        goalData.target_type,
        goalData.reference_type,
        goalData.reference_id,
        goalData.min_session_duration,
        goalData.frequency,
        goalData.active_days || null,
        Date.now(),
        goalId
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  });

  // Delete a goal (soft delete)
  ipcMain.handle('goals:delete', async (event, goalId) => {
    try {
      const db = getDb();

      db.prepare(`
        UPDATE goals
        SET is_active = 0, deleted_at = ?
        WHERE id = ?
      `).run(Date.now(), goalId);

      return { success: true };
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  });
}

// Get date range for a goal based on its frequency
function getDateRangeForGoal(goal, date) {
  if (goal.frequency === 'daily') {
    return { startDate: date, endDate: date };
  } else if (goal.frequency === 'weekly') {
    // Get Monday of the week containing this date
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    const startDate = monday.toISOString().split('T')[0];

    // Get Sunday of the same week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const endDate = sunday.toISOString().split('T')[0];

    return { startDate, endDate };
  } else if (goal.frequency === 'monthly') {
    // Get first day of the month
    const d = new Date(date);
    const startDate = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];

    // Get last day of the month
    const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

    return { startDate, endDate };
  }

  return { startDate: date, endDate: date };
}

// Helper function to calculate current progress for a goal
function calculateGoalProgress(db, goal, date) {
  try {
    // Get date range based on goal frequency
    const { startDate, endDate } = getDateRangeForGoal(goal, date);

    switch (goal.type) {
      case 'productivity_score':
        // Calculate productivity score for the period
        return calculateProductivityScore(db, startDate, endDate);

      case 'productivity_time':
        // Calculate time spent on productive/neutral/unproductive apps
        return calculateProductivityTime(db, goal, startDate, endDate);

      case 'work_sessions':
        // Count work sessions (>= min_session_duration)
        return calculateWorkSessions(db, goal, startDate, endDate);

      case 'app':
        // Calculate time spent on specific app
        return calculateAppTime(db, goal, startDate, endDate);

      case 'category':
        // Calculate time spent on apps in category
        return calculateCategoryTime(db, goal, startDate, endDate);

      default:
        return 0;
    }
  } catch (error) {
    console.error('Error calculating goal progress:', error);
    return 0;
  }
}

function calculateProductivityScore(db, startDate, endDate) {
  // Get productivity breakdown for the date range
  const startTime = new Date(startDate).setHours(0, 0, 0, 0);
  const endTime = new Date(endDate).setHours(23, 59, 59, 999);

  const rawBreakdown = db.prepare(`
    SELECT
      CASE
        WHEN a.productivity_level_override IS NOT NULL THEN a.productivity_level_override
        WHEN c.productivity_level IS NOT NULL THEN c.productivity_level
        ELSE 'neutral'
      END as productivity_level,
      s.duration
    FROM apps a
    INNER JOIN sessions s ON a.id = s.app_id
    LEFT JOIN categories c ON a.category = c.name
    WHERE s.start_time >= ? AND s.start_time <= ?
      AND s.end_time IS NOT NULL
      AND s.duration > 0
  `).all(startTime, endTime);

  // Aggregate by productivity level
  const breakdownMap = {
    productive: 0,
    neutral: 0,
    unproductive: 0
  };

  rawBreakdown.forEach(row => {
    const level = row.productivity_level;
    if (breakdownMap.hasOwnProperty(level)) {
      breakdownMap[level] += row.duration;
    }
  });

  const totalTime = breakdownMap.productive + breakdownMap.neutral + breakdownMap.unproductive;

  // Calculate productivity score (0-100)
  // Formula: (productive * 100 + neutral * 50) / totalTime
  const score = totalTime > 0
    ? Math.round((breakdownMap.productive * 100 + breakdownMap.neutral * 50) / totalTime)
    : 0;

  return score;
}

function calculateProductivityTime(db, goal, startDate, endDate) {
  const result = db.prepare(`
    SELECT SUM(s.duration) as total_time
    FROM sessions s
    JOIN apps a ON s.app_id = a.id
    LEFT JOIN categories c ON a.category = c.name
    WHERE date(s.start_time/1000, 'unixepoch', 'localtime') BETWEEN ? AND ?
      AND COALESCE(a.productivity_level_override, c.productivity_level) = ?
  `).get(startDate, endDate, goal.reference_id);

  if (!result.total_time) return 0;

  // Convert milliseconds to the target unit
  if (goal.target_unit === 'hours') {
    // Convert to hours
    return Math.round((result.total_time / 3600000) * 100) / 100; // Round to 2 decimals
  } else {
    // Convert to minutes
    return Math.round(result.total_time / 60000);
  }
}

function calculateWorkSessions(db, goal, startDate, endDate) {
  const minDuration = (goal.min_session_duration || 25) * 60000; // Convert to ms

  const result = db.prepare(`
    SELECT COUNT(*) as session_count
    FROM sessions
    WHERE date(start_time/1000, 'unixepoch', 'localtime') BETWEEN ? AND ?
      AND duration >= ?
  `).get(startDate, endDate, minDuration);

  return result.session_count || 0;
}

function calculateAppTime(db, goal, startDate, endDate) {
  // reference_id can be either app id (TEXT) or app name
  // First, check if it exists as an app id
  let appId = goal.reference_id;

  const appExists = db.prepare(`
    SELECT id FROM apps WHERE id = ?
  `).get(appId);

  // If not found, try to look up by name
  if (!appExists) {
    console.log(`App id ${appId} not found, trying to look up by name...`);

    const app = db.prepare(`
      SELECT id FROM apps
      WHERE name = ?
      LIMIT 1
    `).get(goal.reference_id);

    if (app) {
      appId = app.id;
      console.log(`  Found app with id ${appId} for name ${goal.reference_id}`);
    } else {
      console.error(`  Could not find app with name: ${goal.reference_id}`);
      return 0;
    }
  }

  const result = db.prepare(`
    SELECT SUM(duration) as total_time
    FROM sessions
    WHERE date(start_time/1000, 'unixepoch', 'localtime') BETWEEN ? AND ?
      AND app_id = ?
  `).get(startDate, endDate, appId);

  if (!result.total_time) return 0;

  // Convert milliseconds to the target unit
  if (goal.target_unit === 'hours') {
    // Convert to hours
    return Math.round((result.total_time / 3600000) * 100) / 100; // Round to 2 decimals
  } else {
    // Convert to minutes
    return Math.round(result.total_time / 60000);
  }
}

function calculateCategoryTime(db, goal, startDate, endDate) {
  const result = db.prepare(`
    SELECT SUM(s.duration) as total_time
    FROM sessions s
    JOIN apps a ON s.app_id = a.id
    WHERE date(s.start_time/1000, 'unixepoch', 'localtime') BETWEEN ? AND ?
      AND a.category = ?
  `).get(startDate, endDate, goal.reference_id);

  if (!result.total_time) return 0;

  // Convert milliseconds to the target unit
  if (goal.target_unit === 'hours') {
    // Convert to hours
    return Math.round((result.total_time / 3600000) * 100) / 100; // Round to 2 decimals
  } else {
    // Convert to minutes
    return Math.round(result.total_time / 60000);
  }
}

function determineGoalStatus(goal, currentValue) {
  const percentage = (currentValue / goal.target_value) * 100;

  if (goal.target_type === 'minimum') {
    // Goal is to reach or exceed target
    if (currentValue >= goal.target_value) return 'achieved';
    if (percentage >= 80) return 'warning';
    if (currentValue > 0) return 'in_progress';
    return 'pending';
  } else {
    // Goal is to stay under target (maximum)
    if (currentValue > goal.target_value) return 'failed';
    if (percentage >= 90) return 'warning';
    // If we're under or at the target (including 0), it's achieved
    if (currentValue <= goal.target_value) return 'achieved';
    return 'pending';
  }
}

function calculateProgressPercentage(goal, currentValue) {
  const percentage = (currentValue / goal.target_value) * 100;
  return Math.min(Math.round(percentage), 150); // Cap at 150% for display
}

function calculateDayStats(db, date, goals) {
  const activeGoals = goals.length;
  const achievedToday = goals.filter(g => g.status === 'achieved').length;
  const successRate = activeGoals > 0 ? Math.round((achievedToday / activeGoals) * 100) : 0;

  // Calculate streak - count consecutive days with 100% success rate
  // Pass goals so streak calculation can use live data for today
  const streak = calculateStreak(db, date, goals);

  return {
    activeGoals,
    achievedToday,
    dayStreak: streak,
    successRate
  };
}

// Calculate streak of consecutive days with all goals achieved
function calculateStreak(db, date, todayGoals = null) {
  let streak = 0;
  // Ensure we're working with a Date object
  let currentDate = typeof date === 'string' ? new Date(date + 'T00:00:00') : new Date(date);
  const today = getLocalDateString(new Date());

  // Get all active goals to know their frequencies, active_days, and creation dates
  const allGoals = db.prepare(`
    SELECT id, frequency, active_days, created_at FROM goals WHERE is_active = 1
  `).all();

  // If there are no goals, return 0 streak
  if (allGoals.length === 0) {
    console.log('[Streak] No active goals, returning 0');
    return 0;
  }

  // Separate goals by frequency
  const dailyGoals = allGoals.filter(g => g.frequency === 'daily');
  const weeklyGoals = allGoals.filter(g => g.frequency === 'weekly');
  const monthlyGoals = allGoals.filter(g => g.frequency === 'monthly');

  // Find the earliest goal creation date to avoid counting before goals existed
  const earliestGoalDate = allGoals.reduce((earliest, goal) => {
    const goalDate = new Date(goal.created_at);
    goalDate.setHours(0, 0, 0, 0);
    return !earliest || goalDate < earliest ? goalDate : earliest;
  }, null);

  // Go backwards from the given date
  while (true) {
    const checkDateString = getLocalDateString(currentDate);
    const dayOfWeek = currentDate.getDay();

    // Stop if we've gone back before any goals existed
    if (earliestGoalDate && currentDate < earliestGoalDate) {
      break;
    }

    // Check which goals should be checked on this specific date
    const goalsActiveOnThisDate = allGoals.filter(goal => {
      const goalCreatedDate = new Date(goal.created_at);
      goalCreatedDate.setHours(0, 0, 0, 0);

      // Goal must have existed on this date
      if (currentDate < goalCreatedDate) {
        return false;
      }

      // For daily goals with active_days, check if this day is included
      if (goal.frequency === 'daily' && goal.active_days) {
        const activeDays = goal.active_days.split(',').map(d => parseInt(d));
        if (!activeDays.includes(dayOfWeek)) {
          return false;
        }
      }

      // For weekly goals, only check on Sundays
      if (goal.frequency === 'weekly' && dayOfWeek !== 0) {
        return false;
      }

      // For monthly goals, only check on last day of month
      if (goal.frequency === 'monthly') {
        const tomorrow = new Date(currentDate);
        tomorrow.setDate(currentDate.getDate() + 1);
        const isLastDayOfMonth = tomorrow.getMonth() !== currentDate.getMonth();
        if (!isLastDayOfMonth) {
          return false;
        }
      }

      return true;
    });

    // If no goals should be checked on this date, continue streak (don't break)
    if (goalsActiveOnThisDate.length === 0) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);

      // Safety limit: don't go back more than 365 days
      if (streak >= 365) {
        break;
      }
      continue;
    }

    // For streak calculation:
    // - Daily goals: check every day
    // - Weekly goals: only check on Sundays (end of week)
    // - Monthly goals: only check on last day of month

    let allAchievedForThisDay = true;

    // 1. Check daily goals (every day)
    if (dailyGoals.length > 0) {
      // Filter daily goals that should be active on this day of week
      const activeDailyGoals = dailyGoals.filter(goal => {
        if (!goal.active_days) return true; // No restriction, always active
        const activeDays = goal.active_days.split(',').map(d => parseInt(d));
        return activeDays.includes(dayOfWeek);
      });

      // If no goals are active on this day, skip checking (don't break streak)
      if (activeDailyGoals.length > 0) {
        // Special case: if checking today and we have live goal data, use that instead
        if (checkDateString === today && todayGoals) {
          const dailyTodayGoals = todayGoals.filter(g => g.frequency === 'daily');

          // Check if any goal failed (not just missing achievements)
          const failedGoals = dailyTodayGoals.filter(g =>
            g.status === 'failed' ||
            (g.status !== 'achieved' && g.status !== 'in_progress' && g.status !== 'warning' && g.status !== 'pending')
          );

          if (failedGoals.length > 0) {
            break;
          }

          // Check if there are goals with progress that weren't achieved
          const goalsWithProgress = dailyTodayGoals.filter(g =>
            g.status === 'in_progress' || g.status === 'warning' || g.status === 'failed'
          );

          if (goalsWithProgress.some(g => g.status !== 'achieved')) {
            allAchievedForThisDay = false;
          }
        } else {
          // Check saved progress for goals that existed on this date
          const dailyProgress = db.prepare(`
            SELECT gp.goal_id, gp.status, g.created_at
            FROM goal_progress gp
            JOIN goals g ON gp.goal_id = g.id
            WHERE gp.date = ? AND gp.goal_id IN (${activeDailyGoals.map(() => '?').join(',')})
          `).all(checkDateString, ...activeDailyGoals.map(g => g.id));

          // Check for explicitly failed goals or goals with progress that weren't achieved
          const failedProgress = dailyProgress.filter(record =>
            record.status === 'failed' ||
            (record.status !== 'achieved' && record.status !== 'pending')
          );

          if (failedProgress.length > 0) {
            allAchievedForThisDay = false;
          }
        }
      }
    }

    // 2. Check weekly goals (only on Sundays)
    if (weeklyGoals.length > 0 && dayOfWeek === 0) { // Sunday
      const weeklyProgress = db.prepare(`
        SELECT goal_id, status FROM goal_progress
        WHERE date = ? AND goal_id IN (${weeklyGoals.map(() => '?').join(',')})
      `).all(checkDateString, ...weeklyGoals.map(g => g.id));

      // Check for explicitly failed goals or goals with progress that weren't achieved
      const failedWeeklyProgress = weeklyProgress.filter(record =>
        record.status === 'failed' ||
        (record.status !== 'achieved' && record.status !== 'pending')
      );

      if (failedWeeklyProgress.length > 0) {
        console.log(`[Streak] ${failedWeeklyProgress.length} weekly goal(s) failed on ${checkDateString}, streak ends`);
        allAchievedForThisDay = false;
      }
    }

    // 3. Check monthly goals (only on last day of month)
    if (monthlyGoals.length > 0) {
      const tomorrow = new Date(currentDate);
      tomorrow.setDate(currentDate.getDate() + 1);
      const isLastDayOfMonth = tomorrow.getMonth() !== currentDate.getMonth();

      if (isLastDayOfMonth) {
        const monthlyProgress = db.prepare(`
          SELECT goal_id, status FROM goal_progress
          WHERE date = ? AND goal_id IN (${monthlyGoals.map(() => '?').join(',')})
        `).all(checkDateString, ...monthlyGoals.map(g => g.id));

        // Check for explicitly failed goals or goals with progress that weren't achieved
        const failedMonthlyProgress = monthlyProgress.filter(record =>
          record.status === 'failed' ||
          (record.status !== 'achieved' && record.status !== 'pending')
        );

        if (failedMonthlyProgress.length > 0) {
          console.log(`[Streak] ${failedMonthlyProgress.length} monthly goal(s) failed on ${checkDateString}, streak ends`);
          allAchievedForThisDay = false;
        }
      }
    }

    // If all applicable goals for this day were achieved, continue streak
    if (allAchievedForThisDay) {
      streak++;
    } else {
      // Streak is broken
      break;
    }

    // Move to previous day
    currentDate.setDate(currentDate.getDate() - 1);

    // Safety limit: don't go back more than 365 days
    if (streak >= 365) {
      break;
    }
  }

  return streak;
}

// Save progress for a specific date
ipcMain.handle('goals:saveProgressForDate', async (event, date) => {
  try {
    const db = getDb();

    // Get all active goals
    const goals = db.prepare(`
      SELECT * FROM goals
      WHERE is_active = 1
    `).all();

    let savedCount = 0;

    goals.forEach(goal => {
      // Calculate progress for this date
      const currentValue = calculateGoalProgress(db, goal, date);
      const status = determineGoalStatus(goal, currentValue);
      const achievedAt = status === 'achieved' ? Date.now() : null;

      // Insert or update progress record
      db.prepare(`
        INSERT INTO goal_progress (goal_id, date, current_value, target_value, status, achieved_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(goal_id, date) DO UPDATE SET
          current_value = excluded.current_value,
          target_value = excluded.target_value,
          status = excluded.status,
          achieved_at = excluded.achieved_at
      `).run(goal.id, date, currentValue, goal.target_value, status, achievedAt);

      savedCount++;
    });

    return { success: true, savedCount };
  } catch (error) {
    console.error('Error saving progress for date:', error);
    throw error;
  }
});

// Save progress for yesterday (called at app startup or periodically)
ipcMain.handle('goals:saveYesterdayProgress', async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = getLocalDateString(yesterday);

    return await ipcMain.emit('goals:saveProgressForDate', null, yesterdayString);
  } catch (error) {
    console.error('Error saving yesterday progress:', error);
    throw error;
  }
});

// Helper function to save progress for a date (internal use)
function saveProgressForDate(date, forceUpdate = false) {
  try {
    const db = getDb();

    // Get all active goals
    const goals = db.prepare(`
      SELECT * FROM goals
      WHERE is_active = 1
    `).all();

    console.log(`Attempting to save progress for ${goals.length} goals on ${date}`);

    let savedCount = 0;
    let skippedCount = 0;

    goals.forEach(goal => {
      // Check if the goal existed on this date
      // Convert created_at timestamp to local date string for comparison
      const createdDate = new Date(goal.created_at);
      const goalCreatedDate = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}-${String(createdDate.getDate()).padStart(2, '0')}`;
      if (goalCreatedDate > date) {
        console.log(`  Goal ${goal.name} was created on ${goalCreatedDate}, after ${date}, skipping`);
        skippedCount++;
        return;
      }

      // For daily goals with active_days, check if this date's day of week is included
      if (goal.frequency === 'daily' && goal.active_days) {
        const dayOfWeek = new Date(date).getDay();
        const activeDays = goal.active_days.split(',').map(d => parseInt(d));
        if (!activeDays.includes(dayOfWeek)) {
          console.log(`  Goal ${goal.name} is not active on ${date} (day ${dayOfWeek}), skipping`);
          skippedCount++;
          return;
        }
      }

      // Get the date range for this goal's frequency
      const { endDate } = getDateRangeForGoal(goal, date);

      // Use the end date of the period as the progress key
      const progressKey = endDate;

      // Only save if the date we're saving for is the end of the period
      // (Don't save weekly goals on Tuesday, wait until Sunday)
      if (goal.frequency === 'weekly' || goal.frequency === 'monthly') {
        if (date !== endDate) {
          console.log(`  Goal ${goal.name} is ${goal.frequency}, waiting for period end (${endDate}), skipping`);
          skippedCount++;
          return;
        }
      }

      // Check if progress already exists for this goal and period
      const existingProgress = db.prepare(`
        SELECT id FROM goal_progress
        WHERE goal_id = ? AND date = ?
      `).get(goal.id, progressKey);

      if (existingProgress && !forceUpdate) {
        console.log(`  Progress already saved for ${goal.name} on ${progressKey}, skipping`);
        skippedCount++;
        return;
      }

      // Calculate progress for this date
      const currentValue = calculateGoalProgress(db, goal, date);
      const status = determineGoalStatus(goal, currentValue);
      const achievedAt = status === 'achieved' ? Date.now() : null;

      console.log(`Goal: ${goal.name} (type: ${goal.type}, ref_id: ${goal.reference_id}), value: ${currentValue}, status: ${status}`);

      // Skip goals with 'pending' status (no activity) - no need to save them
      if (status === 'pending') {
        console.log(`  Skipping ${goal.name} - no activity (pending status)`);
        return;
      }

      // Insert or update progress record
      db.prepare(`
        INSERT INTO goal_progress (goal_id, date, current_value, target_value, status, achieved_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(goal_id, date) DO UPDATE SET
          current_value = excluded.current_value,
          target_value = excluded.target_value,
          status = excluded.status,
          achieved_at = excluded.achieved_at
      `).run(goal.id, progressKey, currentValue, goal.target_value, status, achievedAt);

      savedCount++;
    });

    console.log(`Successfully saved progress for ${savedCount} goals on ${date} (${skippedCount} already saved)`);
    return { success: true, savedCount, skippedCount };
  } catch (error) {
    console.error('Error saving progress for date:', error);
    return { success: false, error: error.message };
  }
}

// Backfill missing progress data for all dates since last save
function backfillMissingProgress() {
  try {
    const db = getDb();

    console.log('\n=== Backfilling missing goal progress ===');

    // Find the most recent saved progress date
    const lastSaved = db.prepare(`
      SELECT MAX(date) as last_date FROM goal_progress
    `).get();

    const today = getLocalDateString(new Date());

    if (!lastSaved || !lastSaved.last_date) {
      console.log('No previous progress found. Saving yesterday only.');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = getLocalDateString(yesterday);
      return saveProgressForDate(yesterdayString);
    }

    const lastSavedDate = new Date(lastSaved.last_date);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    console.log(`Last saved progress: ${lastSaved.last_date}`);
    console.log(`Today: ${today}`);

    // Calculate days between last save and yesterday
    const daysBetween = Math.floor((yesterday - lastSavedDate) / (24 * 60 * 60 * 1000));

    if (daysBetween <= 0) {
      console.log('Progress is up to date. No backfill needed.');
      return { success: true, backfilledDays: 0 };
    }

    console.log(`Need to backfill ${daysBetween} days of progress`);

    // Get all active goals to check their frequencies
    const goals = db.prepare(`
      SELECT * FROM goals WHERE is_active = 1
    `).all();

    let totalSaved = 0;

    // Check if we have any daily goals
    const hasDailyGoals = goals.some(g => g.frequency === 'daily');
    const hasWeeklyGoals = goals.some(g => g.frequency === 'weekly');
    const hasMonthlyGoals = goals.some(g => g.frequency === 'monthly');

    // Build a set of unique dates to save
    const datesToSaveSet = new Set();

    // 1. If we have daily goals, we need to save every day
    if (hasDailyGoals) {
      for (let i = 1; i <= daysBetween; i++) {
        const date = new Date(lastSavedDate);
        date.setDate(date.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        datesToSaveSet.add(dateString);
      }
    }

    // 2. Find completed weekly/monthly periods and add their end dates
    if (hasWeeklyGoals || hasMonthlyGoals) {
      const completedPeriods = findCompletedPeriods(goals, lastSaved.last_date, yesterday.toISOString().split('T')[0]);
      console.log(`Found ${completedPeriods.length} completed weekly/monthly periods to save`);

      completedPeriods.forEach(period => {
        datesToSaveSet.add(period.endDate);
      });
    }

    const datesToSave = Array.from(datesToSaveSet).sort();
    console.log(`Will save progress for ${datesToSave.length} dates`);

    // Save progress for each unique date
    datesToSave.forEach(dateString => {
      console.log(`Backfilling progress for ${dateString}...`);
      const result = saveProgressForDate(dateString);
      if (result.success) {
        totalSaved += result.savedCount || 0;
      }
    });

    console.log(`✅ Backfill complete. Saved progress for ${totalSaved} goal-days`);

    // Clean up orphaned progress data from deleted goals
    cleanupOrphanedProgress();

    return { success: true, backfilledDays: daysBetween, goalsSaved: totalSaved };

  } catch (error) {
    console.error('Error during backfill:', error);
    return { success: false, error: error.message };
  }
}

// Find completed weekly/monthly periods between two dates
function findCompletedPeriods(goals, startDate, endDate) {
  const completedPeriods = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  goals.forEach(goal => {
    if (goal.frequency === 'weekly') {
      // Find all Sundays between start and end
      let current = new Date(start);
      while (current <= end) {
        if (current.getDay() === 0 && current > start) { // Sunday
          completedPeriods.push({
            goalId: goal.id,
            frequency: 'weekly',
            endDate: current.toISOString().split('T')[0]
          });
        }
        current.setDate(current.getDate() + 1);
      }
    } else if (goal.frequency === 'monthly') {
      // Find all month-end dates between start and end
      let current = new Date(start);
      while (current <= end) {
        const nextDay = new Date(current);
        nextDay.setDate(current.getDate() + 1);

        // Check if we're crossing into a new month
        if (nextDay.getMonth() !== current.getMonth() && current > start) {
          completedPeriods.push({
            goalId: goal.id,
            frequency: 'monthly',
            endDate: current.toISOString().split('T')[0]
          });
        }
        current = nextDay;
      }
    }
  });

  return completedPeriods;
}

// Auto-save yesterday's progress on startup (deprecated - use backfillMissingProgress)
function autoSaveYesterdayProgress() {
  console.log('Running comprehensive backfill instead of just yesterday...');
  return backfillMissingProgress();
}

// Schedule midnight save
function scheduleMidnightSave() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 1, 0); // 1 second past midnight

  const timeUntilMidnight = tomorrow - now;

  console.log(`Scheduling midnight save in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes`);

  setTimeout(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = getLocalDateString(yesterday);

    console.log('Midnight: Saving progress for', yesterdayString);
    saveProgressForDate(yesterdayString);

    // Schedule next midnight save
    scheduleMidnightSave();
  }, timeUntilMidnight);
}

// Clean up orphaned progress data from deleted goals
function cleanupOrphanedProgress() {
  try {
    const db = getDb();

    console.log('Cleaning up orphaned progress data...');

    const result = db.prepare(`
      DELETE FROM goal_progress
      WHERE goal_id NOT IN (SELECT id FROM goals)
    `).run();

    console.log(`Removed ${result.changes} orphaned progress records`);
    return { success: true, deletedRecords: result.changes };
  } catch (error) {
    console.error('Error cleaning up orphaned progress:', error);
    return { success: false, error: error.message };
  }
}

// Get insights data (success rate over time, calendar heatmap)
ipcMain.handle('goals:getInsights', async (event, days = 30) => {
  try {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = getLocalDateString(today);

    const insights = {
      dailySuccessRate: [],
      calendarHeatmap: []
    };

    // Calculate success rate for each of the last N days (including today)
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = getLocalDateString(date);  // Use getLocalDateString consistently
      const dayOfWeek = date.getDay();

      console.log(`[Insights] Processing date: ${dateString} (day ${dayOfWeek}), isToday: ${dateString === todayString}`);

      // Get all goals that existed on this date (including active_days info)
      const allGoals = db.prepare(`
        SELECT id, frequency, active_days FROM goals
        WHERE is_active = 1 AND DATE(created_at/1000, 'unixepoch', 'localtime') <= ?
      `).all(dateString);

      if (allGoals.length === 0) {
        insights.dailySuccessRate.push({
          date: dateString,
          successRate: null, // No goals yet
          achieved: 0,
          total: 0
        });
        insights.calendarHeatmap.push({
          date: dateString,
          level: 0 // No data
        });
        continue;
      }

      // Filter goals to only include daily goals that are active on this specific day
      const dailyGoals = allGoals.filter(g => {
        if (g.frequency !== 'daily') return false;

        // Check if goal has active_days restriction
        if (g.active_days) {
          const activeDays = g.active_days.split(',').map(d => parseInt(d));
          return activeDays.includes(dayOfWeek);
        }

        return true; // No active_days restriction
      });

      let achieved = 0;
      let total = dailyGoals.length;

      console.log(`[Insights] ${dateString}: Found ${total} daily goals active on this day`);

      // Special case for today: calculate progress in real-time
      if (dateString === todayString) {
        console.log(`[Insights] ${dateString} is TODAY - calculating real-time progress`);
        // Get full goal objects with progress
        const goalsWithProgress = dailyGoals.map(goalInfo => {
          const goal = db.prepare(`SELECT * FROM goals WHERE id = ?`).get(goalInfo.id);
          const currentValue = calculateGoalProgress(db, goal, dateString);
          const status = determineGoalStatus(goal, currentValue);
          console.log(`[Insights]   Goal "${goal.name}": ${status} (${currentValue}/${goal.target_value})`);
          return { ...goal, status };
        });

        achieved = goalsWithProgress.filter(g => g.status === 'achieved').length;
        console.log(`[Insights] ${dateString}: ${achieved}/${total} achieved`);
      } else {
        // For past dates: use saved progress
        if (dailyGoals.length > 0) {
          const progress = db.prepare(`
            SELECT status FROM goal_progress
            WHERE date = ? AND goal_id IN (${dailyGoals.map(() => '?').join(',')})
          `).all(dateString, ...dailyGoals.map(g => g.id));

          achieved = progress.filter(p => p.status === 'achieved').length;
          console.log(`[Insights] ${dateString}: ${achieved}/${total} achieved (from saved progress)`);
        }
      }

      const successRate = total > 0 ? Math.round((achieved / total) * 100) : 0;
      console.log(`[Insights] ${dateString}: Success rate = ${successRate}%`);

      insights.dailySuccessRate.push({
        date: dateString,
        successRate,
        achieved,
        total
      });

      // Heatmap level: 0 = no data, 1 = 0-24%, 2 = 25-49%, 3 = 50-74%, 4 = 75-99%, 5 = 100%
      let level = 0;
      if (total > 0) {
        if (successRate === 0) level = 1;
        else if (successRate < 25) level = 1;
        else if (successRate < 50) level = 2;
        else if (successRate < 75) level = 3;
        else if (successRate < 100) level = 4;
        else level = 5;
      }

      insights.calendarHeatmap.push({
        date: dateString,
        level,
        successRate,
        achieved,
        total
      });
    }

    return insights;
  } catch (error) {
    console.error('Error getting insights:', error);
    throw error;
  }
});

// Export function to get goals data (used by PDF export)
function getGoalsDataForDate(date) {
  const db = getDb();
  const today = getLocalDateString(new Date());

  // Get all active goals with app/category names
  const goals = db.prepare(`
    SELECT
      g.*,
      CASE
        WHEN g.reference_type = 'app' THEN a.name
        WHEN g.reference_type = 'category' THEN c.name
        ELSE NULL
      END as reference_name
    FROM goals g
    LEFT JOIN apps a ON g.reference_type = 'app' AND g.reference_id = a.id
    LEFT JOIN categories c ON g.reference_type = 'category' AND g.reference_id = c.name
    WHERE g.is_active = 1
    ORDER BY g.type, g.created_at DESC
  `).all();

  // Get progress for the specific date
  const goalsWithProgress = goals.map(goal => {
    // Get the date range for this goal based on frequency
    const { startDate, endDate } = getDateRangeForGoal(goal, date);

    // Check if the goal existed on the date we're viewing
    const goalCreatedDate = getLocalDateString(new Date(goal.created_at));
    if (goalCreatedDate > date) {
      // Goal didn't exist on this date, skip it
      return null;
    }

    // For weekly/monthly goals, check if we're viewing the current period
    const isCurrentPeriod = date >= startDate && endDate >= today;

    // For saved progress, use the end date of the period as the key
    const progressKey = endDate;

    const progress = db.prepare(`
      SELECT * FROM goal_progress
      WHERE goal_id = ? AND date = ?
    `).get(goal.id, progressKey);

    let currentValue = 0;
    let status = 'pending';

    if (date === today || (isCurrentPeriod && date < today)) {
      // For today or dates within current period: calculate in real-time
      const calculateUpTo = (goal.frequency === 'weekly' || goal.frequency === 'monthly') && isCurrentPeriod ? today : date;
      currentValue = calculateGoalProgress(db, goal, calculateUpTo);
      status = determineGoalStatus(goal, currentValue);
    } else if (progress) {
      // For past periods with saved progress: use saved data
      currentValue = progress.current_value;
      status = progress.status;
    } else {
      // For past periods without saved progress: skip this goal
      return null;
    }

    return {
      ...goal,
      current_value: currentValue,
      status: status,
      progress_percentage: calculateProgressPercentage(goal, currentValue),
      streak_days: calculateStreak(db, date),
      period_start: startDate,
      period_end: endDate
    };
  }).filter(goal => goal !== null);

  // Calculate stats for the day
  const stats = calculateDayStats(db, date, goalsWithProgress);

  return {
    goals: goalsWithProgress,
    stats: stats,
    isToday: date === today
  };
}

module.exports = {
  initializeGoalHandlers,
  autoSaveYesterdayProgress,
  scheduleMidnightSave,
  saveProgressForDate,
  cleanupOrphanedProgress,
  getGoalsDataForDate
};
