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

  // ---------- mini calendar (dashboard) ----------
  static renderMini(container, year, month, tasks, onDateClick) {
    const todayStr = this.toDateStr(new Date());
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);

    let html = `<div class="mini-grid">`;

    // Day headers
    this.DAYS.forEach(d => {
      html += `<div class="day-hdr">${d}</div>`;
    });

    // Leading empty cells
    for (let i = 0; i < firstDay.getDay(); i++) {
      html += `<div class="mini-cell other"></div>`;
    }

    // Day cells
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr  = this.toDateStr(new Date(year, month, day));
      const dayTasks = tasks.filter(t => t.date === dateStr);
      const isToday  = dateStr === todayStr;

      const dots = dayTasks.slice(0, 3).map(() => `<div class="mini-dot"></div>`).join('');

      html += `
        <div class="mini-cell ${isToday ? 'today' : ''}" data-date="${dateStr}">
          ${day}
          ${dots ? `<div class="dot-row">${dots}</div>` : ''}
        </div>`;
    }

    // Trailing empty cells
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

    let html = `<div class="full-grid">`;

    // Column headers
    html += `<div class="cal-hdr-row">`;
    this.DAYS.forEach(d => { html += `<div class="cal-hdr-cell">${d}</div>`; });
    html += `</div>`;

    // Leading prev-month cells
    const prevLast = new Date(year, month, 0).getDate();
    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
      html += `<div class="full-cell other-month"><div class="cell-num">${prevLast - i}</div></div>`;
    }

    // Current month cells
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr  = this.toDateStr(new Date(year, month, day));
      const dayTasks = tasks.filter(t => t.date === dateStr);
      const isToday  = dateStr === todayStr;

      const taskHtml = dayTasks.slice(0, 3).map(t => {
        const dl = NotificationService.getDeadlineInfo(t);
        // 커스텀 색상: 배경 틴트 + 왼쪽 테두리 + 텍스트 색상
        const colorStyle = t.color
          ? `style="background:${t.color}18; border-left:3px solid ${t.color}; color:${t.color}"`
          : '';
        const colorClass = t.color ? '' : t.priority; // 커스텀 색상이 있으면 priority 클래스 색상 제거
        return `
          <div class="cell-task ${colorClass} ${t.completed ? 'done' : ''} ${t.teamId ? 'shared' : ''}"
               data-task-id="${t.id}" title="${t.title}" ${colorStyle}>
            ${t.title}${dl ? ` <span class="cell-dl ${dl.cls}">${dl.label}</span>` : ''}
          </div>`;
      }).join('');

      const more = dayTasks.length > 3
        ? `<div class="more-label">+${dayTasks.length - 3}개 더</div>`
        : '';

      html += `
        <div class="full-cell ${isToday ? 'today' : ''}" data-date="${dateStr}">
          <div class="cell-head-row">
            <div class="cell-num">${day}</div>
            <button class="cell-add-btn" data-add-date="${dateStr}" title="${dateStr} 일정 추가">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div class="cell-tasks">${taskHtml}${more}</div>
        </div>`;
    }

    // Trailing next-month cells
    const used     = firstDay.getDay() + lastDay.getDate();
    const trailing = (7 - (used % 7)) % 7;
    for (let i = 1; i <= trailing; i++) {
      html += `<div class="full-cell other-month"><div class="cell-num">${i}</div></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;

    // "+" 버튼 클릭 → 해당 날짜로 할일 추가 모달 직접 오픈
    container.querySelectorAll('.cell-add-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        TaskController.openAddModal(btn.dataset.addDate);
      });
    });

    // Date click → open day panel ("+", task 칩 클릭은 제외)
    container.querySelectorAll('.full-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', e => {
        if (!e.target.closest('.cell-task') && !e.target.closest('.cell-add-btn')) {
          onDateClick(cell.dataset.date);
        }
      });
    });

    // Task chip click → open edit modal
    container.querySelectorAll('.cell-task').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        TaskController.openEditModal(el.dataset.taskId);
      });
    });
  }
}
