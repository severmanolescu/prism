// Context Menu Implementation
class ContextMenu {
    constructor() {
        this.menu = document.getElementById('contextMenu');
        this.currentApp = null;
        this.init();
    }

    init() {
        // Prevent default context menu on app items AND nav items
        this.updateContextMenuHTML();
        this.setupSubmenuHandlers();

        document.addEventListener('contextmenu', (e) => {
            const appItem = e.target.closest('.app-item, .recent-item');
            const navItem = e.target.closest('.nav-subitems .nav-item');
            
            if (appItem) {
                e.preventDefault();
                this.show(e, appItem);
            } else if (navItem) {
                e.preventDefault();
                this.show(e, navItem);
            } else {
                this.hide();
            }
        });

        document.addEventListener('click', (e) => {
            if (!this.menu.contains(e.target)) {
                this.hide();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });

        this.menu.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.context-menu-item');
            if (menuItem && !menuItem.classList.contains('disabled')) {
                const action = menuItem.dataset.action;
                this.handleAction(action);
                this.hide();
            }
        });
    }

    setupSubmenuHandlers() {
        const submenuItems = this.menu.querySelectorAll('.submenu-item');
        
        submenuItems.forEach(item => {
            const submenu = item.querySelector('.submenu');
            
            item.addEventListener('mouseenter', () => {
                this.showSubmenu(item, submenu);
            });
            
            item.addEventListener('mouseleave', (e) => {
                setTimeout(() => {
                    if (!submenu.matches(':hover') && !item.matches(':hover')) {
                        this.hideSubmenu(submenu);
                    }
                }, 100);
            });
            
            submenu.addEventListener('mouseleave', () => {
                this.hideSubmenu(submenu);
            });
        });
    }

    handleSubmenuAction = (e) => {
        const option = e.target.closest('.submenu-item-option');
        if (option) {
            const action = option.dataset.action;
            this.handleAction(action);
            this.hide();
        }
    }

    updateContextMenuHTML() {
        const existingMenu = document.getElementById('contextMenu');
        if (!existingMenu) return;
        
        existingMenu.innerHTML = `
            <div class="context-menu-item" data-action="open">
                <span class="context-menu-icon">🚀</span>
                <span>Launch Application</span>
            </div>
            <div class="context-menu-item" data-action="details">
                <span class="context-menu-icon">📊</span>
                <span>View Details</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="favorite">
                <span class="context-menu-icon">⭐</span>
                <span>Add to Favorites</span>
            </div>
            <div class="context-menu-item submenu-item" data-action="add-to">
                <span class="context-menu-icon">➕</span>
                <span>Add to</span>
                <span class="submenu-arrow">▶</span>
                <div class="submenu" id="addToSubmenu"></div>
            </div>
            <div class="context-menu-item submenu-item" data-action="remove-from">
                <span class="context-menu-icon">➖</span>
                <span>Remove from</span>
                <span class="submenu-arrow">▶</span>
                <div class="submenu" id="removeFromSubmenu"></div>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item submenu-item" data-action="more-options">
                <span class="context-menu-icon">⋯</span>
                <span>More</span>
                <span class="submenu-arrow">▶</span>
                <div class="submenu" id="moreOptionsSubmenu">
                    <div class="submenu-item-option hide-restore-item" data-action="hide">
                        <span class="context-menu-icon">👁️</span>
                        <span>Hide from Library</span>
                    </div>
                    <div class="submenu-item-option" data-action="remove">
                        <span class="context-menu-icon">❌</span>
                        <span>Remove from Tracker</span>
                    </div>
                    <div class="submenu-item-option" data-action="remove-permanently">
                        <span class="context-menu-icon">🗑️</span>
                        <span>Remove Permanently</span>
                    </div>
                </div>
            </div>
        `;
    }

    setupSubmenuHandlers() {
        const submenuItems = this.menu.querySelectorAll('.submenu-item');
        
        submenuItems.forEach(item => {
            const submenu = item.querySelector('.submenu');
            
            item.addEventListener('mouseenter', () => {
                this.showSubmenu(item, submenu);
            });
            
            item.addEventListener('mouseleave', (e) => {
                setTimeout(() => {
                    if (!submenu.matches(':hover') && !item.matches(':hover')) {
                        this.hideSubmenu(submenu);
                    }
                }, 100);
            });
            
            submenu.addEventListener('mouseleave', () => {
                this.hideSubmenu(submenu);
            });
            
            // Add click handler for submenu items
            submenu.addEventListener('click', (e) => {
                const submenuOption = e.target.closest('.submenu-item-option');
                if (submenuOption) {
                    e.stopPropagation();
                    const action = submenuOption.dataset.action;
                    const category = submenuOption.dataset.category;
                    
                    if (category) {
                        // Handle collection moves
                        this.moveAppToCategory(category);
                    } else {
                        // Handle other actions
                        this.handleAction(action);
                    }
                    this.hide();
                }
            });
        });
    }
    
    async populateAddToSubmenu(submenu) {
        
        try {
            const categories = await window.electronAPI.getCategories();
            
            const currentAppCategory = this.getCurrentAppCategory();
            
            const filteredCategories = categories.filter(cat => cat.name !== currentAppCategory);
            
            if (filteredCategories.length === 0) {
                submenu.innerHTML = '<div class="submenu-disabled">No other collections available</div>';
                return;
            }
            
            submenu.innerHTML = filteredCategories
                .map(category => `
                    <div class="submenu-item-option" data-category="${category.name}">
                        <span class="category-color" style="background-color: ${category.color || '#4a90e2'}"></span>
                        <span>${category.name}</span>
                    </div>
                `).join('');
            
        } catch (error) {
            console.error('Error in populateAddToSubmenu:', error);
            submenu.innerHTML = '<div class="submenu-disabled">Error loading collections</div>';
        }
    }

    async showSubmenu(parentItem, submenu) {
        const action = parentItem.dataset.action;
        
        if (action === 'add-to') {
            await this.populateAddToSubmenu(submenu);
        } else if (action === 'remove-from') {
            await this.populateRemoveFromSubmenu(submenu);
        } else if (action === 'more-options') {
            await this.populateMoreOptionsSubmenu(submenu);
        }
        
        submenu.classList.add('show');
        
        // Position submenu
        const parentRect = parentItem.getBoundingClientRect();
        const submenuRect = submenu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        
        let left = parentRect.width - 5;
        
        if (parentRect.right + submenuRect.width > windowWidth) {
            left = -submenuRect.width + 5;
        }
        
        submenu.style.left = left + 'px';
        submenu.style.top = '0px';
    }

    hideSubmenu(submenu) {
        submenu.classList.remove('show');
    }

    async populateMoreOptionsSubmenu(submenu) {
        // Update the hide/restore option text
        try {
            const hiddenApps = await window.electronAPI.getHiddenApps();
            const isHidden = hiddenApps.some(app => app.id === this.currentApp.id);
            
            const hideOption = submenu.querySelector('[data-action="hide"]');
            if (hideOption) {
                const hideIcon = hideOption.querySelector('.context-menu-icon');
                const hideText = hideOption.querySelector('span:last-child');
                
                if (isHidden) {
                    hideIcon.textContent = '👁️';
                    hideText.textContent = 'Restore to Library';
                    hideOption.dataset.action = 'restore';
                } else {
                    hideIcon.textContent = '👁️';
                    hideText.textContent = 'Hide from Library';
                    hideOption.dataset.action = 'hide';
                }
            }
        } catch (error) {
            console.error('Error checking hidden status:', error);
        }
        
        // Add click handlers for submenu options
        submenu.querySelectorAll('.submenu-item-option').forEach(option => {
            // Remove existing listeners to prevent duplicates
            option.removeEventListener('click', this.handleSubmenuAction);
            option.addEventListener('click', (e) => this.handleSubmenuAction(e));
        });
    }

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

    getCurrentAppCategory() {
        if (!this.currentApp || !this.currentApp.id) return 'Uncategorized';
        
        // Find the app in the cache to get its current category
        const app = allAppsCache.find(app => app.id === this.currentApp.id);
        return app ? app.category : 'Uncategorized';
    }

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
    }

    async show(event, element) {
        let appName, appId;
        
        // Check if it's a nav item or app item
        if (element.classList.contains('nav-item') && element.closest('.nav-subitems')) {
            // It's a navigation item
            appName = element.querySelector('span:last-child')?.textContent || 'Unknown App';
            appId = element.dataset.appId;
        } else {
            // It's an app/recent item
            appName = element.querySelector('.app-item-name, .recent-item-name')?.textContent || 'Unknown App';
            appId = element.dataset.appId;
        }
        
        this.currentApp = {
            id: appId,
            name: appName,
            element: element
        };

        // Position the menu
        const x = event.clientX;
        const y = event.clientY;
        
        this.menu.style.left = '0px';
        this.menu.style.top = '0px';
        this.menu.classList.add('show');

        // Get menu dimensions and position properly
        const menuRect = this.menu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let finalX = x;
        let finalY = y;

        if (x + menuRect.width > windowWidth) {
            finalX = x - menuRect.width;
        }

        if (y + menuRect.height > windowHeight) {
            finalY = y - menuRect.height;
        }

        finalX = Math.max(5, finalX);
        finalY = Math.max(5, finalY);

        this.menu.style.left = finalX + 'px';
        this.menu.style.top = finalY + 'px';

        // Update menu items based on app context
        await this.updateMenuItems();
    }

    hide() {
        this.menu.classList.remove('show');
        this.currentApp = null;
    }
    
    async launchApp(appId) {
        try {
            const result = await window.electronAPI.launchApp(appId);
            if (result.success) {
            } else {
                console.error('Failed to launch app:', result.error);
            }
        } catch (error) {
            console.error('Error launching app:', error);
        }
    }

    async toggleFavorite(appId) {
        try {
            const isFavorite = favoritesCache.includes(appId);
            
            if (isFavorite) {
                const result = await window.electronAPI.removeFromFavorites(appId);
                if (result.success) {
                    favoritesCache = favoritesCache.filter(id => id !== appId);
                }
            } else {
                const result = await window.electronAPI.addToFavorites(appId);
                if (result.success) {
                    favoritesCache.push(appId);
                }
            }
            
            // Refresh navigation to show/hide favorites section
            await createCategoryNavigation(allAppsCache);
            
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    }
        
    async updateMenuItems() {
        const favoriteItem = this.menu.querySelector('[data-action="favorite"]');
        const hideItem = this.menu.querySelector('[data-action="hide"]');
        
        if (this.currentApp && favoriteItem) {
            const isFavorite = favoritesCache.includes(this.currentApp.id);
            const favoriteIcon = favoriteItem.querySelector('.context-menu-icon');
            const favoriteText = favoriteItem.querySelector('span:last-child');
            
            if (isFavorite) {
                favoriteIcon.textContent = '⭐';
                favoriteText.textContent = 'Remove from Favorites';
            } else {
                favoriteIcon.textContent = '⭐';
                favoriteText.textContent = 'Add to Favorites';
            }
        }

        // Check directly against hidden apps
        if (this.currentApp && hideItem) {
            try {
                const hiddenApps = await window.electronAPI.getHiddenApps();
                
                const isHidden = hiddenApps.some(app => app.id === this.currentApp.id);
                
                const hideIcon = hideItem.querySelector('.context-menu-icon');
                const hideText = hideItem.querySelector('span:last-child');
                
                if (isHidden) {
                    hideIcon.textContent = '👁️';
                    hideText.textContent = 'Restore to Library';
                    hideItem.dataset.action = 'restore';
                } else {
                    hideIcon.textContent = '👁️';
                    hideText.textContent = 'Hide from Library';
                    hideItem.dataset.action = 'hide';
                }
            } catch (error) {
                console.error('Error checking hidden status:', error);
            }
        } else {
            this.updateContextMenuHTML();
            this.setupSubmenuHandlers();
            
            // Try again after regenerating
            await this.updateMenuItems();
        }
    }

    async hideFromLibrary(appId, appName) {
        const app = allAppsCache.find(app => app.id === appId);
        const statsHTML = app ? `
            <div class="app-usage-stats">
                <div class="usage-stat">
                    <span class="usage-label">Total time tracked:</span>
                    <span class="usage-value">${app.totalTimeFormatted || '0h'}</span>
                </div>
                <div class="usage-stat">
                    <span class="usage-label">Last used:</span>
                    <span class="usage-value">${app.lastUsedFormatted || 'Never'}</span>
                </div>
                <div class="usage-stat">
                    <span class="usage-label">Launch count:</span>
                    <span class="usage-value">${app.launchCount || 'N/A'}</span>
                </div>
            </div>
        ` : '';

        const confirmed = await window.confirmationDialog.show({
            title: 'Hide Application',
            message: `Hide "${appName}" from your library? The app will still be tracked but not shown on the main screen. To restore it go to Librari->Hidden`,
            icon: '👁️',
            iconColor: '#f39c12',
            confirmText: 'Hide App',
            cancelText: 'Cancel',
            dangerMode: true,
            showDontAskAgain: true,
            dontAskKey: 'hideApps',
            extraContent: statsHTML
        });

        if (confirmed) {
            try {
                const result = await window.electronAPI.hideAppFromLibrary(appId);
                if (result.success) {
                    // Remove app from local cache
                    allAppsCache = allAppsCache.filter(app => app.id !== appId);
                    
                    // Refresh navigation and current view
                    createCategoryNavigation(allAppsCache);
                    
                    // Refresh current view
                    if (currentCategory === 'All Apps') {
                        displayAllApps(allAppsCache);
                    } else if (currentCategory === 'Favorites') {
                        await loadFavoriteApps();
                    } else {
                        await loadAppsByCategory(currentCategory);
                    }
                    
                    // Refresh collections view if open
                    const categoryOverview = document.getElementById('categoryOverview');
                    if (categoryOverview) {
                        showCategoryOverview();
                    }
                    
                    // Show success message
                    showDragFeedback(`Hidden ${appName} from library`, 'success');
                } else {
                    alert(result.error || 'Failed to hide app');
                }
            } catch (error) {
                console.error('Error hiding app:', error);
                alert('Failed to hide app');
            }
        }
    }

    async restoreToLibrary(appId, appName) {
        try {
            const result = await window.electronAPI.restoreHiddenApp(appId);
            if (result.success) {
                await loadAppsByCategory("Hidden", true);
                showDragFeedback(`Restored ${appName} to library`, 'success');
            } else {
                alert(result.error || 'Failed to restore app');
            }
        } catch (error) {
            console.error('Error restoring app:', error);
            alert('Failed to restore app');
        }
    }
        
    async removeFromTracker(appId, appName) {
        const app = allAppsCache.find(app => app.id === appId);
        const statsHTML = app ? `
            <div class="app-usage-stats">
                <div class="usage-stat">
                    <span class="usage-label">Total time tracked:</span>
                    <span class="usage-value">${app.totalTimeFormatted || '0h'}</span>
                </div>
                <div class="usage-stat">
                    <span class="usage-label">Last used:</span>
                    <span class="usage-value">${app.lastUsedFormatted || 'Never'}</span>
                </div>
                <div class="usage-stat">
                    <span class="usage-label">Launch count:</span>
                    <span class="usage-value">${app.launchCount || 'N/A'}</span>
                </div>
            </div>
        ` : '';

        const confirmed = await window.confirmationDialog.show({
            title: 'Remove Application',
            message: `Remove "${appName}" from tracker? All usage data and sessions will be deleted, but the app can be tracked again if launched.`,
            icon: '❌',
            iconColor: '#f39c12',
            confirmText: 'Remove',
            cancelText: 'Cancel',
            dangerMode: true,
            extraContent: statsHTML
        });

        if (confirmed) {
            try {
                const result = await window.electronAPI.removeAppFromTracker(appId);
                if (result.success) {
                    // Update local caches
                    allAppsCache = allAppsCache.filter(app => app.id !== appId);
                    favoritesCache = favoritesCache.filter(id => id !== appId);
                    
                    // Refresh navigation and current view
                    createCategoryNavigation(allAppsCache);
                    
                    if (currentCategory === 'All Apps') {
                        displayAllApps(allAppsCache);
                    } else if (currentCategory === 'Favorites') {
                        await loadFavoriteApps();
                    } else {
                        await loadAppsByCategory(currentCategory);
                    }
                    
                    showDragFeedback(`Removed ${appName} from tracker`, 'success');
                } else {
                    alert(result.error || 'Failed to remove app');
                }
            } catch (error) {
                console.error('Error removing app:', error);
                alert('Failed to remove app');
            }
        }
    }

    async removePermanently(appId, appName) {
        const app = allAppsCache.find(app => app.id === appId);
        const statsHTML = app ? `
            <div class="app-usage-stats">
                <div class="usage-stat">
                    <span class="usage-label">Total time tracked:</span>
                    <span class="usage-value">${app.totalTimeFormatted || '0h'}</span>
                </div>
                <div class="usage-stat">
                    <span class="usage-label">This data will be lost forever</span>
                    <span class="usage-value" style="color: #e74c3c;">⚠️ Cannot be undone</span>
                </div>
            </div>
        ` : '';

        const confirmed = await window.confirmationDialog.show({
            title: 'Remove Application Permanently',
            message: `Permanently remove "${appName}" from tracker? The app will NEVER be tracked again, even if launched. All data and sessions will be deleted.`,
            icon: '🗑️',
            iconColor: '#e74c3c',
            confirmText: 'Remove Forever',
            cancelText: 'Cancel',
            dangerMode: true,
            extraContent: statsHTML
        });

        if (confirmed) {
            try {
                const result = await window.electronAPI.removeAppPermanently(appId);
                if (result.success) {
                    // Update local caches
                    allAppsCache = allAppsCache.filter(app => app.id !== appId);
                    favoritesCache = favoritesCache.filter(id => id !== appId);
                    
                    // Refresh navigation and current view
                    createCategoryNavigation(allAppsCache);
                    
                    if (currentCategory === 'All Apps') {
                        displayAllApps(allAppsCache);
                    } else if (currentCategory === 'Favorites') {
                        await loadFavoriteApps();
                    } else {
                        await loadAppsByCategory(currentCategory);
                    }
                    
                    showDragFeedback(`Permanently removed ${appName}`, 'success');
                } else {
                    alert(result.error || 'Failed to remove app permanently');
                }
            } catch (error) {
                console.error('Error removing app permanently:', error);
                alert('Failed to remove app permanently');
            }
        }
    }


    async handleAction(action) {
        if (!this.currentApp) return;

        const appName = this.currentApp.name;
        const appId = this.currentApp.id;

        switch (action) {
            case 'open':
                this.launchApp(appId);
                break;
            
            case 'details':
                showAppDetails(appName);
                break;
            
            case 'favorite':
                await this.toggleFavorite(appId);
                break;
            
            case 'hide':
                await this.hideFromLibrary(appId, appName);
                break;
                
            case 'restore':
                await this.restoreToLibrary(appId, appName);
                break;

            case 'remove':
                await this.removeFromTracker(appId, appName);
                break;

            case 'remove-permanently':
                await this.removePermanently(appId, appName);
                break;
            
            case 'properties':
                console.log(`Opening properties for ${appName}`);
                break;
        }
    }
}

window.ContextMenu = ContextMenu;