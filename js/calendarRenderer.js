import { CONFIG } from './config.js';
import { escapeHtml, formatDateOnly, formatDateTime, getDaysInMonth, getFirstDayOfMonth } from './utils.js';

const CATEGORY_MAP = {
  'claude-cowork': { label: 'Cowork', color: '#a855f7' },
  'claude-code': { label: 'Code', color: '#3b82f6' },
  'claude-chat': { label: 'Chat', color: '#22c55e' },
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export class CalendarRenderer {
  #currentYear;
  #currentMonth;
  #tasksData = null;
  #logsData = null;

  constructor() {
    const now = new Date();
    this.#currentYear = now.getFullYear();
    this.#currentMonth = now.getMonth();

    document.getElementById('btnPrevMonth')?.addEventListener('click', () => this.prevMonth());
    document.getElementById('btnNextMonth')?.addEventListener('click', () => this.nextMonth());
    document.getElementById('btnCloseModal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('dayDetailModal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      const calendarView = document.getElementById('calendarView');
      if (!calendarView?.classList.contains('active')) return;
      if (e.key === 'ArrowLeft') this.prevMonth();
      if (e.key === 'ArrowRight') this.nextMonth();
      if (e.key === 'Escape') this.closeModal();
    });
  }

  updateTasks(data) {
    this.#tasksData = data;
    this.render();
  }

  updateLogs(data) {
    this.#logsData = data;
    this.render();
  }

  prevMonth() {
    this.#currentMonth--;
    if (this.#currentMonth < 0) {
      this.#currentMonth = 11;
      this.#currentYear--;
    }
    this.render();
  }

  nextMonth() {
    this.#currentMonth++;
    if (this.#currentMonth > 11) {
      this.#currentMonth = 0;
      this.#currentYear++;
    }
    this.render();
  }

  render() {
    // Update month title
    const titleEl = document.getElementById('calendarMonthTitle');
    if (titleEl) {
      titleEl.textContent = `${MONTH_NAMES[this.#currentMonth]} ${this.#currentYear}`;
    }

    const grid = document.getElementById('calendarGrid');
    if (!grid) return;

    // Keep weekday headers, remove day cells
    const weekdays = grid.querySelectorAll('.calendar-weekday');
    grid.innerHTML = '';
    weekdays.forEach(w => grid.appendChild(w));

    const daysInMonth = getDaysInMonth(this.#currentYear, this.#currentMonth);
    const firstDay = getFirstDayOfMonth(this.#currentYear, this.#currentMonth);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Build completed tasks map: { "YYYY-MM-DD": [task, ...] }
    const completedMap = this.#buildCompletedMap();

    // Build logs map: { "YYYY-MM-DD": "note" }
    const logsMap = this.#buildLogsMap();

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day empty';
      grid.appendChild(cell);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${this.#currentYear}-${String(this.#currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = completedMap[dateStr] || [];
      const dayNote = logsMap[dateStr] || '';

      const cell = document.createElement('div');
      cell.className = 'calendar-day';
      if (dateStr === todayStr) cell.classList.add('today');
      if (dayTasks.length > 0) cell.classList.add('has-tasks');

      let html = `<div class="day-number">${day}</div>`;

      // Dots for tasks (max 5 shown, then "+N")
      if (dayTasks.length > 0) {
        html += `<div class="day-dots">`;
        const maxDots = 5;
        const shown = dayTasks.slice(0, maxDots);
        for (const task of shown) {
          html += `<span class="day-dot ${task.category || ''}"></span>`;
        }
        if (dayTasks.length > maxDots) {
          html += `<span class="day-more">+${dayTasks.length - maxDots}</span>`;
        }
        html += `</div>`;
      }

      // Note indicator
      if (dayNote) {
        html += `<div class="day-note-indicator" title="Has note"></div>`;
      }

      cell.innerHTML = html;

      // Click to show detail modal
      if (dayTasks.length > 0 || dayNote) {
        cell.addEventListener('click', () => this.#showDayDetail(dateStr, dayTasks, dayNote));
      }

      grid.appendChild(cell);
    }

    // Fill remaining cells to complete the grid
    const totalCells = firstDay + daysInMonth;
    const remainder = totalCells % 7;
    if (remainder > 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day empty';
        grid.appendChild(cell);
      }
    }
  }

  #buildCompletedMap() {
    const map = {};
    if (!this.#tasksData?.tasks) return map;

    for (const task of this.#tasksData.tasks) {
      if (task.completedAt) {
        const dateStr = formatDateOnly(task.completedAt);
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(task);
      }
    }
    return map;
  }

  #buildLogsMap() {
    const map = {};
    if (!this.#logsData?.logs) return map;

    for (const log of this.#logsData.logs) {
      if (log.date && log.note) {
        map[log.date] = log.note;
      }
    }
    return map;
  }

  #showDayDetail(dateStr, tasks, note) {
    const modal = document.getElementById('dayDetailModal');
    const titleEl = document.getElementById('modalDayTitle');
    const bodyEl = document.getElementById('modalDayBody');

    if (!modal || !titleEl || !bodyEl) return;

    // Format title
    const date = new Date(dateStr + 'T00:00:00');
    titleEl.textContent = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let html = '';

    if (tasks.length === 0 && !note) {
      html = `<div class="modal-empty">No completed tasks on this day</div>`;
    } else {
      // Group by category
      const grouped = {};
      for (const task of tasks) {
        const cat = task.category || 'unknown';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(task);
      }

      for (const [catId, catTasks] of Object.entries(grouped)) {
        const catInfo = CATEGORY_MAP[catId] || { label: catId, color: '#888' };
        html += `<div class="modal-category-group">`;
        html += `<div class="modal-category-label">
          <span class="modal-category-dot" style="background:${catInfo.color}"></span>
          ${escapeHtml(catInfo.label)} (${catTasks.length})
        </div>`;
        for (const task of catTasks) {
          html += `<div class="modal-task-item">
            <div>${escapeHtml(task.title)}</div>
            <div class="task-time">${formatDateTime(task.completedAt)}</div>
          </div>`;
        }
        html += `</div>`;
      }

      // Day note
      if (note) {
        html += `<div class="modal-day-note">
          <div class="modal-day-note-label">Daily Note</div>
          <div>${escapeHtml(note)}</div>
        </div>`;
      }
    }

    bodyEl.innerHTML = html;
    modal.classList.add('open');
  }

  closeModal() {
    document.getElementById('dayDetailModal')?.classList.remove('open');
  }
}
