/**
 * UI Rendering — Red Broadcast Design System
 * Fixed: undefined fields, new IDs, sidebar toggle
 */

/* ─── Helpers ─────────────────────────────── */
function getItemName(item) {
    return item.title || item.eventName || item.trainingName || '(ไม่มีชื่อ)';
}

function getItemId(item) {
    return item.eventId || item.trainingId || null;
}

/* ─── Navigation ───────────────────────────── */
const VIEW_TITLES = {
    dashboard: 'หน้าหลัก',
    events:    'จัดการออกงาน',
    trainings: 'จัดการอบรม',
    teachers:  'บุคลากร',
    history:   'บันทึกและประวัติ',
};

function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('d-none'));
    const target = document.getElementById(`${viewName}-view`);
    if (target) { target.classList.remove('d-none'); target.classList.add('animate-fade-in'); }

    document.querySelectorAll('.nav-link-custom').forEach(l => {
        l.classList.toggle('active', l.getAttribute('data-view') === viewName);
    });

    const titleEl = document.getElementById('top-bar-title');
    if (titleEl) titleEl.textContent = VIEW_TITLES[viewName] || viewName;

    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'events')    renderQueueCards('duty', 'events-cards');
    if (viewName === 'trainings') renderQueueCards('training', 'trainings-cards');
    if (viewName === 'teachers')  renderTeachersTable();
    if (viewName === 'history')   renderHistory();

    // Close sidebar on mobile
    if (window.innerWidth <= 991) closeSidebar();
}

/* ─── Sidebar Toggle ────────────────────────── */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;
    if (window.innerWidth <= 991) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    }
}

function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
}

/* ─── Dashboard ─────────────────────────────── */
function renderDashboard() {
    const totalD   = window.events.length;
    const totalT   = window.trainings.length;
    const pendingD = window.events.filter(e => e.status === 'pending').length;
    const pendingT = window.trainings.filter(e => e.status === 'pending').length;
    const assignedD= window.events.filter(e => e.status === 'assigned').length;
    const assignedT= window.trainings.filter(e => e.status === 'assigned').length;

    setText('stat-total',    totalD + totalT);
    setText('stat-assigned', assignedD + assignedT);
    setText('stat-pending',  pendingD + pendingT);
    setText('stat-teachers', window.teachers.length);

    renderLatestAssignedJob();
    renderUrgentEvents();
    renderNextQueue();
    renderDashboardStats();
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function renderLatestAssignedJob() {
    const container = document.getElementById('latest-assigned-job');
    if (!container) return;

    const allAssigned = [
        ...window.events.filter(e => e.status === 'assigned').map(e => ({ ...e, _type: 'duty' })),
        ...window.trainings.filter(e => e.status === 'assigned').map(e => ({ ...e, _type: 'training' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!allAssigned.length) {
        container.innerHTML = '<div class="text-center py-4 text-muted">ยังไม่มีงานที่จัดคิวแล้ว</div>';
        return;
    }

    const job = allAssigned[0];
    const name = getItemName(job);
    const teachers = (job.assignedTeachers || []).map(id => getTeacherById(id)).filter(Boolean);
    const isDuty = job._type === 'duty';

    container.innerHTML = `
      <div class="latest-job-card">
        <div class="row align-items-center g-4">
          <div class="col-md-7">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="bg-white rounded-circle d-flex align-items-center justify-content-center text-danger shadow-sm" style="width:52px;height:52px;flex-shrink:0;">
                <i class="fas ${isDuty ? 'fa-calendar-check' : 'fa-graduation-cap'} fa-lg"></i>
              </div>
              <div>
                <h5 class="fw-bold mb-1">${name}</h5>
                <div class="text-muted small"><i class="fas fa-map-marker-alt me-1"></i>${job.location || '-'}</div>
              </div>
            </div>
            <div class="d-flex flex-wrap gap-4 text-muted small">
              <div><i class="fas fa-calendar me-1"></i>${formatDateThai(job.date)}</div>
              <div><i class="fas fa-clock me-1"></i>${job.time || 'ไม่ระบุเวลา'}</div>
              <div><i class="fas fa-tag me-1"></i>${isDuty ? 'งานออกเวร' : 'งานอบรม'}</div>
            </div>
          </div>
          <div class="col-md-5">
            <div class="fw-bold mb-2 extra-small text-uppercase text-muted">บุคลากรที่ได้รับมอบหมาย</div>
            <div class="d-flex flex-wrap gap-2">
              ${teachers.map(t => `
                <div class="d-flex align-items-center gap-2 bg-white px-2 py-1 rounded-pill border border-light shadow-sm">
                  <div style="width:28px;height:28px;">${createTeacherAvatar(t)}</div>
                  <span class="small fw-bold">${t.name}</span>
                </div>`).join('') || '<span class="text-muted small">ไม่มีข้อมูล</span>'}
            </div>
          </div>
        </div>
      </div>`;
}

function renderUrgentEvents() {
    const container = document.getElementById('urgent-events-list');
    if (!container) return;

    const urgent = [
        ...window.events.filter(e => e.status === 'pending').map(e => ({ ...e, _type: 'duty' })),
        ...window.trainings.filter(e => e.status === 'pending').map(e => ({ ...e, _type: 'training' }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);

    if (!urgent.length) {
        container.innerHTML = '<div class="text-center py-4 text-muted small">ไม่มีงานที่ต้องจัดคิวเร่งด่วน ✓</div>';
        return;
    }

    container.innerHTML = urgent.map((e, i) => `
      <div class="urgent-row animate-fade-in" style="animation-delay:${i * 0.05}s">
        <div class="bg-white rounded-circle d-flex align-items-center justify-content-center text-warning" style="width:34px;height:34px;flex-shrink:0;">
          <i class="fas fa-clock small"></i>
        </div>
        <div class="flex-grow-1 min-width-0">
          <div class="fw-bold small text-truncate">${getItemName(e)}</div>
          <div class="extra-small text-muted">${formatDateThai(e.date)} · ${e.location || '-'}</div>
        </div>
        <button class="btn-rb btn-rb-red btn-sm admin-only" onclick="openAutoAssignModal(${getItemId(e)}, '${e._type}')">จัดคิว</button>
      </div>`).join('');
}

function renderNextQueue() {
    const container = document.getElementById('next-teachers-queue');
    if (!container) return;

    const sorted = [...window.teachers].sort((a, b) => {
        const sA = getTeacherQueueScore(a, 'duty') + getTeacherQueueScore(a, 'training');
        const sB = getTeacherQueueScore(b, 'duty') + getTeacherQueueScore(b, 'training');
        return sA - sB;
    }).slice(0, 7);

    if (!sorted.length) {
        container.innerHTML = '<div class="text-center py-4 text-muted small">ยังไม่มีข้อมูลบุคลากร</div>';
        return;
    }

    container.innerHTML = sorted.map((t, i) => `
      <div class="queue-teacher-row animate-fade-in" style="animation-delay:${i * 0.04}s">
        <div class="queue-rank">${i + 1}</div>
        <div style="width:40px;height:40px;">${createTeacherAvatar(t)}</div>
        <div class="flex-grow-1 min-width-0">
          <div class="fw-bold small text-truncate">${t.name}</div>
          <div class="extra-small text-muted text-truncate">${t.position || '-'}</div>
        </div>
        <div class="queue-score">${getTeacherQueueScore(t,'duty') + getTeacherQueueScore(t,'training')}</div>
      </div>`).join('');
}

function renderDashboardStats() {
    // Vertical Bar Chart
    const workloads = window.teachers.map(t => ({
        name: t.name,
        total: window.events.filter(e => e.assignedTeachers?.includes(t.teacherId)).length
             + window.trainings.filter(e => e.assignedTeachers?.includes(t.teacherId)).length,
        avatar: createTeacherAvatar(t),
    })).sort((a, b) => b.total - a.total).slice(0, 5);

    const maxVal = Math.max(...workloads.map(w => w.total), 1);
    const chartEl = document.getElementById('top-teachers-chart');
    if (chartEl) {
        if (!workloads.length || workloads.every(w => w.total === 0)) {
            chartEl.innerHTML = '<div class="text-center w-100 text-muted small py-4">ยังไม่มีข้อมูลการออกงาน</div>';
        } else {
            chartEl.innerHTML = workloads.map(w => {
                const h = Math.round((w.total / maxVal) * 100);
                return `<div class="vertical-bar-group">
                  <span class="extra-small fw-bold text-muted">${w.total}</span>
                  <div class="vertical-bar" style="height:${h}%;"></div>
                  <div style="width:36px;height:36px;">${w.avatar}</div>
                </div>`;
            }).join('');
        }
    }

    // Doughnut Chart
    const totalD = window.events.length;
    const totalT = window.trainings.length;
    const total  = totalD + totalT || 1;
    const pctD   = Math.round((totalD / total) * 100);
    const pctT   = 100 - pctD;

    const doughnut = document.getElementById('stat-doughnut');
    if (doughnut) {
        doughnut.style.background = `conic-gradient(var(--primary) 0% ${pctD}%, var(--secondary) ${pctD}% 100%)`;
    }
    setText('stat-doughnut-total', totalD + totalT);
    setText('stat-duty-pct',     `${pctD}%`);
    setText('stat-training-pct', `${pctT}%`);
}

/* ─── Event / Training Cards ─────────────────── */
function renderQueueCards(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const list = type === 'training' ? window.trainings : window.events;

    if (!list.length) {
        container.innerHTML = '<div class="col-12 text-center py-5 text-muted">ยังไม่มีข้อมูล</div>';
        return;
    }

    container.innerHTML = list.map(item => {
        const name = getItemName(item);
        const id   = getItemId(item);
        const statusClass = item.status === 'assigned' ? 'badge-assigned' : item.status === 'completed' ? 'badge-completed' : 'badge-pending';
        const statusText  = item.status === 'assigned' ? 'จัดคิวแล้ว' : item.status === 'completed' ? 'สำเร็จ' : 'รอจัดคิว';
        const icon = type === 'duty' ? 'fa-calendar-alt' : 'fa-graduation-cap';

        const firstTeacher = (item.assignedTeachers || [])[0];
        const teacher = firstTeacher ? getTeacherById(firstTeacher) : null;
        const avatarHtml = teacher
            ? createTeacherAvatar(teacher)
            : `<div class="teacher-avatar teacher-avatar-sm bg-secondary text-white d-flex align-items-center justify-content-center" style="width:36px;height:36px;font-size:12px;border-radius:50%;">?</div>`;

        return `
        <div class="col-sm-6 col-lg-4 col-xl-3 mb-2">
          <div class="event-card animate-fade-in">
            <div class="event-card-thumb">
              <div class="thumb-icon"><i class="fas ${icon}"></i></div>
              ${item.time ? `<div class="thumb-time">${item.time}</div>` : ''}
              <div class="thumb-badge"><span class="badge-status ${statusClass}">${statusText}</span></div>
            </div>
            <div class="event-card-body">
              <div style="width:36px;height:36px;flex-shrink:0;">${avatarHtml}</div>
              <div class="event-card-meta">
                <div class="event-card-title">${name}</div>
                <div class="event-card-detail">
                  <div>${item.location || '-'}</div>
                  <div>${formatDateThai(item.date)}</div>
                </div>
              </div>
            </div>
            <div class="event-card-actions admin-only">
              <button class="btn-rb btn-rb-ghost btn-sm flex-grow-1" onclick="editItem(${id}, '${type}')">แก้ไข</button>
              ${item.status === 'pending'
                ? `<button class="btn-rb btn-rb-red btn-sm flex-grow-1" onclick="openAutoAssignModal(${id}, '${type}')">จัดคิว</button>`
                : `<button class="btn-rb btn-rb-ghost btn-sm flex-grow-1" onclick="openSubstitutionModal(${id}, '${type}')">แทนคน</button>`}
            </div>
          </div>
        </div>`;
    }).join('');
}

/* ─── Teachers Table ─────────────────────────── */
function renderTeachersTable() {
    const tbody = document.getElementById('teachers-table-body');
    if (!tbody) return;
    const sorted = [...window.teachers].sort((a, b) => getTeacherQueueScore(a,'duty') - getTeacherQueueScore(b,'duty'));

    if (!sorted.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">ยังไม่มีข้อมูลบุคลากร</td></tr>';
        return;
    }

    tbody.innerHTML = sorted.map((t, i) => `
      <tr onclick="showTeacherDetail(${t.teacherId})" style="cursor:pointer;">
        <td class="text-muted">${i + 1}</td>
        <td>
          <div class="d-flex align-items-center gap-3">
            <div style="width:44px;height:44px;">${createTeacherAvatar(t)}</div>
            <div>
              <div class="fw-bold">${t.name}</div>
              <div class="extra-small text-muted">${t.position || '-'}</div>
            </div>
          </div>
        </td>
        <td class="text-center fw-bold text-danger">${getTeacherQueueScore(t,'duty')}</td>
        <td class="text-center fw-bold" style="color:var(--secondary)">${getTeacherQueueScore(t,'training')}</td>
        <td class="text-center text-muted">${t.totalDuties || 0} ครั้ง</td>
        <td class="text-end admin-only">
          <button class="btn-rb btn-rb-ghost btn-sm" onclick="editTeacher(${t.teacherId});event.stopPropagation();">
            <i class="fas fa-edit"></i>
          </button>
        </td>
      </tr>`).join('');
}

/* ─── History ────────────────────────────────── */
function renderHistory() {
    const logEl = document.getElementById('activity-log');
    const log = window.activityLog || [];

    if (logEl) {
        if (!log.length) {
            logEl.innerHTML = '<div class="text-muted text-center py-4">ยังไม่มีประวัติกิจกรรม</div>';
        } else {
            logEl.innerHTML = [...log].reverse().slice(0, 30).map(entry => `
              <div class="d-flex gap-2 py-2 border-bottom">
                <div class="text-muted extra-small" style="min-width:120px;">${formatDateThai(entry.timestamp) || '-'}</div>
                <div class="small">${entry.message || JSON.stringify(entry)}</div>
              </div>`).join('');
        }
    }

    const statsEl = document.getElementById('substitution-stats');
    if (statsEl) {
        const subLogs = log.filter(e => e.type === 'substitution');
        if (!subLogs.length) {
            statsEl.innerHTML = '<div class="text-muted text-center py-4">ยังไม่มีข้อมูลการแทนงาน</div>';
        } else {
            const counts = {};
            subLogs.forEach(e => { counts[e.teacherName] = (counts[e.teacherName] || 0) + 1; });
            statsEl.innerHTML = Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([name, c]) => `
              <div class="d-flex justify-content-between py-2 border-bottom">
                <span class="small fw-bold">${name}</span>
                <span class="badge-status badge-assigned">${c} ครั้ง</span>
              </div>`).join('');
        }
    }
}

/* ─── Status Toast ───────────────────────────── */
function showFirebaseStatus(type, message, sticky = false) {
    const toast = document.getElementById('status-toast');
    if (!toast) return;
    const cls = type === 'error' ? 'danger' : type === 'success' ? 'success' : 'warning';
    toast.className = `alert alert-${cls} mb-0`;
    toast.innerHTML = `<i class="fas fa-info-circle me-2"></i>${message}`;
    toast.style.display = 'block';
    if (!sticky) setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

/* ─── Teacher Detail Modal ───────────────────── */
function showTeacherDetail(teacherId) {
    const t = getTeacherById(teacherId);
    if (!t) return;

    const myEvents = window.events.filter(e => e.assignedTeachers?.includes(teacherId));
    const myTrainings = window.trainings.filter(e => e.assignedTeachers?.includes(teacherId));

    const body = `
      <div class="text-center mb-4">
        <div class="mx-auto mb-3" style="width:80px;height:80px;">${createTeacherAvatar(t, true)}</div>
        <h4 class="fw-bold">${t.name}</h4>
        <div class="text-muted">${t.position || '-'}</div>
      </div>
      <div class="row g-3 mb-4">
        <div class="col-4 text-center">
          <div class="stat-card">
            <div class="stat-label">คิวออกงาน</div>
            <div class="stat-value text-danger">${getTeacherQueueScore(t,'duty')}</div>
          </div>
        </div>
        <div class="col-4 text-center">
          <div class="stat-card">
            <div class="stat-label">คิวอบรม</div>
            <div class="stat-value" style="color:var(--secondary)">${getTeacherQueueScore(t,'training')}</div>
          </div>
        </div>
        <div class="col-4 text-center">
          <div class="stat-card">
            <div class="stat-label">รวมงาน</div>
            <div class="stat-value">${t.totalDuties || 0}</div>
          </div>
        </div>
      </div>
      <h6 class="fw-bold mb-2">งานออกเวรที่ได้รับมอบหมาย (${myEvents.length} งาน)</h6>
      ${myEvents.slice(0, 5).map(e => `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom small">
          <div class="fw-bold">${getItemName(e)}</div>
          <div class="text-muted">${formatDateThai(e.date)}</div>
        </div>`).join('') || '<div class="text-muted small py-2">ไม่มีงานออกเวร</div>'}
      <h6 class="fw-bold mt-3 mb-2">งานอบรมที่ได้รับมอบหมาย (${myTrainings.length} งาน)</h6>
      ${myTrainings.slice(0, 5).map(e => `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom small">
          <div class="fw-bold">${getItemName(e)}</div>
          <div class="text-muted">${formatDateThai(e.date)}</div>
        </div>`).join('') || '<div class="text-muted small py-2">ไม่มีงานอบรม</div>'}`;

    document.getElementById('modalTitle').textContent = t.name;
    document.getElementById('modalBody').innerHTML = body;
    new bootstrap.Modal(document.getElementById('universalModal')).show();
}

/* ─── Stub functions (prevent errors) ──────── */
function openEventModal()          { showFirebaseStatus('info', 'ฟังก์ชันเพิ่มงานกำลังพัฒนา'); }
function openTrainingModal()       { showFirebaseStatus('info', 'ฟังก์ชันเพิ่มอบรมกำลังพัฒนา'); }
function openTeacherModal()        { showFirebaseStatus('info', 'ฟังก์ชันเพิ่มครูกำลังพัฒนา'); }
function editItem(id, type)        { showFirebaseStatus('info', `แก้ไข ${type} #${id}`); }
function editTeacher(id)           { showFirebaseStatus('info', `แก้ไขครู #${id}`); }
function openAutoAssignModal(id, type)   { showFirebaseStatus('info', `จัดคิว ${type} #${id} (กำลังพัฒนา)`); }
function openSubstitutionModal(id, type) { showFirebaseStatus('info', `แทนงาน ${type} #${id} (กำลังพัฒนา)`); }
function handleTeacherClick(id)    { showTeacherDetail(id); }
