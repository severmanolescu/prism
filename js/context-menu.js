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

    updateContextMenuHTML() {
        // Update your existing context menu HTML to include submenus
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
            <div class="context-menu-item" data-action="properties">
                <span class="context-menu-icon">⚙️</span>
                <span>Properties</span>
            </div>
            <div class="context-menu-item" data-action="hide">
                <span class="context-menu-icon">👁️</span>
                <span>Hide from Library</span>
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
                // Hide submenu if mouse is not moving to submenu
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


    async showSubmenu(parentItem, submenu) {
        const action = parentItem.dataset.action;
        
        if (action === 'add-to') {
            await this.populateAddToSubmenu(submenu);
        } else if (action === 'remove-from') {
            await this.populateRemoveFromSubmenu(submenu);
        }
        
        submenu.classList.add('show');
        
        // Position submenu
        const parentRect = parentItem.getBoundingClientRect();
        const submenuRect = submenu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        
        // Position to the right of parent item
        let left = parentRect.width - 5;
        
        // If submenu would go off screen, position to the left
        if (parentRect.right + submenuRect.width > windowWidth) {
            left = -submenuRect.width + 5;
        }
        
        submenu.style.left = left + 'px';
        submenu.style.top = '0px';
    }

    hideSubmenu(submenu) {
        submenu.classList.remove('show');
    }

    async populateAddToSubmenu(submenu) {
        const categories = await window.electronAPI.getCategories();
        const currentAppCategory = this.getCurrentAppCategory();
        
        submenu.innerHTML = categories
            .filter(cat => cat.name !== currentAppCategory) // Don't show current category
            .map(category => `
                <div class="submenu-item-option" data-category="${category.name}">
                    <span class="category-color" style="background-color: ${category.color || '#4a90e2'}"></span>
                    <span>${category.name}</span>
                </div>
            `).join('');
        
        // Add click handlers
        submenu.querySelectorAll('.submenu-item-option').forEach(option => {
            option.addEventListener('click', () => {
                this.moveAppToCategory(option.dataset.category);
                this.hide();
            });
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
            // Use the correct property name - it should be this.currentApp.id, but let's add debugging
            console.log('Current app object:', this.currentApp);
            
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

    show(event, element) {
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
        this.updateMenuItems();
    }

    hide() {
        this.menu.classList.remove('show');
        this.currentApp = null;
    }
    
    async launchApp(appId) {
        try {
            const result = await window.electronAPI.launchApp(appId);
            if (result.success) {
                console.log('App launched successfully');
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

    updateMenuItems() {
        const favoriteItem = this.menu.querySelector('[data-action="favorite"]');
        
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
    }

    async handleAction(action) {
        if (!this.currentApp) return;

        const appName = this.currentApp.name;
        const appId = this.currentApp.id;

        switch (action) {
            case 'open':
                console.log(`Launching ${appName}`);
                this.launchApp(appId);
                break;
            
            case 'details':
                console.log(`Showing details for ${appName}`);
                showAppDetails(appName);
                break;
            
            case 'favorite':
                console.log(`Toggling favorite for ${appName}`);
                await this.toggleFavorite(appId);
                break;
            
            case 'category':
                console.log(`Changing category for ${appName}`);
                // Implement category change
                break;
            
            case 'properties':
                console.log(`Opening properties for ${appName}`);
                // Show app properties
                break;
            
            case 'hide':
                console.log(`Hiding ${appName} from library`);
                // Implement hide functionality
                break;
        }
    }
}

window.ContextMenu = ContextMenu;