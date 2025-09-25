// Context Menu Implementation
class ContextMenu {
    constructor() {
        this.menu = document.getElementById('contextMenu');
        this.currentApp = null;
        this.init();
    }

    init() {
        // Prevent default context menu on app items AND nav items
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