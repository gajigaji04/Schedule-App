// Service — Theme
// Manages accent-color presets + custom color + light/dark mode.
// Applies colors by overriding CSS custom properties on :root so all
// existing CSS rules (which reference --indigo-* vars) automatically
// pick up the chosen color without any CSS changes.
class ThemeService {

  static PRESETS = {
    red:    { name: '빨강', emoji: '🔴', primary: '#ef4444', dark: '#b91c1c', light: '#fef2f2', sidebar: '#1c0505', sText: '#fca5a5', sSub: '#f87171' },
    orange: { name: '주황', emoji: '🟠', primary: '#f97316', dark: '#c2410c', light: '#fff7ed', sidebar: '#1c0a05', sText: '#fdba74', sSub: '#fb923c' },
    yellow: { name: '노랑', emoji: '🟡', primary: '#f59e0b', dark: '#b45309', light: '#fffbeb', sidebar: '#1c1205', sText: '#fde68a', sSub: '#fbbf24' },
    green:  { name: '초록', emoji: '🟢', primary: '#22c55e', dark: '#15803d', light: '#f0fdf4', sidebar: '#052e16', sText: '#86efac', sSub: '#4ade80' },
    blue:   { name: '파랑', emoji: '🔵', primary: '#3b82f6', dark: '#1d4ed8', light: '#eff6ff', sidebar: '#172554', sText: '#93c5fd', sSub: '#60a5fa' },
    indigo: { name: '남색', emoji: '🟣', primary: '#6366f1', dark: '#4338ca', light: '#eef2ff', sidebar: '#1e1b4b', sText: '#c7d2fe', sSub: '#818cf8' },
    purple: { name: '보라', emoji: '🟣', primary: '#a855f7', dark: '#7e22ce', light: '#faf5ff', sidebar: '#2e1065', sText: '#d8b4fe', sSub: '#c084fc' },
  };

  // Apply a preset key or a custom hex color.
  static apply(colorKey, customHex = null) {
    let c;
    if (colorKey === 'custom' && customHex) {
      c = this.#fromHex(customHex);
    } else {
      c = this.PRESETS[colorKey] || this.PRESETS.indigo;
    }

    const r = document.documentElement;
    r.style.setProperty('--indigo-50',   c.light);
    r.style.setProperty('--indigo-100',  c.light);
    r.style.setProperty('--indigo-500',  c.primary);
    r.style.setProperty('--indigo-600',  c.primary);
    r.style.setProperty('--indigo-700',  c.dark);
    r.style.setProperty('--indigo-900',  c.sidebar);
    r.style.setProperty('--indigo-950',  c.sidebar);
    r.style.setProperty('--text-sidebar',     c.sText);
    r.style.setProperty('--text-sidebar-sub', c.sSub);

    localStorage.setItem('ts_color', colorKey);
    if (customHex) localStorage.setItem('ts_custom_color', customHex);
    else           localStorage.removeItem('ts_custom_color');
  }

  // Call on app start to restore saved theme.
  static load() {
    const key    = localStorage.getItem('ts_color') || 'indigo';
    const custom = localStorage.getItem('ts_custom_color') || null;
    this.apply(key, custom);
    return { key, custom };
  }

  static getModeName() {
    return document.body.classList.contains('dark') ? 'dark' : 'light';
  }

  // ---------- private — generate palette from a single hex ----------

  static #fromHex(hex) {
    return {
      primary: hex,
      dark:    this.#mix(hex, '#000000', 0.25),
      light:   this.#mix(hex, '#ffffff', 0.90),
      sidebar: this.#mix(hex, '#000000', 0.75),
      sText:   this.#mix(hex, '#ffffff', 0.65),
      sSub:    this.#mix(hex, '#ffffff', 0.35),
    };
  }

  // Mix color A toward color B by `ratio` (0 = A, 1 = B).
  static #mix(hexA, hexB, ratio) {
    const [ar, ag, ab] = this.#parse(hexA);
    const [br, bg, bb] = this.#parse(hexB);
    const r = Math.round(ar + (br - ar) * ratio);
    const g = Math.round(ag + (bg - ag) * ratio);
    const b = Math.round(ab + (bb - ab) * ratio);
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  }

  static #parse(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
}
