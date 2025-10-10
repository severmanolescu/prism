/**
 * Goal Templates - Pre-defined goal templates for common productivity goals
 */

const templates = [
  // Productivity Score Goals
  {
    id: 'daily-productivity-70',
    category: 'Productivity',
    name: 'Daily Productivity Target',
    description: 'Achieve a productivity score of 70 or higher each day',
    icon: '🎯',
    type: 'productivity_score',
    target_value: 70,
    target_unit: 'score',
    target_type: 'minimum',
    reference_type: null,
    reference_id: null,
    min_session_duration: null,
    frequency: 'daily'
  },
  {
    id: 'weekly-productivity-75',
    category: 'Productivity',
    name: 'Weekly Productivity Goal',
    description: 'Maintain an average productivity score of 75 for the week',
    icon: '📊',
    type: 'productivity_score',
    target_value: 75,
    target_unit: 'score',
    target_type: 'minimum',
    reference_type: null,
    reference_id: null,
    min_session_duration: null,
    frequency: 'weekly'
  },

  // Focus Time Goals
  {
    id: 'daily-focus-4h',
    category: 'Focus',
    name: 'Daily Focus Time',
    description: 'Spend at least 4 hours on productive tasks each day',
    icon: '⏱️',
    type: 'productivity_time',
    target_value: 240,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily'
  },
  {
    id: 'daily-limit-distractions-2h',
    category: 'Focus',
    name: 'Limit Distractions',
    description: 'Keep unproductive time under 2 hours per day',
    icon: '🚫',
    type: 'productivity_time',
    target_value: 120,
    target_unit: 'minutes',
    target_type: 'maximum',
    reference_type: 'productivity_level',
    reference_id: 'unproductive',
    min_session_duration: null,
    frequency: 'daily'
  },

  // Work Sessions Goals
  {
    id: 'daily-deep-work-3',
    category: 'Deep Work',
    name: 'Daily Deep Work Sessions',
    description: 'Complete 3 deep work sessions (25+ minutes) each day',
    icon: '🧠',
    type: 'work_sessions',
    target_value: 3,
    target_unit: 'sessions',
    target_type: 'minimum',
    reference_type: null,
    reference_id: null,
    min_session_duration: 25,
    frequency: 'daily'
  },
  {
    id: 'weekly-deep-work-15',
    category: 'Deep Work',
    name: 'Weekly Deep Work Goal',
    description: 'Complete 15 deep work sessions throughout the week',
    icon: '💪',
    type: 'work_sessions',
    target_value: 15,
    target_unit: 'sessions',
    target_type: 'minimum',
    reference_type: null,
    reference_id: null,
    min_session_duration: 25,
    frequency: 'weekly'
  },
  {
    id: 'daily-pomodoro-8',
    category: 'Deep Work',
    name: 'Pomodoro Sessions',
    description: 'Complete 8 Pomodoro sessions (25 minutes each)',
    icon: '🍅',
    type: 'work_sessions',
    target_value: 8,
    target_unit: 'sessions',
    target_type: 'minimum',
    reference_type: null,
    reference_id: null,
    min_session_duration: 25,
    frequency: 'daily'
  },

  // Weekly Goals
  {
    id: 'weekly-focus-20h',
    category: 'Focus',
    name: 'Weekly Focus Target',
    description: 'Accumulate at least 20 hours of focused work this week',
    icon: '🎯',
    type: 'productivity_time',
    target_value: 1200,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'weekly'
  },
  {
    id: 'weekly-limit-distractions-10h',
    category: 'Focus',
    name: 'Weekly Distraction Limit',
    description: 'Keep unproductive time under 10 hours for the week',
    icon: '⏱️',
    type: 'productivity_time',
    target_value: 600,
    target_unit: 'minutes',
    target_type: 'maximum',
    reference_type: 'productivity_level',
    reference_id: 'unproductive',
    min_session_duration: null,
    frequency: 'weekly'
  },

  // Monthly Goals
  {
    id: 'monthly-productivity-80',
    category: 'Productivity',
    name: 'Monthly Excellence',
    description: 'Maintain an average productivity score of 80 for the month',
    icon: '🏆',
    type: 'productivity_score',
    target_value: 80,
    target_unit: 'score',
    target_type: 'minimum',
    reference_type: null,
    reference_id: null,
    min_session_duration: null,
    frequency: 'monthly'
  },
  {
    id: 'monthly-focus-80h',
    category: 'Focus',
    name: 'Monthly Focus Marathon',
    description: 'Achieve 80 hours of focused work this month',
    icon: '🎖️',
    type: 'productivity_time',
    target_value: 4800,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'monthly'
  },
  {
    id: 'monthly-deep-work-60',
    category: 'Deep Work',
    name: 'Monthly Deep Work Challenge',
    description: 'Complete 60 deep work sessions (25+ min) this month',
    icon: '🔥',
    type: 'work_sessions',
    target_value: 60,
    target_unit: 'sessions',
    target_type: 'minimum',
    reference_type: 'productive',
    reference_id: null,
    min_session_duration: 25,
    frequency: 'monthly'
  },

  // Consistency & Habits
  {
    id: 'weekly-consistency',
    category: 'Habits',
    name: 'Consistency Streak',
    description: 'Work at least 2 hours productively every day this week',
    icon: '📅',
    type: 'productivity_time',
    target_value: 120,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily'
  },
  {
    id: 'daily-no-zero-days',
    category: 'Habits',
    name: 'No Zero Days',
    description: 'Log at least 30 minutes of productive time every single day',
    icon: '✅',
    type: 'productivity_time',
    target_value: 30,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily'
  },
  {
    id: 'daily-minimum-1h',
    category: 'Habits',
    name: 'Daily Minimum',
    description: 'Ensure at least 1 hour of productive work every day',
    icon: '⏰',
    type: 'productivity_time',
    target_value: 60,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily'
  },

  // Challenge Goals
  {
    id: 'daily-focus-8h',
    category: 'Challenges',
    name: 'Full Workday Focus',
    description: 'Achieve a full 8 hours of productive work in one day',
    icon: '🎯',
    type: 'productivity_time',
    target_value: 480,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily'
  },
  {
    id: 'daily-productivity-85',
    category: 'Challenges',
    name: 'High Performance Day',
    description: 'Reach a productivity score of 85 or higher',
    icon: '⚡',
    type: 'productivity_score',
    target_value: 85,
    target_unit: 'score',
    target_type: 'minimum',
    reference_type: null,
    reference_id: null,
    min_session_duration: null,
    frequency: 'daily'
  },
  {
    id: 'weekly-focus-30h',
    category: 'Challenges',
    name: 'Weekly Power Sprint',
    description: 'Complete 30 hours of focused work in one week',
    icon: '💪',
    type: 'productivity_time',
    target_value: 1800,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'weekly'
  },
  {
    id: 'weekly-deep-work-20',
    category: 'Challenges',
    name: 'Weekly Deep Work Push',
    description: 'Complete 20 deep work sessions (25+ min) in one week',
    icon: '🔥',
    type: 'work_sessions',
    target_value: 20,
    target_unit: 'sessions',
    target_type: 'minimum',
    reference_type: 'productive',
    reference_id: null,
    min_session_duration: 25,
    frequency: 'weekly'
  },
  {
    id: 'monthly-focus-100h',
    category: 'Challenges',
    name: 'Monthly Century',
    description: 'Reach 100 hours of productive work in one month',
    icon: '💯',
    type: 'productivity_time',
    target_value: 6000,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'monthly'
  },
  {
    id: 'daily-zero-distractions',
    category: 'Challenges',
    name: 'Zero Distraction Day',
    description: 'Keep unproductive time under 30 minutes for the day',
    icon: '🛡️',
    type: 'productivity_time',
    target_value: 30,
    target_unit: 'minutes',
    target_type: 'maximum',
    reference_type: 'productivity_level',
    reference_id: 'unproductive',
    min_session_duration: null,
    frequency: 'daily'
  },
  {
    id: 'weekly-productivity-85',
    category: 'Challenges',
    name: 'Excellence Week',
    description: 'Maintain an 85+ average productivity score for the week',
    icon: '🏆',
    type: 'productivity_score',
    target_value: 85,
    target_unit: 'score',
    target_type: 'minimum',
    reference_type: null,
    reference_id: null,
    min_session_duration: null,
    frequency: 'weekly'
  },
  {
    id: 'daily-deep-work-5',
    category: 'Challenges',
    name: 'Deep Work Marathon',
    description: 'Complete 5 deep work sessions (25+ min) in one day',
    icon: '🚀',
    type: 'work_sessions',
    target_value: 5,
    target_unit: 'sessions',
    target_type: 'minimum',
    reference_type: 'productive',
    reference_id: null,
    min_session_duration: 25,
    frequency: 'daily'
  },

  // Weekday-Specific Goals
  {
    id: 'weekday-power-start',
    category: 'Weekdays',
    name: 'Weekday Power Start',
    description: 'Hit 5 hours of focused work every weekday (Mon-Fri)',
    icon: '💼',
    type: 'productivity_time',
    target_value: 300,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily',
    active_days: '1,2,3,4,5' // Monday to Friday
  },
  {
    id: 'weekday-full-workday',
    category: 'Weekdays',
    name: 'Full Workday (Mon-Fri)',
    description: 'Complete 8 hours of productive work each weekday',
    icon: '👔',
    type: 'productivity_time',
    target_value: 480,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily',
    active_days: '1,2,3,4,5' // Monday to Friday
  },
  {
    id: 'weekday-deep-focus',
    category: 'Weekdays',
    name: 'Weekday Deep Focus',
    description: '4 deep work sessions (25+ min) every weekday',
    icon: '🎯',
    type: 'work_sessions',
    target_value: 4,
    target_unit: 'sessions',
    target_type: 'minimum',
    reference_type: 'productive',
    reference_id: null,
    min_session_duration: 25,
    frequency: 'daily',
    active_days: '1,2,3,4,5' // Monday to Friday
  },
  {
    id: 'weekday-productivity-score',
    category: 'Weekdays',
    name: 'Weekday Excellence',
    description: 'Maintain 75+ productivity score on weekdays',
    icon: '📈',
    type: 'productivity_score',
    target_value: 75,
    target_unit: 'score',
    target_type: 'minimum',
    reference_type: null,
    reference_id: null,
    min_session_duration: null,
    frequency: 'daily',
    active_days: '1,2,3,4,5' // Monday to Friday
  },
  {
    id: 'weekend-learning',
    category: 'Weekends',
    name: 'Weekend Learning',
    description: 'Dedicate 3 hours to productive work on weekends',
    icon: '📚',
    type: 'productivity_time',
    target_value: 180,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily',
    active_days: '0,6' // Saturday and Sunday
  },
  {
    id: 'weekend-side-project',
    category: 'Weekends',
    name: 'Weekend Side Project',
    description: 'Work 4 hours on side projects every weekend',
    icon: '🛠️',
    type: 'productivity_time',
    target_value: 240,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily',
    active_days: '0,6' // Saturday and Sunday
  },
  {
    id: 'weekend-no-distractions',
    category: 'Weekends',
    name: 'Focused Weekends',
    description: 'Keep unproductive time under 3 hours on weekends',
    icon: '🧘',
    type: 'productivity_time',
    target_value: 180,
    target_unit: 'minutes',
    target_type: 'maximum',
    reference_type: 'productivity_level',
    reference_id: 'unproductive',
    min_session_duration: null,
    frequency: 'daily',
    active_days: '0,6' // Saturday and Sunday
  },
  {
    id: 'monday-momentum',
    category: 'Single Day',
    name: 'Monday Momentum',
    description: 'Start the week strong with 6 hours of focus',
    icon: '🚀',
    type: 'productivity_time',
    target_value: 360,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily',
    active_days: '1' // Monday only
  },
  {
    id: 'friday-finish-strong',
    category: 'Single Day',
    name: 'Friday Finish Strong',
    description: 'End the week with 5 hours of productive work',
    icon: '🏁',
    type: 'productivity_time',
    target_value: 300,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily',
    active_days: '5' // Friday only
  },
  {
    id: 'hump-day-focus',
    category: 'Single Day',
    name: 'Hump Day Focus',
    description: 'Wednesday deep work: 5 sessions of 25+ minutes',
    icon: '🐫',
    type: 'work_sessions',
    target_value: 5,
    target_unit: 'sessions',
    target_type: 'minimum',
    reference_type: 'productive',
    reference_id: null,
    min_session_duration: 25,
    frequency: 'daily',
    active_days: '3' // Wednesday only
  },

  // Balance Goals
  {
    id: 'weekday-balance',
    category: 'Balance',
    name: 'Work-Life Balance',
    description: 'Limit work to 6 hours max on weekdays',
    icon: '⚖️',
    type: 'productivity_time',
    target_value: 360,
    target_unit: 'minutes',
    target_type: 'maximum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily',
    active_days: '1,2,3,4,5' // Monday to Friday
  },
  {
    id: 'weekend-rest',
    category: 'Balance',
    name: 'Weekend Rest',
    description: 'Keep productive work under 2 hours on weekends',
    icon: '🌴',
    type: 'productivity_time',
    target_value: 120,
    target_unit: 'minutes',
    target_type: 'maximum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily',
    active_days: '0,6' // Saturday and Sunday
  },
  {
    id: 'friday-wind-down',
    category: 'Balance',
    name: 'Friday Wind Down',
    description: 'Ease into weekend: max 5 hours of work on Friday',
    icon: '🌅',
    type: 'productivity_time',
    target_value: 300,
    target_unit: 'minutes',
    target_type: 'maximum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily',
    active_days: '5' // Friday only
  },

  // Custom Schedules
  {
    id: 'tue-thu-sprint',
    category: 'Custom Schedule',
    name: 'Tuesday-Thursday Sprint',
    description: 'High-intensity days: 7 hours focus on Tue & Thu',
    icon: '⚡',
    type: 'productivity_time',
    target_value: 420,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily',
    active_days: '2,4' // Tuesday and Thursday
  },
  {
    id: 'mon-wed-fri-deep-work',
    category: 'Custom Schedule',
    name: 'MWF Deep Work',
    description: '6 deep work sessions on Mon, Wed, Fri',
    icon: '🔥',
    type: 'work_sessions',
    target_value: 6,
    target_unit: 'sessions',
    target_type: 'minimum',
    reference_type: 'productive',
    reference_id: null,
    min_session_duration: 25,
    frequency: 'daily',
    active_days: '1,3,5' // Monday, Wednesday, Friday
  },
  {
    id: 'tue-thu-meetings',
    category: 'Custom Schedule',
    name: 'Tue-Thu Meeting Days',
    description: 'Lighter focus days: 3 hours minimum on Tue & Thu',
    icon: '💬',
    type: 'productivity_time',
    target_value: 180,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily',
    active_days: '2,4' // Tuesday and Thursday
  },
  {
    id: 'saturday-productivity',
    category: 'Weekends',
    name: 'Saturday Sprint',
    description: 'Make Saturdays count: 5 hours of focused work',
    icon: '🏃',
    type: 'productivity_time',
    target_value: 300,
    target_unit: 'minutes',
    target_type: 'minimum',
    reference_type: 'productivity_level',
    reference_id: 'productive',
    min_session_duration: null,
    frequency: 'daily',
    active_days: '6' // Saturday only
  },
  {
    id: 'sunday-planning',
    category: 'Weekends',
    name: 'Sunday Planning',
    description: '2 deep work sessions for weekly planning',
    icon: '📝',
    type: 'work_sessions',
    target_value: 2,
    target_unit: 'sessions',
    target_type: 'minimum',
    reference_type: 'productive',
    reference_id: null,
    min_session_duration: 25,
    frequency: 'daily',
    active_days: '0' // Sunday only
  }
];

/**
 * Get all available templates
 */
function getAllTemplates() {
  return templates;
}

/**
 * Get templates grouped by category
 */
function getTemplatesByCategory() {
  const grouped = {};

  templates.forEach(template => {
    if (!grouped[template.category]) {
      grouped[template.category] = [];
    }
    grouped[template.category].push(template);
  });

  return grouped;
}

/**
 * Create a goal from a template with optional customizations
 */
function createGoalFromTemplate(templateId, customizations = {}) {
  const template = templates.find(t => t.id === templateId);

  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Create goal data from template, allowing customizations to override
  return {
    name: customizations.name || template.name,
    description: customizations.description || template.description,
    icon: customizations.icon || template.icon,
    type: template.type,
    target_value: customizations.target_value || template.target_value,
    target_unit: template.target_unit,
    target_type: template.target_type,
    reference_type: template.reference_type,
    reference_id: customizations.reference_id || template.reference_id,
    min_session_duration: customizations.min_session_duration || template.min_session_duration,
    frequency: customizations.frequency || template.frequency,
    active_days: customizations.active_days || template.active_days || null
  };
}

module.exports = {
  getAllTemplates,
  getTemplatesByCategory,
  createGoalFromTemplate
};
