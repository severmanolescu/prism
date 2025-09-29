// Window control functions
function setupWindowControls() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');
    
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });
    }
    
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            window.electronAPI.maximizeWindow();
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });
    }
    
    // Listen for window state changes to update maximize button
    window.electronAPI.onWindowMaximized(() => {
        updateMaximizeButton(true);
    });
    
    window.electronAPI.onWindowUnmaximized(() => {
        updateMaximizeButton(false);
    });
    
    // Set initial maximize button state
    window.electronAPI.isWindowMaximized().then(isMaximized => {
        updateMaximizeButton(isMaximized);
    });
}

function updateMaximizeButton(isMaximized) {
    const maximizeBtn = document.getElementById('maximize-btn');
    if (maximizeBtn) {
        const svg = maximizeBtn.querySelector('svg');
        if (isMaximized) {
            // Show restore/unmaximize icon
            svg.innerHTML = `
                <path d="M2,2 L8,2 L8,8 L2,8 Z" fill="none" stroke="currentColor" stroke-width="1"/>
                <path d="M2,2 L2,0 L10,0 L10,8 L8,8" fill="none" stroke="currentColor" stroke-width="1"/>
            `;
        } else {
            // Show maximize icon
            svg.innerHTML = `<path d="M0,0 L10,0 L10,10 L0,10 Z" fill="none" stroke="currentColor" stroke-width="1"/>`;
        }
    }
}
