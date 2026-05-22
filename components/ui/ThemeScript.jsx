// Runs before React hydration — sets dark class and applies saved color palette.
export default function ThemeScript() {
  const script = `(function(){
    var s=localStorage.getItem('ts_theme')||'auto';
    var d=s==='dark'||(s==='auto'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
    if(d)document.documentElement.classList.add('dark');
    var PALETTES={indigo:{'--indigo-50':'#eef2ff','--indigo-100':'#e0e7ff','--indigo-500':'#6366f1','--indigo-600':'#4f46e5','--indigo-700':'#4338ca','--indigo-900':'#312e81','--indigo-950':'#1e1b4b','--text-sidebar':'#c7d2fe','--text-sidebar-sub':'#818cf8'},blue:{'--indigo-50':'#eff6ff','--indigo-100':'#dbeafe','--indigo-500':'#3b82f6','--indigo-600':'#2563eb','--indigo-700':'#1d4ed8','--indigo-900':'#1e3a8a','--indigo-950':'#172554','--text-sidebar':'#bfdbfe','--text-sidebar-sub':'#93c5fd'},green:{'--indigo-50':'#f0fdf4','--indigo-100':'#dcfce7','--indigo-500':'#22c55e','--indigo-600':'#16a34a','--indigo-700':'#15803d','--indigo-900':'#14532d','--indigo-950':'#052e16','--text-sidebar':'#bbf7d0','--text-sidebar-sub':'#86efac'},rose:{'--indigo-50':'#fff1f2','--indigo-100':'#ffe4e6','--indigo-500':'#f43f5e','--indigo-600':'#e11d48','--indigo-700':'#be123c','--indigo-900':'#881337','--indigo-950':'#4c0519','--text-sidebar':'#fecdd3','--text-sidebar-sub':'#fda4af'},amber:{'--indigo-50':'#fffbeb','--indigo-100':'#fef3c7','--indigo-500':'#f59e0b','--indigo-600':'#d97706','--indigo-700':'#b45309','--indigo-900':'#78350f','--indigo-950':'#451a03','--text-sidebar':'#fde68a','--text-sidebar-sub':'#fcd34d'},purple:{'--indigo-50':'#faf5ff','--indigo-100':'#f3e8ff','--indigo-500':'#a855f7','--indigo-600':'#9333ea','--indigo-700':'#7e22ce','--indigo-900':'#581c87','--indigo-950':'#3b0764','--text-sidebar':'#e9d5ff','--text-sidebar-sub':'#d8b4fe'}};
    var c=localStorage.getItem('ts_color');
    if(c&&PALETTES[c]){var r=document.documentElement;Object.entries(PALETTES[c]).forEach(function(e){r.style.setProperty(e[0],e[1]);});}
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
