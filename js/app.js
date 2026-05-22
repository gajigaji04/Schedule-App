// Entry point — restore theme/color then boot the app.
document.addEventListener('DOMContentLoaded', () => {
  // Restore dark/light/auto mode before first paint
  const saved = localStorage.getItem('ts_theme') || 'auto';
  applyMode(saved);

  // Watch for system preference changes (only matters when mode is 'auto')
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem('ts_theme') || 'auto') === 'auto') applyMode('auto');
  });

  // Restore accent color (overrides CSS vars)
  ThemeService.load();

  AppController.init();
});

function applyMode(mode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = mode === 'dark' || (mode === 'auto' && prefersDark);
  document.body.classList.toggle('dark', dark);
}
