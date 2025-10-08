// Sidebar resize functionality
(function() {
    const sidebar = document.querySelector('.sidebar');
    const resizeHandle = document.querySelector('.sidebar-resize-handle');

    if (!sidebar || !resizeHandle) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    let overlay = null;

    // Load saved width from localStorage
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
        sidebar.style.width = savedWidth + 'px';
    }

    // Create overlay to prevent iframe from capturing mouse events
    function createOverlay() {
        overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.zIndex = '9999';
        overlay.style.cursor = 'ew-resize';
        document.body.appendChild(overlay);
    }

    function removeOverlay() {
        if (overlay) {
            document.body.removeChild(overlay);
            overlay = null;
        }
    }

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;

        resizeHandle.classList.add('resizing');
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';

        createOverlay();

        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const delta = e.clientX - startX;
        const newWidth = startWidth + delta;

        // Respect min/max width from CSS
        const minWidth = 180;
        const maxWidth = 400;

        if (newWidth >= minWidth && newWidth <= maxWidth) {
            sidebar.style.width = newWidth + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizeHandle.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            removeOverlay();

            // Save width to localStorage
            localStorage.setItem('sidebarWidth', sidebar.offsetWidth);
        }
    });
})();
