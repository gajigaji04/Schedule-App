// Entry point — restore theme/color then boot the app.
document.addEventListener('DOMContentLoaded', () => {
  // Restore dark/light mode before first paint
  const mode = localStorage.getItem('ts_theme') || 'light';
  if (mode === 'dark') document.body.classList.add('dark');

  // Restore accent color (overrides CSS vars)
  ThemeService.load();

  AppController.init();
});
