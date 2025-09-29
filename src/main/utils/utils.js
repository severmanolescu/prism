// Helper functions
function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = (seconds / 3600).toFixed(1);
  return `${hours}h`;
}

function formatLastUsed(timestamp) {
  if (!timestamp) return 'Never';
  
  const now = new Date();
  const used = new Date(timestamp);
  const diff = now - used;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

module.exports = {
    formatTime,
    formatLastUsed
}