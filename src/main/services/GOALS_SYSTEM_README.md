# Goals System Documentation

## Overview

The Goals System allows users to set and track productivity goals with different frequencies (daily, weekly, monthly) across various metrics. The system automatically calculates real-time progress and saves historical data.

---

## Table of Contents

1. [Goal Types](#goal-types)
2. [Goal Frequencies](#goal-frequencies)
3. [How It Works](#how-it-works)
4. [Data Storage](#data-storage)
5. [Progress Calculation](#progress-calculation)
6. [Streak System](#streak-system)
7. [Backfill & Data Integrity](#backfill--data-integrity)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)

---

## Goal Types

### 1. Productivity Score
- **Target**: Achieve a minimum productivity score (0-100)
- **Formula**: `(productive_time * 100 + neutral_time * 50) / total_time`
- **Example**: "Achieve 70+ productivity score daily"

### 2. Productivity Time (Focus Time)
- **Target**: Minimum or maximum time spent on apps with specific productivity level
- **Productivity Levels**: `productive`, `neutral`, `unproductive`
- **Units**: `minutes` or `hours`
- **Examples**:
  - "Spend 4+ hours on productive apps" (minimum)
  - "Limit unproductive apps to 2 hours" (maximum)

### 3. Work Sessions
- **Target**: Number of focused work sessions
- **Configuration**: Minimum session duration (e.g., 25 minutes)
- **Example**: "Complete 3+ work sessions of 25 min each"

### 4. App-Specific Goals
- **Target**: Time spent on a specific application
- **Reference**: Links to specific app by ID
- **Example**: "Use VS Code for 3+ hours daily"

### 5. Category Goals
- **Target**: Time spent on apps in a category
- **Reference**: Links to category by name
- **Example**: "Spend 5+ hours on Development apps"

---

## Goal Frequencies

### Daily Goals
- **Period**: Single day (midnight to midnight)
- **Saved**: Every day at midnight
- **Viewing**:
  - Today → Real-time calculation
  - Past days → Saved progress from `goal_progress` table

### Weekly Goals
- **Period**: Monday to Sunday
- **Saved**: Sunday at midnight (end of week)
- **Viewing**:
  - Current week (any day Mon-Sun) → Real-time calculation up to TODAY
  - Past weeks → Saved progress from Sunday's record

### Monthly Goals
- **Period**: 1st to last day of month
- **Saved**: Last day of month at midnight
- **Viewing**:
  - Current month (any day) → Real-time calculation up to TODAY
  - Past months → Saved progress from month-end record

---

## How It Works

### Real-Time vs Saved Data

```javascript
// Pseudo-code logic for loading goals
if (date === TODAY || isCurrentPeriod) {
  // Calculate progress in real-time from sessions table
  progress = calculateFromSessions(startDate, endDate);
} else {
  // Load saved progress from goal_progress table
  progress = loadFromDatabase(goalId, periodEndDate);
}
```

### Current Period Detection

For **weekly/monthly** goals:
- **Current period**: `date >= periodStart && periodEnd >= today`
- **Past period**: `periodEnd < today`

**Example (Weekly Goal):**
- Today: Oct 10 (Thursday)
- Current week: Oct 6 (Mon) - Oct 12 (Sun)
- Viewing Oct 7 (Tue): Shows real-time progress (Mon-Thu)
- Viewing Oct 8 (Wed): Shows real-time progress (Mon-Thu) ← **Same as Oct 7!**
- Viewing Sep 30 (Mon last week): Shows saved progress from Oct 5 (Sunday)

---

## Data Storage

### Database Tables

#### `goals` Table
```sql
CREATE TABLE goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  type TEXT NOT NULL,  -- productivity_score, productivity_time, work_sessions, app, category
  target_value REAL NOT NULL,
  target_unit TEXT,    -- score, minutes, hours, sessions
  target_type TEXT DEFAULT 'minimum',  -- minimum or maximum
  reference_type TEXT, -- productivity_level, app_id, category_name
  reference_id TEXT,   -- actual reference value
  min_session_duration INTEGER,  -- for work_sessions
  frequency TEXT DEFAULT 'daily',  -- daily, weekly, monthly
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  deleted_at INTEGER
);
```

#### `goal_progress` Table
```sql
CREATE TABLE goal_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL,
  date TEXT NOT NULL,  -- YYYY-MM-DD (period END date)
  current_value REAL NOT NULL,
  target_value REAL NOT NULL,
  status TEXT NOT NULL,  -- achieved, in_progress, warning, failed
  achieved_at INTEGER,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  UNIQUE(goal_id, date)
);
```

### Progress Keys

- **Daily**: `date = 2025-10-06`
- **Weekly**: `date = 2025-10-12` (Sunday)
- **Monthly**: `date = 2025-10-31` (last day)

---

## Progress Calculation

### Goal Status

```javascript
function determineGoalStatus(goal, currentValue) {
  const percentage = (currentValue / goal.target_value) * 100;

  if (goal.target_type === 'minimum') {
    if (currentValue >= goal.target_value) return 'achieved';
    if (percentage >= 80) return 'warning';
    if (currentValue > 0) return 'in_progress';
    return 'pending';
  } else {
    // Maximum goals (stay under limit)
    if (currentValue > goal.target_value) return 'failed';
    if (percentage >= 90) return 'warning';
    if (currentValue <= goal.target_value) return 'achieved';
    return 'pending';
  }
}
```

### Status Legend
- **achieved**: Goal met ✅
- **in_progress**: Making progress but not there yet 🟡
- **warning**: Close to target (80-99% for minimum, 90-100% for maximum) ⚠️
- **failed**: Exceeded maximum limit ❌
- **pending**: No activity yet ⏸️

---

## Streak System

Calculates consecutive days where **all applicable goals** were achieved.

### Streak Rules

1. **Daily Goals**: Checked every day
2. **Weekly Goals**: Only checked on Sundays (end of week)
3. **Monthly Goals**: Only checked on last day of month

**Example:**
```
User has: 2 daily goals + 1 weekly goal

Mon: ✅ Both daily goals → Streak = 1
Tue: ✅ Both daily goals → Streak = 2
Wed: ✅ Both daily goals → Streak = 3
Thu: ✅ Both daily goals → Streak = 4
Fri: ✅ Both daily goals → Streak = 5
Sat: ✅ Both daily goals → Streak = 6
Sun: ✅ Both daily goals + ✅ Weekly goal → Streak = 7

Mon: ❌ Only 1 daily goal → Streak breaks!
```

**Why this works:**
- Weekly goal doesn't break streak on Mon-Sat (week isn't over yet!)
- Only checks weekly goal on Sunday when the period is complete
- Monthly goals don't affect daily streaks until month-end

---

## Backfill & Data Integrity

### Auto-Save System

**Triggers:**
1. **Midnight timer**: Saves yesterday's progress every night at 00:00:01
2. **App startup**: Backfills all missing dates since last save

### Backfill Process

When app starts:
1. Find last saved date in `goal_progress`
2. Calculate days between last save and yesterday
3. Determine which dates need saving:
   - **Daily goals**: Every missing day
   - **Weekly goals**: Only Sundays that passed
   - **Monthly goals**: Only month-ends that passed
4. Save progress for each unique date
5. Clean up orphaned data from deleted goals

**Example Backfill:**
```
Last saved: Oct 1 (Tuesday)
App closed for 10 days
App opens: Oct 11 (Friday)

Saves:
- Daily goals: Oct 2, 3, 4, 5, 6, 7, 8, 9, 10 (9 days)
- Weekly goals: Oct 5 (Sunday - end of week 1)
- Monthly goals: None (month not ended)

Total: 9 unique dates saved
```

### Data Integrity

#### 1. Historical Data Protection
```javascript
// Check if progress already exists
if (existingProgress && !forceUpdate) {
  skip(); // Don't overwrite historical data
}
```

#### 2. Goal Creation Date Check
```javascript
// Don't save progress for dates before goal was created
if (goalCreatedDate > date) {
  skip();
}
```

#### 3. Orphaned Data Cleanup
```sql
-- Automatically runs during backfill
DELETE FROM goal_progress
WHERE goal_id NOT IN (SELECT id FROM goals);
```

---

## API Reference

### IPC Handlers (Main → Renderer)

#### Get Goals for Date
```javascript
ipcRenderer.invoke('goals:getForDate', dateString)
// Returns: { goals: [...], stats: {...}, isToday: boolean }
```

#### Create Goal
```javascript
ipcRenderer.invoke('goals:create', {
  name: 'Daily Focus',
  description: 'Stay productive',
  icon: '🎯',
  type: 'productivity_score',
  target_value: 70,
  target_unit: 'score',
  target_type: 'minimum',
  frequency: 'daily'
})
```

#### Update Goal
```javascript
ipcRenderer.invoke('goals:update', goalId, {
  name: 'Updated Name',
  target_value: 80
  // Note: Cannot change 'type'
})
```

#### Delete Goal
```javascript
ipcRenderer.invoke('goals:delete', goalId)
// Soft delete: Sets is_active = 0, deleted_at = timestamp
```

#### Generate Test Data
```javascript
ipcRenderer.invoke('goals:generateTestData')
// Creates 8 sample goals with 30 days of historical progress
```

### Exposed API (Preload)

```javascript
window.electronAPI.getGoalsForDate(date)
window.electronAPI.createGoal(goalData)
window.electronAPI.updateGoal(goalId, goalData)
window.electronAPI.deleteGoal(goalId)
window.electronAPI.generateGoalsTestData()
window.electronAPI.saveYesterdayProgress()
```

---

## Database Schema

### Complete Schema

```sql
-- Goals table
CREATE TABLE goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  type TEXT NOT NULL CHECK(type IN ('productivity_score', 'productivity_time', 'work_sessions', 'app', 'category')),
  target_value REAL NOT NULL,
  target_unit TEXT CHECK(target_unit IN ('score', 'minutes', 'hours', 'sessions')),
  target_type TEXT DEFAULT 'minimum' CHECK(target_type IN ('minimum', 'maximum')),
  reference_type TEXT,
  reference_id TEXT,
  min_session_duration INTEGER,
  frequency TEXT DEFAULT 'daily' CHECK(frequency IN ('daily', 'weekly', 'monthly')),
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  deleted_at INTEGER
);

-- Goal progress table
CREATE TABLE goal_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  current_value REAL NOT NULL,
  target_value REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('achieved', 'in_progress', 'warning', 'failed')),
  achieved_at INTEGER,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  UNIQUE(goal_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_goal_progress_date ON goal_progress(date);
CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_goals_active ON goals(is_active);
CREATE INDEX IF NOT EXISTS idx_goals_frequency ON goals(frequency);
```

---

## Key Functions Reference

### Backend (src/main/ipc/goals.js)

- `getDateRangeForGoal(goal, date)` - Calculate period start/end dates
- `calculateGoalProgress(db, goal, date)` - Calculate current progress
- `determineGoalStatus(goal, currentValue)` - Determine goal status
- `calculateStreak(db, date)` - Calculate achievement streak
- `saveProgressForDate(date)` - Save progress for a specific date
- `backfillMissingProgress()` - Fill in missing historical data
- `findCompletedPeriods(goals, startDate, endDate)` - Find completed weekly/monthly periods
- `cleanupOrphanedProgress()` - Remove progress from deleted goals

### Frontend (src/renderer/js/goals/goals.js)

- `loadGoalsForDate(date)` - Load and display goals for date
- `renderGoalsFromDatabase(goals, isToday)` - Render goal cards
- `createGoalCard(goal, showAppOrCategory, isToday)` - Generate goal HTML
- `handleAddGoal()` - Open create goal modal
- `handleEditGoal(goalCard)` - Open edit goal modal
- `handleDeleteGoal(goalCard)` - Delete goal with confirmation
- `handleGenerateTestData()` - Generate test data

---

## Common Use Cases

### Example 1: Create Daily Productivity Goal

```javascript
await window.electronAPI.createGoal({
  name: 'Stay Productive',
  description: 'Maintain high productivity throughout the day',
  icon: '🎯',
  type: 'productivity_score',
  target_value: 75,
  target_unit: 'score',
  target_type: 'minimum',
  frequency: 'daily'
});
```

### Example 2: Weekly Work Hours Goal

```javascript
await window.electronAPI.createGoal({
  name: 'Weekly Work Hours',
  description: 'Work at least 40 hours per week',
  icon: '💼',
  type: 'productivity_time',
  target_value: 40,
  target_unit: 'hours',
  target_type: 'minimum',
  reference_type: 'productivity_level',
  reference_id: 'productive',
  frequency: 'weekly'
});
```

### Example 3: Limit Social Media (Maximum Goal)

```javascript
await window.electronAPI.createGoal({
  name: 'Limit Distractions',
  description: 'Keep social media under 2 hours daily',
  icon: '🚫',
  type: 'productivity_time',
  target_value: 2,
  target_unit: 'hours',
  target_type: 'maximum',  // Note: maximum (stay under)
  reference_type: 'productivity_level',
  reference_id: 'unproductive',
  frequency: 'daily'
});
```

---

## Troubleshooting

### Issue: Goals not showing on past dates

**Cause**: No saved progress in `goal_progress` table

**Solutions:**
1. Check if app was running at midnight to save progress
2. Restart app to trigger backfill
3. Manually save: `window.electronAPI.saveYesterdayProgress()`

### Issue: Weekly goal shows different values on different days

**Cause**: This is expected behavior for current week

**Explanation**:
- Mon-Sun of current week all calculate real-time up to TODAY
- They show cumulative progress, not daily snapshots
- Only saved weeks (past Sundays) show fixed values

### Issue: Streak breaks mid-week

**Cause**: Fixed in latest version

**Solution**:
- Weekly goals only affect streak on Sundays
- Daily goals affect streak every day
- Check both are being achieved

---

## Version History

**v1.0** (October 2025)
- Initial implementation
- 5 goal types with 3 frequencies
- Real-time + historical progress tracking
- Backfill system for missed days
- Streak calculation
- Data integrity protections

---

## Support

For issues or questions, check:
- Main codebase: `src/main/ipc/goals.js`
- Frontend: `src/renderer/js/goals/goals.js`
- Database: `src/main/services/database.js`
