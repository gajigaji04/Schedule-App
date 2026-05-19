// View — Calendar
// Pure rendering helpers for mini and full calendar grids.
class CalendarView {
  static DAYS   = ['일', '월', '화', '수', '목', '금', '토'];
  static MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

  // ---------- utility ----------
  static toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  static dateLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  // ---------- helpers ----------
  static #priorityColor(priority) {
    return priority === 'high' ? '#ef4444'
         : priority === 'low'  ? '#22c55e'
         :                       '#6366f1';
  }

  // 주(week) 단위로 각 스팬 태스크의 레인(행) 번호를 사전 계산한다.
  // Returns: { [taskId]: { [weekIndex]: laneNumber } }
  static #computeSpanLanes(tasks, year, month, startDow) {
    const spanTasks = tasks.filter(t => t.deadline && t.deadline > t.date);
    const lanes = {};

    for (let w = 0; w < 6; w++) {
      const ws = this.toDateStr(new Date(year, month, 1 - startDow + w * 7));
      const we = this.toDateStr(new Date(year, month, 1 - startDow + w * 7 + 6));

      spanTasks
        .filter(t => t.date <= we && t.deadline >= ws)
        .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
        .forEach((t, lane) => {
          if (!lanes[t.id]) lanes[t.id] = {};
          lanes[t.id][w] = lane;
        });
    }
    return lanes;
  }

  // ---------- mini calendar (dashboard) ----------
  static renderMini(container, year, month, tasks, onDateClick) {
    const todayStr = this.toDateStr(new Date());
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);

    let html = `<div class="mini-grid">`;

    this.DAYS.forEach(d => {
      html += `<div class="day-hdr">${d}</div>`;
    });

    for (let i = 0; i < firstDay.getDay(); i++) {
      html += `<div class="mini-cell other"></div>`;
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr  = this.toDateStr(new Date(year, month, day));
      const dayTasks = tasks.filter(t => t.date === dateStr);
      const isToday  = dateStr === todayStr;
      const dots     = dayTasks.slice(0, 3).map(() => `<div class="mini-dot"></div>`).join('');

      html += `
        <div class="mini-cell ${isToday ? 'today' : ''}" data-date="${dateStr}">
          ${day}
          ${dots ? `<div class="dot-row">${dots}</div>` : ''}
        </div>`;
    }

    const totalCells = firstDay.getDay() + lastDay.getDate();
    const trailing   = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < trailing; i++) {
      html += `<div class="mini-cell other"></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;

    container.querySelectorAll('.mini-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => onDateClick(cell.dataset.date));
    });
  }

  // ---------- full calendar (calendar view) ----------
  static renderFull(container, year, month, tasks, onDateClick) {
    const todayStr = this.toDateStr(new Date());
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay();

    const spanLanes = this.#computeSpanLanes(tasks, year, month, startDow);

    let html = `<div class="full-grid">`;

    // 요일 헤더
    html += `<div class="cal-hdr-row">`;
    this.DAYS.forEach(d => { html += `<div class="cal-hdr-cell">${d}</div>`; });
    html += `</div>`;

    // 이전 달 빈 셀
    const prevLast = new Date(year, month, 0).getDate();
    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
      html += `<div class="full-cell other-month"><div class="cell-num">${prevLast - i}</div></div>`;
    }

    // 이번 달 셀
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = this.toDateStr(new Date(year, month, day));
      const isToday = dateStr === todayStr;
      const wIdx    = Math.floor((startDow + day - 1) / 7);

      // ── 스팬 바 (시작일~마감일이 다른 다일 태스크) ──
      const spanHere = tasks.filter(t =>
        t.deadline && t.deadline > t.date &&
        t.date <= dateStr && t.deadline >= dateStr
      );
      const maxLane = spanHere.reduce(
        (m, t) => Math.max(m, spanLanes[t.id]?.[wIdx] ?? 0), -1
      );

      let spanBarsHtml = '';
      if (maxLane >= 0) {
        spanBarsHtml = '<div class="cell-span-bars">';
        for (let lane = 0; lane <= maxLane; lane++) {
          const t = spanHere.find(t => (spanLanes[t.id]?.[wIdx] ?? -1) === lane);
          if (t) {
            const isStart = t.date === dateStr;
            const isEnd   = t.deadline === dateStr;
            const cls = isStart && isEnd ? 'span-solo'
                      : isStart          ? 'span-start'
                      : isEnd            ? 'span-end'
                      :                    'span-mid';
            const bg  = t.color || this.#priorityColor(t.priority);
            const lbl = isStart ? t.title : '';
            spanBarsHtml += `<div class="span-bar ${cls}" data-task-id="${t.id}" style="background:${bg}" title="${t.title}">${lbl}</div>`;
          } else {
            spanBarsHtml += `<div class="span-empty"></div>`;
          }
        }
        spanBarsHtml += '</div>';
      }

      // ── 단일 태스크 칩 (deadline 없거나 당일 마감) ──
      const singleTasks = tasks.filter(t =>
        t.date === dateStr && !(t.deadline && t.deadline > t.date)
      );
      const taskHtml = singleTasks.slice(0, 3).map(t => {
        const dl = NotificationService.getDeadlineInfo(t);
        const colorStyle = t.color
          ? `style="background:${t.color}18; border-left:3px solid ${t.color}; color:${t.color}"`
          : '';
        const colorClass = t.color ? '' : t.priority;
        return `
          <div class="cell-task ${colorClass} ${t.completed ? 'done' : ''} ${t.team_id ? 'shared' : ''}"
               data-task-id="${t.id}" title="${t.title}" ${colorStyle}>
            ${t.title}${dl ? ` <span class="cell-dl ${dl.cls}">${dl.label}</span>` : ''}
          </div>`;
      }).join('');

      const more = singleTasks.length > 3
        ? `<div class="more-label">+${singleTasks.length - 3}개 더</div>`
        : '';

      html += `
        <div class="full-cell ${isToday ? 'today' : ''}" data-date="${dateStr}">
          <div class="cell-head-row">
            <div class="cell-num">${day}</div>
            <button class="cell-add-btn" data-add-date="${dateStr}" title="${dateStr} 일정 추가">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          ${spanBarsHtml}
          <div class="cell-tasks">${taskHtml}${more}</div>
        </div>`;
    }

    // 다음 달 빈 셀
    const used     = firstDay.getDay() + lastDay.getDate();
    const trailing = (7 - (used % 7)) % 7;
    for (let i = 1; i <= trailing; i++) {
      html += `<div class="full-cell other-month"><div class="cell-num">${i}</div></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;

    // "+" 버튼
    container.querySelectorAll('.cell-add-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        TaskController.openAddModal(btn.dataset.addDate);
      });
    });

    // 날짜 셀 클릭 → 데이 패널
    container.querySelectorAll('.full-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', e => {
        if (!e.target.closest('.cell-task') &&
            !e.target.closest('.cell-add-btn') &&
            !e.target.closest('.span-bar')) {
          onDateClick(cell.dataset.date);
        }
      });
    });

    // 태스크 칩·스팬 바 클릭 → 수정 모달
    container.querySelectorAll('.cell-task, .span-bar').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        TaskController.openEditModal(el.dataset.taskId);
      });
    });
  }

  // ---------- year view ----------
  static renderYear(container, year, tasks, onMonthClick) {
    // Build set of all dates touched by tasks (including span ranges).
    const taskDates = new Set();
    tasks.forEach(t => {
      taskDates.add(t.date);
      if (t.deadline && t.deadline > t.date) {
        const s = new Date(t.date     + 'T00:00:00');
        const e = new Date(t.deadline + 'T00:00:00');
        for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          taskDates.add(this.toDateStr(new Date(d)));
        }
      }
    });

    const todayStr = this.toDateStr(new Date());
    const nowYear  = new Date().getFullYear();
    const nowMonth = new Date().getMonth();

    let html = '<div class="year-grid">';
    for (let m = 0; m < 12; m++) {
      html += this.#renderYearMonth(year, m, taskDates, todayStr,
        year === nowYear && m === nowMonth);
    }
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.year-month-card').forEach(card => {
      card.addEventListener('click', () => onMonthClick(+card.dataset.month));
    });
  }

  static #renderYearMonth(year, month, taskDates, todayStr, isCurrent) {
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);

    let html = `<div class="year-month-card" data-month="${month}">
      <div class="year-month-hdr${isCurrent ? ' current' : ''}">${this.MONTHS[month]}</div>
      <div class="year-mini-grid">`;

    this.DAYS.forEach(d => { html += `<div class="ymg-hdr">${d}</div>`; });

    for (let i = 0; i < firstDay.getDay(); i++) {
      html += `<div class="ymg-cell other"></div>`;
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const ds       = this.toDateStr(new Date(year, month, day));
      const hasTasks = taskDates.has(ds);
      const isToday  = ds === todayStr;
      html += `<div class="ymg-cell${isToday ? ' today' : ''}${hasTasks && !isToday ? ' has-tasks' : ''}">
        ${day}${hasTasks ? '<span class="ymg-dot"></span>' : ''}
      </div>`;
    }

    html += '</div></div>';
    return html;
  }

  // ---------- week view ----------
  static renderWeek(container, weekDays, tasks, onDateClick) {
    const todayStr = this.toDateStr(new Date());

    // Map each day → tasks active on that day.
    const dayTasks = {};
    weekDays.forEach(d => {
      dayTasks[d] = tasks.filter(t =>
        t.deadline && t.deadline > t.date
          ? t.date <= d && t.deadline >= d
          : t.date === d
      );
    });

    let html = '<div class="week-grid">';
    weekDays.forEach(dateStr => {
      const d       = new Date(dateStr + 'T00:00:00');
      const isToday = dateStr === todayStr;
      const dt      = dayTasks[dateStr];

      const tasksHtml = dt.map(t => {
        const dl     = NotificationService.getDeadlineInfo(t);
        const isSpan = t.deadline && t.deadline > t.date;
        const cStyle = t.color
          ? `style="background:${t.color}18;border-left:3px solid ${t.color};color:${t.color}"`
          : '';
        const cClass = t.color ? '' : t.priority;
        return `
          <div class="week-task ${cClass} ${t.completed ? 'done' : ''} ${isSpan ? 'span-chip' : ''}"
               data-task-id="${t.id}" title="${t.title}" ${cStyle}>
            <span class="week-task-title">${t.title}</span>
            ${dl ? `<span class="cell-dl ${dl.cls}">${dl.label}</span>` : ''}
          </div>`;
      }).join('');

      html += `
        <div class="week-col${isToday ? ' today' : ''}" data-date="${dateStr}">
          <div class="week-col-hdr${isToday ? ' today' : ''}">
            <span class="week-dow">${this.DAYS[d.getDay()]}</span>
            <span class="week-date-num${isToday ? ' today-circle' : ''}">${d.getDate()}</span>
          </div>
          <div class="week-col-body">
            ${tasksHtml}
            <button class="week-add-btn" data-add-date="${dateStr}"
                    title="${dateStr} 일정 추가"><i class="fas fa-plus"></i></button>
          </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.week-task').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        TaskController.openEditModal(el.dataset.taskId);
      });
    });
    container.querySelectorAll('.week-add-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        TaskController.openAddModal(btn.dataset.addDate);
      });
    });
    container.querySelectorAll('.week-col-body').forEach(body => {
      body.addEventListener('click', e => {
        if (!e.target.closest('.week-task') && !e.target.closest('.week-add-btn')) {
          onDateClick(body.closest('.week-col').dataset.date);
        }
      });
    });
  }
}
