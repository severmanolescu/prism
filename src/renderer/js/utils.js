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

async function getCategoryColor(categoryName) {
  try {
    const categories = await window.electronAPI.getCategories();
    const category = categories.find(c => c.name === categoryName);
    const color = category ? (category.color || '#092442') : '#092442';
    return color;
  } catch (error) {
    console.error('Error getting category color:', error);
    return '#092442';
  }
}

function formatTime(milliseconds) {
  if (!milliseconds || milliseconds === 0) {
    return '0s';
  }

  // Convert milliseconds to seconds
  const totalSeconds = Math.floor(milliseconds / 1000);
  
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  
  const totalMinutes = Math.floor(totalSeconds / 60);
  
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours}h ${minutes}m`;
}

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';

  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function formatTimeRange(start, end) {
  const startTime = new Date(start).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const endTime = end ? new Date(end).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) : 'ongoing';
  return `${startTime} - ${endTime}`;
}

function getRelativeTime(timestamp) {
  if (!timestamp) return 'Unknown';

  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
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

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
