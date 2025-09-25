// Get app icon based on name and category
function getAppIcon(name, category) {
    const nameLower = name.toLowerCase();
    
    // Specific app icons
    if (nameLower.includes('chrome')) return '🌐';
    if (nameLower.includes('firefox')) return '🦊';
    if (nameLower.includes('edge')) return '🌊';
    if (nameLower.includes('code') || nameLower.includes('vscode')) return '💻';
    if (nameLower.includes('steam')) return '🎮';
    if (nameLower.includes('discord')) return '💬';
    if (nameLower.includes('spotify')) return '🎵';
    if (nameLower.includes('photoshop')) return '🎨';
    if (nameLower.includes('excel')) return '📊';
    if (nameLower.includes('word')) return '📝';
    if (nameLower.includes('powerpoint')) return '📋';
    if (nameLower.includes('outlook')) return '📧';
    if (nameLower.includes('teams')) return '👥';
    if (nameLower.includes('slack')) return '💼';
    if (nameLower.includes('notion')) return '📓';
    if (nameLower.includes('figma')) return '🎯';
    if (nameLower.includes('unity')) return '🎮';
    if (nameLower.includes('blender')) return '📺';
    if (nameLower.includes('terminal')) return '🛠️';
    if (nameLower.includes('calculator')) return '🧮';
    if (nameLower.includes('notepad')) return '📋';
    if (nameLower.includes('whatsapp')) return '📱';
    if (nameLower.includes('telegram')) return '✈️';
    
    // Category-based icons
    switch (category) {
        case 'Development': return '💻';
        case 'Browsers': return '🌐';
        case 'Games': return '🎮';
        case 'Creative': return '🎨';
        case 'Communication': return '💬';
        default: return '⚙️';
    }
}

function getCategoryIcon(categoryName) {
    switch (categoryName) {
        case 'Development': return '💻';
        case 'Browsers': return '🌐';
        case 'Games': return '🎮';
        case 'Creative': return '🎨';
        case 'Communication': return '💬';
        case 'Productivity': return '📊';
        case 'Media': return '🎵';
        case 'Utilities': return '🛠️';
        case 'Uncategorized': return '📁';
        default: return '⚙️';
    }
}

function getCategoryColor(category) {
    switch (category) {
        default:
            return 'linear-gradient(135deg, #092442 0%, #07417a 80%)';
    }
}

function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = (seconds / 3600).toFixed(1);
    return `${hours}h`;
}

function displayCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.title = `Steam Time Tracker - ${timeString}`;
}

// Helper function to adjust color brightness
function adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16),
          amt = Math.round(2.55 * percent),
          R = (num >> 16) + amt,
          G = (num >> 8 & 0x00FF) + amt,
          B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}