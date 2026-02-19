// Configuration constants for Claude Task Kanban
export const CONFIG = {
  DEFAULT_REFRESH_INTERVAL: 30, // seconds
  DAILY_LOG_REFRESH_INTERVAL: 300, // 5 minutes for daily logs
  MIN_REFRESH_INTERVAL: 5,
  MAX_REFRESH_INTERVAL: 300,
  STALE_THRESHOLD_MULTIPLIER: 3,

  LOCALSTORAGE_KEYS: {
    TASKS_CACHE: 'claude-kanban-tasks-cache',
    LOGS_CACHE: 'claude-kanban-logs-cache',
    SETTINGS: 'claude-kanban-settings',
    THEME: 'claude-kanban-theme',
  },

  CATEGORIES: [
    { id: 'claude-cowork', label: 'Claude Cowork', color: '#a855f7' },
    { id: 'claude-code', label: 'Claude Code', color: '#3b82f6' },
    { id: 'claude-chat', label: 'Claude Chat', color: '#22c55e' },
  ],

  STATUSES: ['in-progress', 'pending', 'completed'],

  STATUS_LABELS: {
    'in-progress': 'In Progress',
    'pending': 'Pending',
    'completed': 'Completed',
  },

  PRIORITY_ORDER: { critical: 0, high: 1, medium: 2, low: 3 },
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(CONFIG.LOCALSTORAGE_KEYS.SETTINGS);
    const saved = raw ? JSON.parse(raw) : {};
    return {
      tasksUrl: saved.tasksUrl || '',
      logsUrl: saved.logsUrl || '',
      refreshInterval: saved.refreshInterval || CONFIG.DEFAULT_REFRESH_INTERVAL,
    };
  } catch {
    return {
      tasksUrl: '',
      logsUrl: '',
      refreshInterval: CONFIG.DEFAULT_REFRESH_INTERVAL,
    };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(CONFIG.LOCALSTORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}
