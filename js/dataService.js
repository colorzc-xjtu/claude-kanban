import { CONFIG, getSettings } from './config.js';
import { buildFetchUrl } from './utils.js';

export class DataService {
  #tasksIntervalId = null;
  #logsIntervalId = null;
  #lastTasksData = null;
  #lastLogsData = null;
  #lastFetchTime = null;
  #useSampleData = false;

  constructor() {
    this.#lastTasksData = this.#loadCache(CONFIG.LOCALSTORAGE_KEYS.TASKS_CACHE);
    this.#lastLogsData = this.#loadCache(CONFIG.LOCALSTORAGE_KEYS.LOGS_CACHE);
  }

  getCachedTasks() { return this.#lastTasksData; }
  getCachedLogs() { return this.#lastLogsData; }
  getLastFetchTime() { return this.#lastFetchTime; }

  enableSampleData() {
    this.#useSampleData = true;
  }

  async fetchTasks() {
    if (this.#useSampleData) {
      return this.#fetchSampleTasks();
    }

    const settings = getSettings();
    const url = buildFetchUrl(settings.tasksUrl);
    if (!url) {
      window.dispatchEvent(new CustomEvent('kanban-fetch-error', {
        detail: new Error('No tasks URL configured'),
      }));
      return this.#lastTasksData;
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      let data = await response.json();
      // Normalize: API may return bare array or { tasks: [...] }
      if (Array.isArray(data)) {
        data = { tasks: data };
      }
      this.#validateTasks(data);
      this.#lastTasksData = data;
      this.#lastFetchTime = Date.now();
      this.#saveCache(CONFIG.LOCALSTORAGE_KEYS.TASKS_CACHE, data);
      window.dispatchEvent(new CustomEvent('kanban-data-updated', { detail: data }));
      return data;
    } catch (error) {
      window.dispatchEvent(new CustomEvent('kanban-fetch-error', { detail: error }));
      return this.#lastTasksData;
    }
  }

  async fetchLogs() {
    if (this.#useSampleData) {
      return this.#fetchSampleLogs();
    }

    const settings = getSettings();
    const url = buildFetchUrl(settings.logsUrl);
    if (!url) return this.#lastLogsData;

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.#lastLogsData = data;
      this.#saveCache(CONFIG.LOCALSTORAGE_KEYS.LOGS_CACHE, data);
      window.dispatchEvent(new CustomEvent('kanban-logs-updated', { detail: data }));
      return data;
    } catch (error) {
      return this.#lastLogsData;
    }
  }

  async #fetchSampleTasks() {
    try {
      const response = await fetch('data/sample-tasks.json');
      const data = await response.json();
      this.#lastTasksData = data;
      this.#lastFetchTime = Date.now();
      window.dispatchEvent(new CustomEvent('kanban-data-updated', { detail: data }));
      return data;
    } catch (error) {
      window.dispatchEvent(new CustomEvent('kanban-fetch-error', { detail: error }));
      return null;
    }
  }

  async #fetchSampleLogs() {
    try {
      const response = await fetch('data/sample-daily-logs.json');
      const data = await response.json();
      this.#lastLogsData = data;
      window.dispatchEvent(new CustomEvent('kanban-logs-updated', { detail: data }));
      return data;
    } catch (error) {
      return null;
    }
  }

  startPolling(intervalSeconds) {
    this.stopPolling();

    const taskInterval = Math.max(
      CONFIG.MIN_REFRESH_INTERVAL,
      Math.min(intervalSeconds || CONFIG.DEFAULT_REFRESH_INTERVAL, CONFIG.MAX_REFRESH_INTERVAL),
    ) * 1000;

    const logInterval = CONFIG.DAILY_LOG_REFRESH_INTERVAL * 1000;

    this.#tasksIntervalId = setInterval(() => this.fetchTasks(), taskInterval);
    this.#logsIntervalId = setInterval(() => this.fetchLogs(), logInterval);

    // Page Visibility API
    document.addEventListener('visibilitychange', this.#handleVisibility);
    window.addEventListener('online', this.#handleOnline);
    window.addEventListener('offline', this.#handleOffline);
  }

  stopPolling() {
    if (this.#tasksIntervalId) {
      clearInterval(this.#tasksIntervalId);
      this.#tasksIntervalId = null;
    }
    if (this.#logsIntervalId) {
      clearInterval(this.#logsIntervalId);
      this.#logsIntervalId = null;
    }
    document.removeEventListener('visibilitychange', this.#handleVisibility);
    window.removeEventListener('online', this.#handleOnline);
    window.removeEventListener('offline', this.#handleOffline);
  }

  #handleVisibility = () => {
    if (document.hidden) {
      this.stopPolling();
    } else {
      this.fetchTasks();
      this.fetchLogs();
      const settings = getSettings();
      this.startPolling(settings.refreshInterval);
    }
  };

  #handleOnline = () => {
    window.dispatchEvent(new CustomEvent('kanban-online'));
    this.fetchTasks();
    this.fetchLogs();
  };

  #handleOffline = () => {
    window.dispatchEvent(new CustomEvent('kanban-offline'));
  };

  #validateTasks(data) {
    if (!data || !Array.isArray(data.tasks)) {
      throw new Error('Invalid data: tasks array missing');
    }
  }

  #loadCache(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  #saveCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Storage full or unavailable
    }
  }
}
