import { CONFIG, getSettings, saveSettings } from './config.js';
import { DataService } from './dataService.js';
import { BoardRenderer } from './boardRenderer.js';
import { CalendarRenderer } from './calendarRenderer.js';
import { ThemeManager } from './themeManager.js';
import { showToast, formatRelativeTime } from './utils.js';

class App {
  constructor() {
    this.dataService = new DataService();
    this.boardRenderer = new BoardRenderer();
    this.calendarRenderer = new CalendarRenderer();
    this.themeManager = new ThemeManager();
    this.currentView = 'board';
  }

  async init() {
    this.#bindEvents();
    this.#loadSettings();

    // Show cached data immediately if available
    const cachedTasks = this.dataService.getCachedTasks();
    const cachedLogs = this.dataService.getCachedLogs();
    if (cachedTasks) {
      this.boardRenderer.render(cachedTasks);
      this.calendarRenderer.updateTasks(cachedTasks);
    }
    if (cachedLogs) {
      this.calendarRenderer.updateLogs(cachedLogs);
    }

    // Check if we have a configured URL or should use sample data
    const settings = getSettings();
    if (!settings.tasksUrl) {
      // Auto-load sample data for first-time users
      this.dataService.enableSampleData();
      showToast('Loaded sample data. Configure your Google Drive URL in Settings to use real data.', 'info', 8000);
    }

    // Initial fetch
    this.#showLoading(true);
    await Promise.all([
      this.dataService.fetchTasks(),
      this.dataService.fetchLogs(),
    ]);
    this.#showLoading(false);

    // Start polling
    this.dataService.startPolling(settings.refreshInterval || CONFIG.DEFAULT_REFRESH_INTERVAL);

    // Render calendar initial state
    this.calendarRenderer.render();
  }

  #bindEvents() {
    // Data events
    window.addEventListener('kanban-data-updated', (e) => {
      this.boardRenderer.render(e.detail);
      this.calendarRenderer.updateTasks(e.detail);
      this.#updateLastRefreshed();
      this.#updateConnectionStatus('connected');
    });

    window.addEventListener('kanban-logs-updated', (e) => {
      this.calendarRenderer.updateLogs(e.detail);
    });

    window.addEventListener('kanban-fetch-error', (e) => {
      this.#updateConnectionStatus('error');
      const cached = this.dataService.getCachedTasks();
      if (cached) {
        showToast('Using cached data - fetch failed', 'warning');
      }
    });

    window.addEventListener('kanban-online', () => {
      this.#updateConnectionStatus('connected');
      showToast('Back online', 'success', 3000);
    });

    window.addEventListener('kanban-offline', () => {
      this.#updateConnectionStatus('offline');
      showToast('You are offline - showing cached data', 'warning');
    });

    // View tabs
    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        this.#switchView(view);
      });
    });

    // Header buttons
    document.getElementById('btnRefresh')?.addEventListener('click', () => {
      this.dataService.fetchTasks();
      this.dataService.fetchLogs();
      showToast('Refreshing...', 'info', 2000);
    });

    document.getElementById('btnTheme')?.addEventListener('click', () => {
      this.themeManager.toggle();
    });

    document.getElementById('btnSettings')?.addEventListener('click', () => {
      this.#toggleSettingsPanel();
    });

    // Settings panel
    document.getElementById('btnSaveSettings')?.addEventListener('click', () => {
      this.#applySettings();
    });

    document.getElementById('btnLoadSample')?.addEventListener('click', () => {
      this.dataService.enableSampleData();
      this.dataService.stopPolling();
      this.dataService.fetchTasks();
      this.dataService.fetchLogs();
      this.#toggleSettingsPanel();
      showToast('Loaded sample data', 'success', 3000);
    });

    // Close settings on outside click
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('settingsPanel');
      const btn = document.getElementById('btnSettings');
      if (panel?.classList.contains('open') &&
          !panel.contains(e.target) &&
          !btn?.contains(e.target)) {
        panel.classList.remove('open');
      }
    });
  }

  #switchView(view) {
    this.currentView = view;

    // Update tabs
    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === view);
    });

    // Update views
    document.getElementById('boardView')?.classList.toggle('active', view === 'board');
    document.getElementById('calendarView')?.classList.toggle('active', view === 'calendar');

    // Re-render calendar when switching to it
    if (view === 'calendar') {
      this.calendarRenderer.render();
    }
  }

  #loadSettings() {
    const settings = getSettings();
    const tasksInput = document.getElementById('inputTasksUrl');
    const logsInput = document.getElementById('inputLogsUrl');
    const intervalInput = document.getElementById('inputRefreshInterval');

    if (tasksInput) tasksInput.value = settings.tasksUrl;
    if (logsInput) logsInput.value = settings.logsUrl;
    if (intervalInput) intervalInput.value = settings.refreshInterval;
  }

  #applySettings() {
    const tasksUrl = document.getElementById('inputTasksUrl')?.value.trim() || '';
    const logsUrl = document.getElementById('inputLogsUrl')?.value.trim() || '';
    const refreshInterval = parseInt(document.getElementById('inputRefreshInterval')?.value) || CONFIG.DEFAULT_REFRESH_INTERVAL;

    saveSettings({ tasksUrl, logsUrl, refreshInterval });

    // Restart with new settings
    this.dataService.stopPolling();
    this.dataService = new DataService(); // reset to use new URLs
    this.dataService.fetchTasks();
    this.dataService.fetchLogs();
    this.dataService.startPolling(refreshInterval);

    this.#toggleSettingsPanel();
    showToast('Settings saved', 'success', 3000);
  }

  #toggleSettingsPanel() {
    document.getElementById('settingsPanel')?.classList.toggle('open');
  }

  #showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    if (show) {
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  #updateLastRefreshed() {
    const el = document.getElementById('lastUpdated');
    if (el) {
      const time = this.dataService.getLastFetchTime();
      if (time) {
        el.textContent = `Updated ${formatRelativeTime(new Date(time).toISOString())}`;
      }
    }
  }

  #updateConnectionStatus(status) {
    const el = document.getElementById('connectionStatus');
    if (!el) return;

    el.className = 'connection-status ' + status;
    const textEl = el.querySelector('.status-text');
    if (textEl) {
      const labels = { connected: 'Connected', error: 'Error', offline: 'Offline' };
      textEl.textContent = labels[status] || 'Unknown';
    }
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
