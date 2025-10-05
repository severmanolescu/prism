// Goals page functionality

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadGoals();
});

// Setup event listeners
function setupEventListeners() {
  const addGoalBtn = document.getElementById('addGoalBtn');
  if (addGoalBtn) {
    addGoalBtn.addEventListener('click', handleAddGoal);
  }

  // Edit buttons
  document.querySelectorAll('.icon-btn[title="Edit goal"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const goalCard = e.target.closest('.goal-card');
      handleEditGoal(goalCard);
    });
  });

  // Delete buttons
  document.querySelectorAll('.icon-btn[title="Delete goal"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const goalCard = e.target.closest('.goal-card');
      handleDeleteGoal(goalCard);
    });
  });
}

// Load goals from database
async function loadGoals() {
  // TODO: Implement when backend is ready
  console.log('Loading goals...');
}

// Handle add new goal
function handleAddGoal() {
  // TODO: Open modal/dialog to create new goal
  console.log('Add new goal');
}

// Handle edit goal
function handleEditGoal(goalCard) {
  // TODO: Open modal/dialog to edit goal
  const goalName = goalCard.querySelector('.goal-name').textContent;
  console.log('Edit goal:', goalName);
}

// Handle delete goal
function handleDeleteGoal(goalCard) {
  // TODO: Confirm and delete goal
  const goalName = goalCard.querySelector('.goal-name').textContent;
  if (confirm(`Are you sure you want to delete the goal "${goalName}"?`)) {
    console.log('Delete goal:', goalName);
    // goalCard.remove();
  }
}
