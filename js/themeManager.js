import { CONFIG } from './config.js';

export class ThemeManager {
  constructor() {
    const saved = localStorage.getItem(CONFIG.LOCALSTORAGE_KEYS.THEME);
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    this.setTheme(saved || preferred);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(CONFIG.LOCALSTORAGE_KEYS.THEME)) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    this.setTheme(current === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(CONFIG.LOCALSTORAGE_KEYS.THEME, theme);
  }
}
