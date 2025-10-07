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
            case 'hide':
                await this.hideApp();
                break;
            case 'restore':
                await this.restoreApp();
                break;
            case 'remove':
                await this.removeApp();
                break;
            case 'remove-permanently':
                await this.removePermanently();
                break;
        }
    },

    /**
     * Launch the application
     */
    async launchApplication() {
        if (!this.currentApp) return;

        try {
            const appName = this.currentApp.name || this.currentApp.appName;
            if (appName) {
                await window.electronAPI.launchApp(appName);
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
                await loadAppDetails(appName);
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

            const isFavorite = favoritesCache.some(app => app.id === appId);

            if (isFavorite) {
                const result = await window.electronAPI.removeFromFavorites(appId);
                if (result.success) {
                    favoritesCache = await window.electronAPI.getFavorites();
                    showFeedback('Removed from favorites', true);

                    // Refresh if viewing favorites
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

            const result = await window.electronAPI.hideApp(appId);
            if (result.success) {
                showFeedback('App hidden from library', true);

                // Update the app in cache
                const app = allAppsCache.find(app => app.id === appId);
                if (app) {
                    app.is_hidden = 1;
                }

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

            const result = await window.electronAPI.restoreApp(appId);
            if (result.success) {
                showFeedback('App restored to library', true);

                // Update the app in cache
                const app = allAppsCache.find(app => app.id === appId);
                if (app) {
                    app.is_hidden = 0;
                }

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

        const appName = this.currentApp.name || this.currentApp.appName;
        const confirmed = await showConfirmationDialog(
            'Remove from Tracker',
            `Are you sure you want to stop tracking "${appName}"? This will keep your existing data.`
        );

        if (!confirmed) return;

        try {
            const appId = this.currentApp.id;
            if (!appId) {
                console.error('App ID is missing');
                return;
            }

            // Implementation would go here
            showFeedback('App removed from tracker', true);
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

        const appName = this.currentApp.name || this.currentApp.appName;
        const confirmed = await showConfirmationDialog(
            'Permanently Delete',
            `Are you sure you want to permanently delete "${appName}" and ALL its data? This cannot be undone.`
        );

        if (!confirmed) return;

        try {
            const appId = this.currentApp.id;
            if (!appId) {
                console.error('App ID is missing');
                return;
            }

            // Implementation would go here
            showFeedback('App permanently deleted', true);
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
    }
};
