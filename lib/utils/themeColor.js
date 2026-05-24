export const PALETTES = {
  red: {
    label: '빨강', swatch: '#dc2626',
    vars: {
      '--indigo-50':  '#fef2f2', '--indigo-100': '#fee2e2',
      '--indigo-400': '#f87171',
      '--indigo-500': '#ef4444', '--indigo-600': '#dc2626',
      '--indigo-700': '#b91c1c', '--indigo-900': '#7f1d1d',
      '--indigo-950': '#450a0a',
      '--text-sidebar': '#fecaca', '--text-sidebar-sub': '#fca5a5',
    },
  },
  orange: {
    label: '주황', swatch: '#ea580c',
    vars: {
      '--indigo-50':  '#fff7ed', '--indigo-100': '#ffedd5',
      '--indigo-400': '#fb923c',
      '--indigo-500': '#f97316', '--indigo-600': '#ea580c',
      '--indigo-700': '#c2410c', '--indigo-900': '#7c2d12',
      '--indigo-950': '#431407',
      '--text-sidebar': '#fed7aa', '--text-sidebar-sub': '#fdba74',
    },
  },
  yellow: {
    label: '노랑', swatch: '#ca8a04',
    vars: {
      '--indigo-50':  '#fefce8', '--indigo-100': '#fef9c3',
      '--indigo-400': '#facc15',
      '--indigo-500': '#eab308', '--indigo-600': '#ca8a04',
      '--indigo-700': '#a16207', '--indigo-900': '#713f12',
      '--indigo-950': '#422006',
      '--text-sidebar': '#fde68a', '--text-sidebar-sub': '#fcd34d',
    },
  },
  green: {
    label: '초록', swatch: '#16a34a',
    vars: {
      '--indigo-50':  '#f0fdf4', '--indigo-100': '#dcfce7',
      '--indigo-400': '#4ade80',
      '--indigo-500': '#22c55e', '--indigo-600': '#16a34a',
      '--indigo-700': '#15803d', '--indigo-900': '#14532d',
      '--indigo-950': '#052e16',
      '--text-sidebar': '#bbf7d0', '--text-sidebar-sub': '#86efac',
    },
  },
  blue: {
    label: '파랑', swatch: '#2563eb',
    vars: {
      '--indigo-50':  '#eff6ff', '--indigo-100': '#dbeafe',
      '--indigo-400': '#60a5fa',
      '--indigo-500': '#3b82f6', '--indigo-600': '#2563eb',
      '--indigo-700': '#1d4ed8', '--indigo-900': '#1e3a8a',
      '--indigo-950': '#172554',
      '--text-sidebar': '#bfdbfe', '--text-sidebar-sub': '#93c5fd',
    },
  },
  indigo: {
    label: '남색', swatch: '#4f46e5',
    vars: {
      '--indigo-50':  '#eef2ff', '--indigo-100': '#e0e7ff',
      '--indigo-400': '#818cf8',
      '--indigo-500': '#6366f1', '--indigo-600': '#4f46e5',
      '--indigo-700': '#4338ca', '--indigo-900': '#312e81',
      '--indigo-950': '#1e1b4b',
      '--text-sidebar': '#c7d2fe', '--text-sidebar-sub': '#818cf8',
    },
  },
  violet: {
    label: '보라', swatch: '#7c3aed',
    vars: {
      '--indigo-50':  '#f5f3ff', '--indigo-100': '#ede9fe',
      '--indigo-400': '#a78bfa',
      '--indigo-500': '#8b5cf6', '--indigo-600': '#7c3aed',
      '--indigo-700': '#6d28d9', '--indigo-900': '#4c1d95',
      '--indigo-950': '#2e1065',
      '--text-sidebar': '#ddd6fe', '--text-sidebar-sub': '#c4b5fd',
    },
  },
};

export function applyColorPalette(name, customHex) {
  let palette;
  if (name === 'custom' && customHex) {
    palette = buildCustomPalette(customHex);
  } else {
    palette = PALETTES[name];
  }
  if (!palette) return;
  const root = document.documentElement;
  Object.entries(palette.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  localStorage.setItem('ts_color', name);
  if (name === 'custom' && customHex) {
    localStorage.setItem('ts_color_custom', customHex);
  }
}

/* ── Custom palette builder (HSL-based) ── */
function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function buildCustomPalette(hex) {
  if (!hex || hex.length < 7) return null;
  const [h, s] = hexToHsl(hex);
  const cl = (v, mn, mx) => Math.min(mx, Math.max(mn, v));
  const sat = cl(s, 40, 100);
  return {
    label: '커스텀', swatch: hex,
    vars: {
      '--indigo-50':   hslToHex(h, cl(sat, 20, 60), 97),
      '--indigo-100':  hslToHex(h, cl(sat, 25, 70), 93),
      '--indigo-400':  hslToHex(h, cl(sat, 50, 100), 67),
      '--indigo-500':  hslToHex(h, cl(sat, 55, 100), 58),
      '--indigo-600':  hex,
      '--indigo-700':  hslToHex(h, cl(sat, 60, 100), 42),
      '--indigo-900':  hslToHex(h, cl(sat, 65, 100), 22),
      '--indigo-950':  hslToHex(h, cl(sat, 65, 100), 13),
      '--text-sidebar':     hslToHex(h, cl(sat, 35, 75), 86),
      '--text-sidebar-sub': hslToHex(h, cl(sat, 45, 85), 72),
    },
  };
}
