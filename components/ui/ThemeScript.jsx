// Runs before React hydration — sets dark class and applies saved color palette.
export default function ThemeScript() {
  const script = `(function(){
    /* ── dark mode ── */
    var s=localStorage.getItem('ts_theme')||'auto';
    var d=s==='dark'||(s==='auto'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
    if(d)document.documentElement.classList.add('dark');

    /* ── color palette (must match lib/utils/themeColor.js) ── */
    var P={
      red:{
        '--indigo-50':'#fef2f2','--indigo-100':'#fee2e2',
        '--indigo-400':'#f87171',
        '--indigo-500':'#ef4444','--indigo-600':'#dc2626',
        '--indigo-700':'#b91c1c','--indigo-900':'#7f1d1d','--indigo-950':'#450a0a',
        '--text-sidebar':'#fecaca','--text-sidebar-sub':'#fca5a5'
      },
      orange:{
        '--indigo-50':'#fff7ed','--indigo-100':'#ffedd5',
        '--indigo-400':'#fb923c',
        '--indigo-500':'#f97316','--indigo-600':'#ea580c',
        '--indigo-700':'#c2410c','--indigo-900':'#7c2d12','--indigo-950':'#431407',
        '--text-sidebar':'#fed7aa','--text-sidebar-sub':'#fdba74'
      },
      yellow:{
        '--indigo-50':'#fefce8','--indigo-100':'#fef9c3',
        '--indigo-400':'#facc15',
        '--indigo-500':'#eab308','--indigo-600':'#ca8a04',
        '--indigo-700':'#a16207','--indigo-900':'#713f12','--indigo-950':'#422006',
        '--text-sidebar':'#fde68a','--text-sidebar-sub':'#fcd34d'
      },
      green:{
        '--indigo-50':'#f0fdf4','--indigo-100':'#dcfce7',
        '--indigo-400':'#4ade80',
        '--indigo-500':'#22c55e','--indigo-600':'#16a34a',
        '--indigo-700':'#15803d','--indigo-900':'#14532d','--indigo-950':'#052e16',
        '--text-sidebar':'#bbf7d0','--text-sidebar-sub':'#86efac'
      },
      blue:{
        '--indigo-50':'#eff6ff','--indigo-100':'#dbeafe',
        '--indigo-400':'#60a5fa',
        '--indigo-500':'#3b82f6','--indigo-600':'#2563eb',
        '--indigo-700':'#1d4ed8','--indigo-900':'#1e3a8a','--indigo-950':'#172554',
        '--text-sidebar':'#bfdbfe','--text-sidebar-sub':'#93c5fd'
      },
      indigo:{
        '--indigo-50':'#eef2ff','--indigo-100':'#e0e7ff',
        '--indigo-400':'#818cf8',
        '--indigo-500':'#6366f1','--indigo-600':'#4f46e5',
        '--indigo-700':'#4338ca','--indigo-900':'#312e81','--indigo-950':'#1e1b4b',
        '--text-sidebar':'#c7d2fe','--text-sidebar-sub':'#818cf8'
      },
      violet:{
        '--indigo-50':'#f5f3ff','--indigo-100':'#ede9fe',
        '--indigo-400':'#a78bfa',
        '--indigo-500':'#8b5cf6','--indigo-600':'#7c3aed',
        '--indigo-700':'#6d28d9','--indigo-900':'#4c1d95','--indigo-950':'#2e1065',
        '--text-sidebar':'#ddd6fe','--text-sidebar-sub':'#c4b5fd'
      }
    };

    var c=localStorage.getItem('ts_color');
    if(c&&P[c]){
      var r=document.documentElement;
      Object.keys(P[c]).forEach(function(k){r.style.setProperty(k,P[c][k]);});
    } else if(c==='custom'){
      /* custom palette is rebuilt at runtime by themeColor.js on first render */
    }
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
