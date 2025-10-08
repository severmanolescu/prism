// Keyboard shortcuts for iframe pages
// This listens for keyboard events and forwards them to the parent window

document.addEventListener('keydown', (e) => {
    // Check if Ctrl (or Cmd on Mac) is pressed
    if (e.ctrlKey || e.metaKey) {
        if (['1', '2', '3', '4', '5', 'f', 'c', 'h'].includes(e.key)) {
            e.preventDefault();

            // Send message to parent window
            window.parent.postMessage({
                type: 'KEYBOARD_SHORTCUT',
                key: e.key,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey
            }, '*');
        }
    }
});
