// Goals filter functionality

let currentFilter = 'all';
let currentSearchQuery = '';

// Initialize filter listeners
function initializeFilters() {
  const searchInput = document.getElementById('goal-search');
  const filterButtons = document.querySelectorAll('.filter-btn');

  // Search input listener
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.toLowerCase().trim();
      applyFilters();
    });

    // Handle search navigation with arrow keys
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (e.target.value.trim() === '') {
          // If empty, unfocus the search input
          e.target.value = '';
          currentSearchQuery = '';
          
          e.target.blur();
          applyFilters();
        } else {
          // If has text, clear it
          e.target.value = '';
          currentSearchQuery = '';
          applyFilters();
        }
        return;
      }
    });
  }

  // Filter button listeners
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all buttons
      filterButtons.forEach(b => b.classList.remove('active'));

      // Add active to clicked button
      btn.classList.add('active');

      // Update current filter
      currentFilter = btn.dataset.filter;

      // Apply filters
      applyFilters();
    });
  });
}

// Apply search and status filters to all goal cards
function applyFilters() {
  const allGoalCards = document.querySelectorAll('.goal-card:not(.inactive)');
  let visibleCount = 0;

  allGoalCards.forEach(card => {
    const matchesSearch = matchesSearchQuery(card);
    const matchesFilter = matchesStatusFilter(card);

    if (matchesSearch && matchesFilter) {
      card.style.display = 'flex';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  // Show/hide empty state messages
  updateEmptyStates(visibleCount);
}

// Check if goal card matches search query
function matchesSearchQuery(card) {
  if (!currentSearchQuery) return true;

  const goalName = card.querySelector('.goal-card-name')?.textContent.toLowerCase() || '';
  const goalDescription = card.querySelector('.goal-card-description')?.textContent.toLowerCase() || '';
  const referenceBadge = card.querySelector('.goal-reference-badge')?.textContent.toLowerCase() || '';

  return goalName.includes(currentSearchQuery) ||
         goalDescription.includes(currentSearchQuery) ||
         referenceBadge.includes(currentSearchQuery);
}

// Check if goal card matches status filter
function matchesStatusFilter(card) {
  if (currentFilter === 'all') return true;

  // Get status from the card's classes or status badge
  const statusBadge = card.querySelector('.goal-status-badge');

  if (!statusBadge) return false;

  const cardStatus = Array.from(statusBadge.classList)
    .find(cls => ['achieved', 'in_progress', 'warning', 'failed', 'pending'].includes(cls));

  return cardStatus === currentFilter;
}

// Update empty state messages for each section
function updateEmptyStates(visibleCount) {
  const sections = document.querySelectorAll('.goals-section');

  sections.forEach(section => {
    const goalsGrid = section.querySelector('.goals-grid');
    if (!goalsGrid) return;

    const visibleCards = Array.from(goalsGrid.querySelectorAll('.goal-card:not(.inactive)'))
      .filter(card => card.style.display !== 'none');

    // Remove existing empty state
    const existingEmpty = goalsGrid.querySelector('.no-goals-message');
    if (existingEmpty) {
      existingEmpty.remove();
    }

    // Add empty state if no visible cards
    if (visibleCards.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'no-goals-message';
      emptyMessage.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #8f98a0;">
          <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.5;">🔍</div>
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #c6d4df;">No goals found</div>
          <div style="font-size: 14px;">Try adjusting your search or filter criteria</div>
        </div>
      `;
      goalsGrid.appendChild(emptyMessage);
    }
  });
}

// Reset filters
function resetFilters() {
  currentFilter = 'all';
  currentSearchQuery = '';

  const searchInput = document.getElementById('goal-search');
  if (searchInput) {
    searchInput.value = '';
  }

  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.filter === 'all') {
      btn.classList.add('active');
    }
  });

  applyFilters();
}

// Call initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeFilters();
});
