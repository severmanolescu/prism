// Top Apps in Category
function updateTopApps(topApps, categoryColor) {
  const container = document.querySelector('.top-apps-grid');
  if (!container) return;

  // Clear previous content
  container.innerHTML = '';

  if (!topApps || topApps.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #8f98a0; padding: 40px; grid-column: 1 / -1;">No apps in this category</div>';
    return;
  }

  // Use category color or default
  const bgColor = categoryColor || '#4a90e2';

  topApps.forEach(app => {
    const item = document.createElement('div');
    item.className = 'app-item';
    item.dataset.appId = app.id;

    // Format time and last used
    const totalTimeFormatted = formatTime(app.totalTime);
    const lastUsedFormatted = app.lastUsed
      ? getRelativeTime(app.lastUsed)
      : 'Never';

    // Use emoji icon for now (can be enhanced with real icons later)
    const iconHtml = `<div class="app-icon-small">${getAppIcon(app.name, '')}</div>`;

    item.innerHTML = `
      <div class="app-item-bg" style="background: ${bgColor};">
        ${iconHtml}
      </div>
      <div class="app-item-overlay">
        <div class="app-item-name">${escapeHtml(app.name)}</div>
        <div class="app-item-stats">
          <span class="app-item-hours">${escapeHtml(totalTimeFormatted)}</span>
          <span class="app-item-last-played">${escapeHtml(lastUsedFormatted)}</span>
        </div>
      </div>
    `;

    // Add click handler to show app details
    item.addEventListener('click', () => {
      // Send message to parent to show app details
      window.parent.postMessage({
        type: 'SHOW_APP_DETAILS',
        appName: app.name
      }, '*');
    });

    container.appendChild(item);
  });
}
