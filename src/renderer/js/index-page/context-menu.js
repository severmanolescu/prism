// Context Menu Implementation
class ContextMenu {
    constructor() {
        this.menu = document.getElementById('contextMenu');
        this.currentApp = null;
        this.init();
    }

    init() {
        // Initialize menu HTML
        this.updateContextMenuHTML();
        this.setupSubmenuHandlers();

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

        // Hide on click outside
        document.addEventListener('click', (e) => {
            if (!this.menu.contains(e.target)) {
                this.hide();
            }
        });

        // Hide on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });

        // Handle menu item clicks
        this.menu.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.context-menu-item');
            if (menuItem && !menuItem.classList.contains('disabled')) {
                const action = menuItem.dataset.action;
                this.handleAction(action);
                this.hide();
            }
        });
    }
}

// Extend ContextMenu with core UI methods
Object.assign(ContextMenu.prototype, ContextMenuCore);

// Extend ContextMenu with action handler methods
Object.assign(ContextMenu.prototype, ContextMenuActions);

window.ContextMenu = ContextMenu;
