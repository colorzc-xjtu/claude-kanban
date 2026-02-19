import { CONFIG } from './config.js';
import { escapeHtml, formatRelativeTime, hashString } from './utils.js';

const CATEGORY_MAP = {
  'claude-cowork': { prefix: 'cowork', label: 'Cowork' },
  'claude-code': { prefix: 'code', label: 'Code' },
  'claude-chat': { prefix: 'chat', label: 'Chat' },
};

export class BoardRenderer {
  render(data) {
    if (!data || !data.tasks) return;
    const tasks = data.tasks;

    // Next Actions column
    const nextActionTasks = tasks
      .filter(t => t.needsUserAction)
      .sort((a, b) => {
        const pDiff = (CONFIG.PRIORITY_ORDER[a.priority] ?? 9) - (CONFIG.PRIORITY_ORDER[b.priority] ?? 9);
        if (pDiff !== 0) return pDiff;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
    this.#renderColumn('columnNextActions', nextActionTasks, true);
    this.#updateCount('nextActionsCount', nextActionTasks.length);

    // Category columns
    for (const cat of CONFIG.CATEGORIES) {
      const info = CATEGORY_MAP[cat.id];
      if (!info) continue;
      const catTasks = tasks.filter(t => t.category === cat.id);

      for (const status of CONFIG.STATUSES) {
        const statusTasks = catTasks.filter(t => t.status === status);
        const containerId = `${info.prefix}-${status}`;
        this.#renderColumn(containerId, statusTasks, false);
      }

      this.#updateCount(`${info.prefix}Count`, catTasks.length);
    }
  }

  #renderColumn(containerId, tasks, showCategoryBadge) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = this.#emptyStateHTML();
      return;
    }

    // Build a map of existing cards for diff
    const existingCards = {};
    container.querySelectorAll('.task-card').forEach(el => {
      existingCards[el.dataset.id] = el;
    });

    const newIds = new Set(tasks.map(t => t.id));

    // Remove cards no longer present
    for (const [id, el] of Object.entries(existingCards)) {
      if (!newIds.has(id)) {
        el.remove();
      }
    }

    // Update or add cards
    const fragment = document.createDocumentFragment();
    for (const task of tasks) {
      const hash = hashString(JSON.stringify(task));
      const existing = existingCards[task.id];

      if (existing && existing.dataset.hash === hash) {
        fragment.appendChild(existing);
      } else {
        const card = this.#createCardElement(task, showCategoryBadge);
        card.dataset.hash = hash;
        fragment.appendChild(card);
      }
    }

    container.innerHTML = '';
    container.appendChild(fragment);
  }

  #createCardElement(task, showCategoryBadge) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.id = task.id;
    card.dataset.priority = task.priority || 'medium';

    const progress = Math.max(0, Math.min(100, task.progress || 0));
    const progressClass = progress >= 75 ? 'high' : progress >= 40 ? 'mid' : 'low';

    const catInfo = CONFIG.CATEGORIES.find(c => c.id === task.category);
    const catLabel = CATEGORY_MAP[task.category]?.label || '';

    let html = '';

    // Category badge (for Next Actions column)
    if (showCategoryBadge && task.category) {
      html += `<div class="card-category-badge ${escapeHtml(task.category)}">
        <span class="category-dot" style="background:${catInfo?.color || '#888'};width:6px;height:6px;border-radius:50%;display:inline-block"></span>
        ${escapeHtml(catLabel)}
      </div>`;
    }

    // Header with title and priority badge
    html += `<div class="card-header">
      <span class="card-title">${escapeHtml(task.title)}</span>
      <span class="card-priority-badge ${task.priority || 'medium'}">${escapeHtml(task.priority || 'medium')}</span>
    </div>`;

    // Progress bar
    html += `<div class="card-progress">
      <div class="progress-bar">
        <div class="progress-bar-fill ${progressClass}" style="width:${progress}%"></div>
      </div>
      <div class="progress-text">${progress}% complete</div>
    </div>`;

    // Tags
    if (task.tags && task.tags.length > 0) {
      html += `<div class="card-tags">`;
      for (const tag of task.tags) {
        html += `<span class="card-tag">${escapeHtml(tag)}</span>`;
      }
      html += `</div>`;
    }

    // Meta row
    html += `<div class="card-meta">`;
    if (task.assignee) {
      html += `<span class="card-assignee">
        <span class="assignee-dot" style="background:${catInfo?.color || '#888'}"></span>
        ${escapeHtml(task.assignee)}
      </span>`;
    }
    html += `<span>${formatRelativeTime(task.updatedAt || task.createdAt)}</span>`;
    html += `</div>`;

    // User action note (for Next Actions)
    if (showCategoryBadge && task.userActionNote) {
      html += `<div class="card-action-note">${escapeHtml(task.userActionNote)}</div>`;
    }

    // Expandable details
    html += `<div class="card-details">`;
    if (task.description) {
      html += `<div class="card-description">${escapeHtml(task.description)}</div>`;
    }
    if (task.notes) {
      html += `<div class="card-notes">${escapeHtml(task.notes)}</div>`;
    }
    html += `</div>`;

    card.innerHTML = html;

    // Click to expand/collapse
    card.addEventListener('click', () => {
      card.classList.toggle('expanded');
    });

    return card;
  }

  #updateCount(elementId, count) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = count;
  }

  #emptyStateHTML() {
    return `<div class="empty-state">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
      <span>No tasks</span>
    </div>`;
  }
}
