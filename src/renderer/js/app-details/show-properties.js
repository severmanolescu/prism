async function showProperties() {
    if (!appDetails) return;

    try {
        const appId = appDetails;
        if (!appId) {
            console.error('App ID is missing');
            return;
        }

        // Create properties modal
        const modal = document.createElement('div');
        modal.className = 'properties-modal-overlay';
        modal.innerHTML = `
                <div class="properties-modal">
                    <div class="properties-header" style="background: linear-gradient(135deg, ${appDetails.categoryColor} 0%, ${adjustBrightness(appDetails.categoryColor, -20)} 100%);">
                        <div class="properties-app-icon">
                            ${appDetails.app.icon_path ?
                                `<img src="app-icon://${appDetails.app.icon_path.replace(/^.*[\\\/]/, '').replace('icons/', '')}" alt="${escapeHtml(appDetails.app.name)}">` :
                                `<span class="app-icon-placeholder">${getAppIcon(appDetails.app.name, appDetails.app.category)}</span>`
                            }
                        </div>
                        <div class="properties-app-info">
                            <h2>${escapeHtml(appDetails.app.name)}</h2>
                            <p class="properties-category">${getCategoryIcon(appDetails.app.category)} ${escapeHtml(appDetails.app.category)}</p>
                        </div>
                        <button class="properties-close-btn" id="closePropertiesModal">✕</button>
                    </div>
                    <div class="properties-body">
                        <div class="properties-section">
                            <h3>🔧 Details</h3>
                            <div class="property-item">
                                <span class="property-label">Executable: </span>
                                <span class="property-value property-path">${escapeHtml(appDetails.app.path || 'Unknown')}</span>
                            </div>
                            <div class="property-item">
                                <span class="property-label">Path:</span>
                                <span class="property-value property-path">${escapeHtml(appDetails.app.path || 'Unknown')}</span>
                            </div>
                            <div class="property-item">
                                <span class="property-label">First used:</span>
                                <span class="property-value">${appDetails.app.first_used ? new Date(appDetails.app.first_used).toLocaleDateString() : 'Never'}</span>
                            </div>
                            <div class="property-item">
                                <span class="property-label">Last Used:</span>
                                <span class="property-value">${appDetails.app.last_used ? new Date(appDetails.app.last_used).toLocaleDateString() : 'Never'}</span>
                            </div>
                            <div class="property-item">
                                <span class="property-label">Total Time:</span>
                                <span class="property-value">${formatTime(appDetails.app.total_time) || 0}</span>
                            </div>
                            <div class="property-item">
                                <span class="property-label">Launch Count:</span>
                                <span class="property-value">${appDetails.app.launch_count || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div class="properties-footer">
                        <button class="properties-btn btn-secondary" id="openAppLocation">Open App Location</button>
                        <button class="properties-btn btn-primary" id="propertiesClose">Close</button>
                    </div>
                </div>
            `;
        document.body.appendChild(modal);

        // Add event listeners
        const closeBtn = modal.querySelector('#closePropertiesModal');
        const closeFooterBtn = modal.querySelector('#propertiesClose');
        const openAppLocationBtn = modal.querySelector('#openAppLocation');

        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        closeFooterBtn.addEventListener('click', closeModal);

        openAppLocationBtn.addEventListener('click', () => {
            window.electronAPI.openFileLocation(appDetails.app.path);
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEscape);
                closeModal();
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Show with animation
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

    } catch (error) {
        console.error('Error showing properties:', error);
        showFeedback('Failed to load properties', false);
    }
}
