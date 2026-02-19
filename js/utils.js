// Utility functions for Claude Task Kanban

export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDateTime(isoString);
}

export function formatDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateOnly(isoString) {
  if (!isoString) return '';
  return isoString.slice(0, 10); // YYYY-MM-DD
}

export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function extractDriveFileId(input) {
  if (!input) return null;
  // Already an Apps Script URL - return as-is
  if (input.includes('script.google.com')) return null;
  // Extract ID from various Google Drive URL formats
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{20,})$/,
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function buildFetchUrl(urlOrId) {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // Apps Script URL - use directly
  if (trimmed.includes('script.google.com')) {
    return trimmed;
  }

  // Extract Google Drive file ID
  const fileId = extractDriveFileId(trimmed);
  if (fileId) {
    // Direct download URL for publicly shared files
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  // Assume it's a direct URL
  return trimmed;
}

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function showToast(message, type = 'info', duration = 5000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year, month) {
  // Returns 0=Mon, 1=Tue, ... 6=Sun (ISO week)
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}
