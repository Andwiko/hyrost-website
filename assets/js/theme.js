(function (global) {
  const KEY = 'hyrost_theme';

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.innerHTML = theme === 'light'
        ? '<i class="fas fa-moon"></i>'
        : '<i class="fas fa-sun"></i>';
    }
  }

  function init() {
    const saved = localStorage.getItem(KEY) || 'dark';
    apply(saved);

    document.getElementById('themeToggle')?.addEventListener('click', () => {
      const next = (localStorage.getItem(KEY) || 'dark') === 'dark' ? 'light' : 'dark';
      apply(next);
    });
  }

  global.HyrostTheme = { init, apply };
  document.addEventListener('DOMContentLoaded', init);
})(window);
