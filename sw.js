// Service Worker — TeamScheduler
// Strategy: Cache-first for static assets, network-first for API calls.
const CACHE   = 'ts-v1';
const OFFLINE = '/offline.html';

const PRECACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/config.js',
  '/js/models/User.js',
  '/js/models/Task.js',
  '/js/models/Team.js',
  '/js/models/Chat.js',
  '/js/models/Dm.js',
  '/js/services/ThemeService.js',
  '/js/services/NotificationService.js',
  '/js/services/KoreanHolidays.js',
  '/js/views/CalendarView.js',
  '/js/views/TaskView.js',
  '/js/views/HeaderView.js',
  '/js/controllers/AppController.js',
  '/js/controllers/CalendarController.js',
  '/js/controllers/TaskController.js',
  '/js/controllers/TeamController.js',
  '/js/controllers/ChatController.js',
  '/js/controllers/ChecklistController.js',
  '/js/controllers/AIAssistantController.js',
  '/js/controllers/DashboardController.js',
  '/js/controllers/DatePicker.js',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/manifest.json',
];

// ── Install: precache shell ────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches ─────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for same-origin, passthrough for supabase ───────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Pass through Supabase API requests and non-GET requests directly
  if (url.hostname.includes('supabase') || e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request)
        .then(res => {
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(OFFLINE));
    })
  );
});
