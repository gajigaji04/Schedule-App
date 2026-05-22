// TimerController — Stopwatch / Countdown / Pomodoro / Alarm (full view)
class TimerController {
  // SVG ring r=96 → circumference ≈ 603.19
  static #CIRC     = 2 * Math.PI * 96;
  static #bound    = false;

  // ── Alarm ──────────────────────────────────
  static #ALARM_KEY  = 'ts_alarms';
  static #alarmTimer = null;   // setInterval handle for alarm checks
  static #firingEl   = null;   // current firing banner element

  // ── Stopwatch ──────────────────────────────
  static #swMs      = 0;      // elapsed ms
  static #swRunning = false;
  static #swTimer   = null;
  static #swStart   = 0;      // performance.now() snapshot
  static #swLaps    = [];

  // ── Countdown ──────────────────────────────
  static #ctTotalMs  = 10 * 60 * 1000;
  static #ctRemainMs = 10 * 60 * 1000;
  static #ctRunning  = false;
  static #ctTimer    = null;
  static #ctStart    = 0;
  static #ctSnapMs   = 0;

  // ── Pomodoro ───────────────────────────────
  static #pmWork      = 25;
  static #pmShort     = 5;
  static #pmLong      = 15;
  static #pmLongEvery = 4;
  static #pmCycle     = 1;
  static #pmMode      = 'work';   // 'work' | 'short' | 'long'
  static #pmRemainMs  = 25 * 60 * 1000;
  static #pmTotalMs   = 25 * 60 * 1000;
  static #pmRunning   = false;
  static #pmTimer     = null;
  static #pmStart     = 0;
  static #pmSnapMs    = 0;

  // ── init ───────────────────────────────────

  static init() {
    if (this.#bound) {
      // Already bound — refresh UI only
      this.#updateSW();
      this.#updateCT();
      this.#updatePM();
      this.#renderAlarms();
      return;
    }
    this.#bindTabs();
    this.#bindStopwatch();
    this.#bindCountdown();
    this.#bindPomodoro();
    this.#bindAlarm();
    this.#updateSW();
    this.#updateCT();
    this.#updatePM();
    this.#renderAlarms();
    this.#startAlarmClock();
    this.#requestNotifPermission();
    this.#bound = true;
  }

  // ── tabs ───────────────────────────────────

  static #bindTabs() {
    document.querySelectorAll('.tv-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tv-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tvtab;
        document.getElementById('tv-stopwatch').classList.toggle('hidden', tab !== 'stopwatch');
        document.getElementById('tv-countdown').classList.toggle('hidden', tab !== 'countdown');
        document.getElementById('tv-pomodoro').classList.toggle('hidden', tab !== 'pomodoro');
        document.getElementById('tv-alarm').classList.toggle('hidden', tab !== 'alarm');
        if (tab === 'alarm') this.#renderAlarms();
      });
    });
  }

  // ── Stopwatch ──────────────────────────────

  static #bindStopwatch() {
    const startBtn = document.getElementById('sw-start');
    const lapBtn   = document.getElementById('sw-lap');
    const resetBtn = document.getElementById('sw-reset');

    startBtn.addEventListener('click', () => {
      if (this.#swRunning) {
        // Pause
        this.#swMs    += performance.now() - this.#swStart;
        this.#swRunning = false;
        clearInterval(this.#swTimer);
        this.#swTimer   = null;
        startBtn.innerHTML = '<i class="fas fa-play"></i><span>재개</span>';
        document.getElementById('sw-label').textContent = '일시정지';
      } else {
        // Start / resume
        this.#swStart   = performance.now();
        this.#swRunning = true;
        startBtn.innerHTML = '<i class="fas fa-pause"></i><span>일시정지</span>';
        document.getElementById('sw-label').textContent = '측정 중';
        this.#swTimer = setInterval(() => this.#updateSW(), 100);
      }
    });

    lapBtn.addEventListener('click', () => {
      if (!this.#swRunning && this.#swMs === 0) return;
      const elapsed = this.#swMs + (this.#swRunning ? performance.now() - this.#swStart : 0);
      this.#swLaps.push(elapsed);
      this.#renderLaps();
    });

    resetBtn.addEventListener('click', () => {
      clearInterval(this.#swTimer);
      this.#swTimer   = null;
      this.#swRunning = false;
      this.#swMs      = 0;
      this.#swLaps    = [];
      startBtn.innerHTML = '<i class="fas fa-play"></i><span>시작</span>';
      document.getElementById('sw-label').textContent = '스톱워치';
      document.getElementById('sw-laps').innerHTML = '';
      this.#updateSW();
    });
  }

  static #updateSW() {
    const elapsed = this.#swMs + (this.#swRunning ? performance.now() - this.#swStart : 0);
    document.getElementById('sw-time').textContent = this.#fmtMs(elapsed);
    // Ring spins every 60 s
    const prog   = (elapsed % 60000) / 60000;
    const ring   = document.getElementById('sw-ring');
    if (ring) ring.style.strokeDashoffset = this.#CIRC * (1 - prog);
  }

  static #renderLaps() {
    const el = document.getElementById('sw-laps');
    const prev = this.#swLaps.length > 1 ? this.#swLaps[this.#swLaps.length - 2] : 0;
    const cur  = this.#swLaps[this.#swLaps.length - 1];
    const diff = cur - prev;
    const row  = document.createElement('div');
    row.className = 'sw-lap-row';
    row.innerHTML = `
      <span class="sw-lap-num">랩 ${this.#swLaps.length}</span>
      <span class="sw-lap-diff">+${this.#fmtMs(diff)}</span>
      <span class="sw-lap-total">${this.#fmtMs(cur)}</span>`;
    el.prepend(row);
  }

  // ── Countdown ──────────────────────────────

  static #bindCountdown() {
    const startBtn = document.getElementById('ct-start');
    const resetBtn = document.getElementById('ct-reset');

    // Spin buttons (▲▼)
    document.querySelectorAll('.ct-spin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.#ctRunning) return;
        const input = document.getElementById(btn.dataset.field);
        const dir   = parseInt(btn.dataset.dir);
        const max   = parseInt(input.max);
        const min   = parseInt(input.min);
        let   val   = parseInt(input.value) + dir;
        if (val > max) val = min;
        if (val < min) val = max;
        input.value = val;
        this.#ctSyncFromInputs();
      });
    });

    ['ct-h', 'ct-m', 'ct-s'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        if (!this.#ctRunning) this.#ctSyncFromInputs();
      });
    });

    startBtn.addEventListener('click', () => {
      if (this.#ctRunning) {
        // Pause
        this.#ctRemainMs -= performance.now() - this.#ctStart;
        this.#ctRunning   = false;
        clearInterval(this.#ctTimer);
        this.#ctTimer     = null;
        startBtn.innerHTML = '<i class="fas fa-play"></i><span>재개</span>';
        document.getElementById('ct-label').textContent = '일시정지';
      } else {
        if (this.#ctRemainMs <= 0) {
          this.#ctSyncFromInputs();
          if (this.#ctRemainMs <= 0) return;
        }
        this.#ctStart   = performance.now();
        this.#ctRunning = true;
        startBtn.innerHTML = '<i class="fas fa-pause"></i><span>일시정지</span>';
        document.getElementById('ct-label').textContent = '남은 시간';
        this.#ctTimer = setInterval(() => {
          const elapsed = performance.now() - this.#ctStart;
          const remain  = this.#ctRemainMs - elapsed;
          if (remain <= 0) {
            this.#ctRemainMs = 0;
            this.#ctRunning  = false;
            clearInterval(this.#ctTimer);
            this.#ctTimer    = null;
            startBtn.innerHTML = '<i class="fas fa-play"></i><span>시작</span>';
            document.getElementById('ct-label').textContent = '완료!';
            this.#beep();
          }
          this.#updateCT();
        }, 100);
      }
    });

    resetBtn.addEventListener('click', () => {
      clearInterval(this.#ctTimer);
      this.#ctTimer   = null;
      this.#ctRunning = false;
      this.#ctSyncFromInputs();
      startBtn.innerHTML = '<i class="fas fa-play"></i><span>시작</span>';
      document.getElementById('ct-label').textContent = '설정 후 시작';
    });
  }

  static #ctSyncFromInputs() {
    const h = parseInt(document.getElementById('ct-h').value) || 0;
    const m = parseInt(document.getElementById('ct-m').value) || 0;
    const s = parseInt(document.getElementById('ct-s').value) || 0;
    this.#ctTotalMs  = (h * 3600 + m * 60 + s) * 1000;
    this.#ctRemainMs = this.#ctTotalMs;
    this.#ctStart    = performance.now();
    this.#updateCT();
  }

  static #updateCT() {
    const remain = this.#ctRunning
      ? Math.max(0, this.#ctRemainMs - (performance.now() - this.#ctStart))
      : Math.max(0, this.#ctRemainMs);
    document.getElementById('ct-time').textContent = this.#fmtSec(Math.ceil(remain / 1000));
    const prog = this.#ctTotalMs > 0 ? remain / this.#ctTotalMs : 1;
    const ring = document.getElementById('ct-ring');
    if (ring) ring.style.strokeDashoffset = this.#CIRC * (1 - prog);
  }

  // ── Pomodoro ───────────────────────────────

  static #bindPomodoro() {
    const startBtn = document.getElementById('pm-start');
    const skipBtn  = document.getElementById('pm-skip');
    const resetBtn = document.getElementById('pm-reset');

    const readCfg = () => {
      this.#pmWork      = parseInt(document.getElementById('pm-work-min').value)   || 25;
      this.#pmShort     = parseInt(document.getElementById('pm-short-min').value)  || 5;
      this.#pmLong      = parseInt(document.getElementById('pm-long-min').value)   || 15;
      this.#pmLongEvery = parseInt(document.getElementById('pm-long-every').value) || 4;
    };

    // Live-update display when config values are changed while paused.
    ['pm-work-min', 'pm-short-min', 'pm-long-min', 'pm-long-every'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        if (this.#pmRunning) return;
        readCfg();
        const minMap = { work: this.#pmWork, short: this.#pmShort, long: this.#pmLong };
        this.#pmTotalMs  = (minMap[this.#pmMode] || this.#pmWork) * 60 * 1000;
        this.#pmRemainMs = this.#pmTotalMs;
        this.#updatePM();
      });
    });

    startBtn.addEventListener('click', () => {
      if (this.#pmRunning) {
        // Pause
        this.#pmRemainMs -= performance.now() - this.#pmStart;
        this.#pmRunning   = false;
        clearInterval(this.#pmTimer);
        this.#pmTimer     = null;
        startBtn.innerHTML = '<i class="fas fa-play"></i><span>재개</span>';
      } else {
        readCfg();
        // Sync total/remain with updated config if timer hasn't been modified.
        const minMap   = { work: this.#pmWork, short: this.#pmShort, long: this.#pmLong };
        const freshMs  = (minMap[this.#pmMode] || this.#pmWork) * 60 * 1000;
        if (this.#pmRemainMs === this.#pmTotalMs) {
          this.#pmTotalMs  = freshMs;
          this.#pmRemainMs = freshMs;
        }
        if (this.#pmRemainMs <= 0) this.#pmNextPhase(false);
        this.#pmStart   = performance.now();
        this.#pmRunning = true;
        startBtn.innerHTML = '<i class="fas fa-pause"></i><span>일시정지</span>';
        this.#pmTimer = setInterval(() => {
          const elapsed = performance.now() - this.#pmStart;
          const remain  = this.#pmRemainMs - elapsed;
          if (remain <= 0) {
            this.#pmRemainMs = 0;
            this.#pmRunning  = false;
            clearInterval(this.#pmTimer);
            this.#pmTimer    = null;
            startBtn.innerHTML = '<i class="fas fa-play"></i><span>시작</span>';
            this.#beep();
            this.#pmNextPhase(true);
          }
          this.#updatePM();
        }, 100);
      }
    });

    skipBtn.addEventListener('click', () => {
      if (this.#pmRunning) {
        clearInterval(this.#pmTimer);
        this.#pmTimer   = null;
        this.#pmRunning = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i><span>시작</span>';
      }
      readCfg();
      this.#pmNextPhase(true);
    });

    resetBtn.addEventListener('click', () => {
      clearInterval(this.#pmTimer);
      this.#pmTimer   = null;
      this.#pmRunning = false;
      readCfg();
      this.#pmMode     = 'work';
      this.#pmCycle    = 1;
      this.#pmTotalMs  = this.#pmWork * 60 * 1000;
      this.#pmRemainMs = this.#pmTotalMs;
      startBtn.innerHTML = '<i class="fas fa-play"></i><span>시작</span>';
      this.#updatePM();
    });
  }

  static #pmNextPhase(advance) {
    if (advance) {
      if (this.#pmMode === 'work') {
        // After work: short or long break?
        const isLong = this.#pmCycle % this.#pmLongEvery === 0;
        this.#pmMode = isLong ? 'long' : 'short';
      } else {
        // After break: next work cycle
        if (this.#pmMode === 'short' || this.#pmMode === 'long') {
          this.#pmCycle++;
          this.#pmMode = 'work';
        }
      }
    }
    const minMap = { work: this.#pmWork, short: this.#pmShort, long: this.#pmLong };
    this.#pmTotalMs  = (minMap[this.#pmMode] || this.#pmWork) * 60 * 1000;
    this.#pmRemainMs = this.#pmTotalMs;
    this.#updatePM();
  }

  static #updatePM() {
    const remain = this.#pmRunning
      ? Math.max(0, this.#pmRemainMs - (performance.now() - this.#pmStart))
      : Math.max(0, this.#pmRemainMs);

    document.getElementById('pm-time').textContent = this.#fmtSec(Math.ceil(remain / 1000));

    const modeLabel = { work: '집중', short: '짧은 휴식', long: '긴 휴식' };
    const modeEl    = document.getElementById('pm-mode-badge');
    const cycleEl   = document.getElementById('pm-cycle');
    if (modeEl)  modeEl.textContent  = modeLabel[this.#pmMode] || '집중';
    if (cycleEl) cycleEl.textContent = `${this.#pmCycle} / ${this.#pmLongEvery} 회차`;

    const prog = this.#pmTotalMs > 0 ? remain / this.#pmTotalMs : 1;
    const ring = document.getElementById('pm-ring');
    if (ring) {
      ring.style.strokeDashoffset = this.#CIRC * (1 - prog);
      ring.style.stroke = this.#pmMode === 'work' ? '#6366f1' : '#22c55e';
    }
  }

  // ── helpers ────────────────────────────────

  // ms → mm:ss.t
  static #fmtMs(ms) {
    const totalS = Math.floor(ms / 1000);
    const m = String(Math.floor(totalS / 60)).padStart(2, '0');
    const s = String(totalS % 60).padStart(2, '0');
    const t = String(Math.floor((ms % 1000) / 100));
    return `${m}:${s}.${t}`;
  }

  // seconds → hh:mm:ss or mm:ss
  static #fmtSec(totalSec) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // ── Alarm ──────────────────────────────────

  static #loadAlarms() {
    try { return JSON.parse(localStorage.getItem(this.#ALARM_KEY)) || []; }
    catch { return []; }
  }
  static #saveAlarms(list) { localStorage.setItem(this.#ALARM_KEY, JSON.stringify(list)); }

  static #bindAlarm() {
    // Spinner buttons for hour / minute.
    document.querySelectorAll('.alarm-spin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.field);
        const dir   = parseInt(btn.dataset.dir);
        const max   = parseInt(input.max);
        const min   = parseInt(input.min);
        let   val   = parseInt(input.value) + dir;
        if (val > max) val = min;
        if (val < min) val = max;
        input.value = val;
      });
    });

    document.getElementById('alarm-add-btn').addEventListener('click', () => {
      const h = String(parseInt(document.getElementById('alarm-h').value) || 0).padStart(2, '0');
      const m = String(parseInt(document.getElementById('alarm-m').value) || 0).padStart(2, '0');
      const timeVal  = `${h}:${m}`;
      const labelVal = document.getElementById('alarm-label-input').value.trim();
      const list = this.#loadAlarms();
      list.push({ id: Date.now().toString(), time: timeVal, label: labelVal, enabled: true });
      list.sort((a, b) => a.time.localeCompare(b.time));
      this.#saveAlarms(list);
      document.getElementById('alarm-label-input').value = '';
      this.#renderAlarms();
    });
  }

  static #renderAlarms() {
    const list = this.#loadAlarms();
    const el   = document.getElementById('alarm-list');
    if (!el) return;

    if (!list.length) {
      el.innerHTML = `<div class="alarm-empty"><i class="fas fa-bell-slash"></i><p>등록된 알람이 없습니다</p></div>`;
      return;
    }

    el.innerHTML = '';
    list.forEach(alarm => {
      const remain = this.#alarmRemain(alarm.time);
      const row    = document.createElement('div');
      row.className = `alarm-item${alarm.enabled ? '' : ' alarm-off'}`;
      row.dataset.id = alarm.id;
      row.innerHTML = `
        <div class="alarm-item-time">${alarm.time}</div>
        <div class="alarm-item-info">
          <span class="alarm-item-label">${alarm.label || '알람'}</span>
          <span class="alarm-item-remain">${alarm.enabled ? remain : '꺼짐'}</span>
        </div>
        <label class="alarm-toggle" title="켜기/끄기">
          <input type="checkbox" ${alarm.enabled ? 'checked' : ''} />
          <span class="alarm-slider"></span>
        </label>
        <button class="alarm-del-btn" title="삭제"><i class="fas fa-trash"></i></button>`;

      row.querySelector('input[type=checkbox]').addEventListener('change', e => {
        const alarms = this.#loadAlarms();
        const item   = alarms.find(a => a.id === alarm.id);
        if (item) { item.enabled = e.target.checked; this.#saveAlarms(alarms); }
        this.#renderAlarms();
      });
      row.querySelector('.alarm-del-btn').addEventListener('click', () => {
        if (!confirm(`"${alarm.label || alarm.time}" 알람을 삭제할까요?`)) return;
        const alarms = this.#loadAlarms().filter(a => a.id !== alarm.id);
        this.#saveAlarms(alarms);
        this.#renderAlarms();
      });
      el.appendChild(row);
    });
  }

  // "HH:MM" → "N시간 M분 후" 문자열
  static #alarmRemain(timeStr) {
    const now   = new Date();
    const [h, m] = timeStr.split(':').map(Number);
    let   target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const diffMin = Math.round((target - now) / 60000);
    const dh = Math.floor(diffMin / 60);
    const dm = diffMin % 60;
    if (dh > 0) return `${dh}시간 ${dm}분 후`;
    return `${dm}분 후`;
  }

  // Check alarms every 10 seconds
  static #startAlarmClock() {
    if (this.#alarmTimer) return;
    this.#alarmTimer = setInterval(() => {
      const now  = new Date();
      const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const alarms = this.#loadAlarms();
      alarms.forEach(alarm => {
        if (!alarm.enabled) return;
        if (alarm.time === hhmm && now.getSeconds() < 10) {
          this.#fireAlarm(alarm);
        }
      });
      // Refresh remain texts if alarm tab is visible
      const alarmSection = document.getElementById('tv-alarm');
      if (alarmSection && !alarmSection.classList.contains('hidden')) {
        this.#renderAlarms();
      }
    }, 10000);
  }

  static #fireAlarm(alarm) {
    // Audio
    this.#beep();

    // Browser Notification
    if (Notification?.permission === 'granted') {
      new Notification(`⏰ ${alarm.label || '알람'}`, {
        body: `${alarm.time} 알람이 울립니다!`,
        icon: '',
        requireInteraction: true,
      });
    }

    // On-screen banner (dismiss 버튼)
    if (this.#firingEl) this.#firingEl.remove();
    const banner = document.createElement('div');
    banner.className = 'alarm-firing';
    banner.innerHTML = `
      <i class="fas fa-bell"></i>
      <span>⏰ ${alarm.time}${alarm.label ? ' — ' + alarm.label : ''}</span>
      <button class="alarm-dismiss-btn">닫기</button>`;
    banner.querySelector('.alarm-dismiss-btn').addEventListener('click', () => banner.remove());
    document.body.appendChild(banner);
    this.#firingEl = banner;
    // Auto-dismiss after 60 s
    setTimeout(() => banner.remove(), 60000);
  }

  static #requestNotifPermission() {
    if (Notification?.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  // ── helpers ────────────────────────────────

  // Three short beeps via Web Audio API
  static #beep() {
    try {
      const Ctx  = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx  = new Ctx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      [0, 0.38, 0.76].forEach(t => {
        osc.frequency.setValueAtTime(880, ctx.currentTime + t);
        gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      });
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.1);
    } catch (_) {}
  }
}
