/**
 * Context Menu Actions
 * Contains all action handlers for the context menu
 * This file is imported by context-menu.js
 */

// Action handler methods for ContextMenu class
const ContextMenuActions = {
    /**
     * Main action dispatcher
     */
    async handleAction(action) {
        if (!action) return;

        switch(action) {
            case 'open':
                await this.launchApplication();
                break;
            case 'details':
                await this.viewDetails();
                break;
            case 'favorite':
                await this.toggleFavorite();
                break;
            case 'properties':
                await this.showProperties();
                break;
            case 'hide':
                await this.hideApp();
                break;
            case 'restore':
                await this.restoreApp();
                break;
            case 'remove':
                await this.removeApp();
                break;
            case 'location':
                await this.openAppLocation();
                break;
            case 'remove-permanently':
                await this.removePermanently();
                break;
        }
    },

    async openAppLocation(){
        if (!this.currentApp) return;
            const appPath = this.currentApp.path;

            if(appPath){
                window.electronAPI.openFileLocation(appPath);
                showFeedback("App location opened!", true);
            }
        try{

        } catch(error){
            console.error('Error opening app location:', error);
            showFeedback('Failed to open app location', false);
        }
    },

    /**
     * Launch the application
     */
    async launchApplication() {
        if (!this.currentApp) return;

        try {
            const appId = this.currentApp.id;
            const appName = this.currentApp.name || this.currentApp.appName;

            if (appId) {
                await window.electronAPI.launchApp(appId);
                showFeedback(`Launching ${appName}...`, true);
            }
        } catch (error) {
            console.error('Error launching app:', error);
            showFeedback('Failed to launch application', false);
        }
    },

    /**
     * View app details page
     */
    async viewDetails() {
        if (!this.currentApp) return;

        try {
            const appName = this.currentApp.name || this.currentApp.appName;
            if (appName) {
                await showAppDetails(appName);
            }
        } catch (error) {
            console.error('Error loading details:', error);
            showFeedback('Failed to load app details', false);
        }
    },

    /**
     * Toggle favorite status
     */
    async toggleFavorite() {
        if (!this.currentApp) return;

        try {
            const appId = this.currentApp.id;
            if (!appId) {
                console.error('App ID is missing');
                return;
            }

            // favoritesCache is an array of app objects, not IDs
            const favoriteIds = favoritesCache.map(app => app.id);
            const isFavorite = favoriteIds.includes(appId);

            if (isFavorite) {
                const result = await window.electronAPI.removeFromFavorites(appId);
                if (result.success) {
                    favoritesCache = await window.electronAPI.getFavorites();
                    showFeedback('Removed from favorites', true);

                    // Refresh navigation to update Favorites section
                    await createCategoryNavigation(allAppsCache);

                    // Refresh current view
                    if (currentCategory === 'Favorites') {
                        await loadFavoriteApps();
                    } else {
                        displayAllApps(allAppsCache);
                    }
                }
            } else {
                const result = await window.electronAPI.addToFavorites(appId);
                if (result.success) {
                    favoritesCache = await window.electronAPI.getFavorites();
                    showFeedback('Added to favorites', true);

                    // Refresh navigation to update Favorites section
                    await createCategoryNavigation(allAppsCache);

                    // Refresh current view
                    displayAllApps(allAppsCache);
                }
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            showFeedback('Failed to update favorites', false);
        }
    },

    /**
     * Hide app from library
     */
    async hideApp() {
        if (!this.currentApp) return;

        try {
            const appId = this.currentApp.id;
            if (!appId) {
                console.error('App ID is missing');
                return;
            }

            const result = await window.electronAPI.hideAppFromLibrary(appId);
            if (result.success) {
                showFeedback('App hidden from library', true);

                // Reload all apps from database (this excludes hidden apps)
                allAppsCache = await window.electronAPI.getAllApps();

                // Refresh navigation to update sidebar
                await createCategoryNavigation(allAppsCache);

                // Refresh the current view
                if (currentCategory === 'Favorites') {
                    await loadFavoriteApps();
                } else if (currentCategory !== 'All Apps') {
                    await loadAppsByCategory(currentCategory);
                } else {
                    displayAllApps(allAppsCache);
                }
            }
        } catch (error) {
            console.error('Error hiding app:', error);
            showFeedback('Failed to hide app', false);
        }
    },

    /**
     * Restore app to library
     */
    async restoreApp() {
        if (!this.currentApp) return;

        try {
            const appId = this.currentApp.id;
            if (!appId) {
                console.error('App ID is missing');
                return;
            }

            const result = await window.electronAPI.restoreHiddenApp(appId);
            if (result.success) {
                showFeedback('App restored to library', true);

                // Reload all apps from database (now includes restored app)
                allAppsCache = await window.electronAPI.getAllApps();

                // Refresh navigation to update sidebar
                await createCategoryNavigation(allAppsCache);

                // Refresh the current view
                if (currentCategory === 'Favorites') {
                    await loadFavoriteApps();
                } else if (currentCategory !== 'All Apps') {
                    await loadAppsByCategory(currentCategory);
                } else {
                    displayAllApps(allAppsCache);
                }
            }
        } catch (error) {
            console.error('Error restoring app:', error);
            showFeedback('Failed to restore app', false);
        }
    },

    /**
     * Remove app (keep data, just remove from tracking)
     */
    async removeApp() {
        if (!this.currentApp) return;

        // Store app info before showing dialog (currentApp will be null after menu closes)
        const appId = this.currentApp.id;
        const appName = this.currentApp.name || this.currentApp.appName;

        if (!appId) {
            console.error('App ID is missing');
            return;
        }

        const confirmed = await window.confirmationDialog.show({
            title: 'Remove from Tracker',
            message: `Are you sure you want to stop tracking "${appName}"? This will keep your existing data.`,
            icon: '❌',
            iconColor: '#e74c3c',
            confirmText: 'Remove',
            cancelText: 'Cancel',
            dangerMode: false
        });

        if (!confirmed) return;

        try {

            const result = await window.electronAPI.removeAppFromTracker(appId);
            if (result.success) {
                showFeedback('App removed from tracker', true);

                // Reload all apps from database
                allAppsCache = await window.electronAPI.getAllApps();

                // Refresh navigation to update sidebar
                await createCategoryNavigation(allAppsCache);

                // Refresh the current view
                if (currentCategory === 'Favorites') {
                    await loadFavoriteApps();
                } else if (currentCategory !== 'All Apps') {
                    await loadAppsByCategory(currentCategory);
                } else {
                    displayAllApps(allAppsCache);
                }
            }
        } catch (error) {
            console.error('Error removing app:', error);
            showFeedback('Failed to remove app', false);
        }
    },

    /**
     * Permanently delete app and all data
     */
    async removePermanently() {
        if (!this.currentApp) return;

        // Store app info before showing dialog (currentApp will be null after menu closes)
        const appId = this.currentApp.id;
        const appName = this.currentApp.name || this.currentApp.appName;

        if (!appId) {
            console.error('App ID is missing');
            return;
        }

        const confirmed = await window.confirmationDialog.show({
            title: 'Permanently Delete',
            message: `Are you sure you want to permanently delete "${appName}" and ALL its data? This cannot be undone.`,
            icon: '🗑️',
            iconColor: '#c0392b',
            confirmText: 'Delete Permanently',
            cancelText: 'Cancel',
            dangerMode: true
        });

        if (!confirmed) return;

        try {

            const result = await window.electronAPI.removeAppPermanently(appId);
            if (result.success) {
                showFeedback('App permanently deleted', true);

                // Reload all apps from database
                allAppsCache = await window.electronAPI.getAllApps();

                // Refresh navigation to update sidebar
                await createCategoryNavigation(allAppsCache);

                // Refresh the current view
                if (currentCategory === 'Favorites') {
                    await loadFavoriteApps();
                } else if (currentCategory !== 'All Apps') {
                    await loadAppsByCategory(currentCategory);
                } else {
                    displayAllApps(allAppsCache);
                }
            }
        } catch (error) {
            console.error('Error deleting app:', error);
            showFeedback('Failed to delete app', false);
        }
    },

    /**
     * Move app to a different category
     */
    async moveAppToCategory(newCategory) {
        if (!this.currentApp) return;

        try {
            const appId = this.currentApp.id;
            if (!appId) {
                console.error('App ID is missing from currentApp object');
                return;
            }

            const result = await window.electronAPI.moveAppToCollection(appId, newCategory);
            if (result.success) {
                // Update the app in the cache
                const app = allAppsCache.find(app => app.id === appId);
                if (app) {
                    app.category = newCategory;
                }

                // Update favorites cache as well
                favoritesCache = await window.electronAPI.getFavorites();

                // Refresh navigation
                createCategoryNavigation(allAppsCache);

                // Refresh the current view based on what's currently displayed
                if (currentCategory !== 'All Apps') {
                    // If we're viewing a specific category, reload that category
                    if (currentCategory === 'Favorites') {
                        await loadFavoriteApps();
                    } else {
                        await loadAppsByCategory(currentCategory);
                    }
                } else {
                    // If we're viewing all apps, refresh the entire display
                    displayAllApps(allAppsCache);
                }

                // If we're in collections view, refresh that too
                const categoryOverview = document.getElementById('categoryOverview');
                if (categoryOverview) {
                    showCategoryOverview();
                }
            }
        } catch (error) {
            console.error('Error moving app to category:', error);
        }
    },

    /**
     * Get current app's category
     */
    getCurrentAppCategory() {
        if (!this.currentApp || !this.currentApp.id) return 'Uncategorized';

        // Find the app in the cache to get its current category
        const app = allAppsCache.find(app => app.id === this.currentApp.id);
        return app ? app.category : 'Uncategorized';
    },

    /**
     * Populate "Add to" submenu with available categories
     */
    async populateAddToSubmenu(submenu) {
        try {
            const categories = await window.electronAPI.getCategories();
            const currentCategory = this.getCurrentAppCategory();

            // Filter out current category
            const availableCategories = categories.filter(cat => cat.name !== currentCategory);

            if (availableCategories.length === 0) {
                submenu.innerHTML = '<div class="submenu-disabled">No other categories available</div>';
                return;
            }

            submenu.innerHTML = '';
            availableCategories.forEach(category => {
                const color = category.color || '#4a90e2';
                const div = document.createElement('div');
                div.className = 'submenu-item-option';
                div.dataset.category = category.name;
                div.innerHTML = `
                    <span class="category-color" style="background-color: ${color}"></span>
                    <span>${getCategoryIcon(category.name)} ${category.name}</span>
                `;
                div.addEventListener('click', () => {
                    this.moveAppToCategory(category.name);
                    this.hide();
                });
                submenu.appendChild(div);
            });
        } catch (error) {
            console.error('Error loading categories:', error);
            submenu.innerHTML = '<div class="submenu-disabled">Error loading categories</div>';
        }
    },

    /**
     * Populate "Remove from" submenu
     */
    async populateRemoveFromSubmenu(submenu) {
        const currentAppCategory = this.getCurrentAppCategory();

        if (currentAppCategory === 'Uncategorized') {
            submenu.innerHTML = '<div class="submenu-disabled">Already in Uncategorized</div>';
            return;
        }

        submenu.innerHTML = `
            <div class="submenu-item-option" data-category="Uncategorized">
                <span class="category-color" style="background-color: #4a90e2"></span>
                <span>Remove from ${currentAppCategory}</span>
            </div>
        `;

        submenu.querySelector('.submenu-item-option').addEventListener('click', () => {
            this.moveAppToCategory('Uncategorized');
            this.hide();
        });
    },

    /**
     * Show properties modal
     */
    async showProperties() {
        if (!this.currentApp) return;

        try {
            const appId = this.currentApp.id;
            if (!appId) {
                console.error('App ID is missing');
                return;
            }

            // Fetch app details
            const details = await window.electronAPI.getAppDetails(appId);
            const categoryColor = await getCategoryColor(details.app.category);

            // Create properties modal
            const modal = document.createElement('div');
            modal.className = 'properties-modal-overlay';
            modal.innerHTML = `
                <div class="properties-modal">
                    <div class="properties-header" style="background: linear-gradient(135deg, ${categoryColor} 0%, ${adjustBrightness(categoryColor, -20)} 100%);">
                        <div class="properties-app-icon">
                            ${details.app.icon_path ?
                                `<img src="app-icon://${details.app.icon_path.replace(/^.*[\\\/]/, '').replace('icons/', '')}" alt="${escapeHtml(details.app.name)}">` :
                                `<span class="app-icon-placeholder">${getAppIcon(details.app.name, details.app.category)}</span>`
                            }
                        </div>
                        <div class="properties-app-info">
                            <h2>${escapeHtml(details.app.name)}</h2>
                            <p class="properties-category">${getCategoryIcon(details.app.category)} ${escapeHtml(details.app.category)}</p>
                        </div>
                        <button class="properties-close-btn" id="closePropertiesModal">✕</button>
                    </div>
                    <div class="properties-body">
                        <div class="properties-section">
                            <h3>📊 Statistics</h3>
                            <div class="properties-stats-grid">
                                <div class="property-item">
                                    <span class="property-label">Total Time:</span>
                                    <span class="property-value">${formatTime(details.stats.totalTime) || 0}</span>
                                </div>
                                <div class="property-item">
                                    <span class="property-label">Total Sessions:</span>
                                    <span class="property-value">${details.stats.sessionCount || 0}</span>
                                </div>
                                <div class="property-item">
                                    <span class="property-label">This Week:</span>
                                    <span class="property-value">${formatTime(details.stats.thisWeek || 0)}</span>
                                </div>
                                <div class="property-item">
                                    <span class="property-label">Longest Session:</span>
                                    <span class="property-value">${formatTime(details.stats.longestSession || 0)}</span>
                                </div>
                                <div class="property-item">
                                    <span class="property-label">Average Session:</span>
                                    <span class="property-value">${formatTime(details.stats.avgSession || 0)}</span>
                                </div>
                                <div class="property-item">
                                    <span class="property-label">First used:</span>
                                    <span class="property-value">${details.stats.firstUsed ? new Date(details.stats.firstUsed).toLocaleDateString() : 'Never'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="properties-section">
                            <h3>🔧 Details</h3>
                            <div class="property-item">
                                <span class="property-label">Executable Path:</span>
                                <span class="property-value property-path">${escapeHtml(details.app.path || 'Unknown')}</span>
                            </div>
                            <div class="property-item">
                                <span class="property-label">Category:</span>
                                <span class="property-value">${escapeHtml(details.app.category)}</span>
                            </div>
                            <div class="property-item">
                                <span class="property-label">Productivity:</span>
                                <span class="property-value">${details.app.productivity_level || 'Use Category Default'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="properties-footer">
                        <button class="properties-btn btn-secondary" id="openAppLocation">Open App Location</button>
                        <button class="properties-btn btn-secondary" id="propertiesViewDetails">View Full Details</button>
                        <button class="properties-btn btn-primary" id="propertiesClose">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Add event listeners
            const closeBtn = modal.querySelector('#closePropertiesModal');
            const closeFooterBtn = modal.querySelector('#propertiesClose');
            const viewDetailsBtn = modal.querySelector('#propertiesViewDetails');
            const openAppLocationBtn = modal.querySelector('#openAppLocation');

            const closeModal = () => {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            };

            closeBtn.addEventListener('click', closeModal);
            closeFooterBtn.addEventListener('click', closeModal);
            viewDetailsBtn.addEventListener('click', () => {
                closeModal();
                showAppDetails(details.app.name);
            });

            openAppLocationBtn.addEventListener('click', () => {
                window.electronAPI.openFileLocation(details.app.path);
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
};
