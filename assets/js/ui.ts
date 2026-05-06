/**
 * UI Rendering — Red Broadcast Design System
 * Fixed: undefined fields, new IDs, sidebar toggle
 */

export {}; // Mark as module to allow global augmentation

declare global {
    interface Window {
        events: any[];
        trainings: any[];
        teachers: any[];
        activityLog: any[];
        systemConfig: any;
        showView: (view: string) => void;
        renderDashboard: () => void;
        updateHeader: () => void;
        showTeacherDetail: (id: number) => void;
        openAutoAssignModal: (id: number, type: string) => void;
        openSubstitutionModal: (id: number, type: string) => void;
        editItem: (id: number, type: string) => void;
        deleteItem: (id: number, type: string) => void;
        editTeacher: (id: number) => void;
        showFirebaseStatus: (type: string, message: string, sticky?: boolean) => void;
    }
}

/* ─── Helpers ─────────────────────────────── */
function getItemName(item: any): string {
    return item.title || item.eventName || item.trainingName || '(ไม่มีชื่อ)';
}

function getItemId(item: any): number | null {
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

function showView(viewName: string) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('d-none'));
    const target = document.getElementById(`${viewName}-view`);
    if (target) { target.classList.remove('d-none'); target.classList.add('animate-fade-in'); }

    document.querySelectorAll('.nav-link-custom').forEach(l => {
        l.classList.toggle('active', l.getAttribute('data-view') === viewName);
    });

    // Update bottom nav active state
    document.querySelectorAll('#bottom-nav .nav-item').forEach(el => el.classList.remove('active'));
    const bottomNavLink = document.querySelector(`#bottom-nav .nav-item[onclick*="${viewName}"]`);
    if (bottomNavLink) bottomNavLink.classList.add('active');

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
    renderTeacherQueueStrips(); // New
    renderDashboardStats();
}

function setText(id: string, val: any) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function renderLatestAssignedJob() {
    const container = document.getElementById('latest-assigned-job');
    if (!container) return;

    const latestDuty = window.events
        .filter(e => e.status === 'assigned')
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    
    const latestTraining = window.trainings
        .filter(e => e.status === 'assigned')
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    if (!latestDuty && !latestTraining) {
        container.innerHTML = '<div class="text-center py-4 text-muted">ยังไม่มีงานที่จัดคิวแล้ว</div>';
        return;
    }

    const renderSubCard = (job, label, icon, isDuty) => {
        if (!job) return '';
        
        const teachers = (job.assignedTeachers || []).map(id => getTeacherById(id)).filter(Boolean);
        const accentColor = isDuty ? 'var(--primary)' : 'var(--secondary)';

        return `
        <div class="col-12 mb-3">
            <div class="p-3 rounded bg-white shadow-sm" style="border: 1px solid var(--border-light); border-left: 6px solid ${accentColor} !important;">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <div class="d-flex align-items-center gap-3">
                        <div class="rounded-circle d-flex align-items-center justify-content-center" 
                             style="width:48px;height:48px;background:#F0F0F0;color:${accentColor};flex-shrink:0;">
                            <i class="fas ${icon} fa-lg"></i>
                        </div>
                        <div>
                            <div class="extra-small fw-bold text-muted text-uppercase">${label}ล่าสุด</div>
                            <div class="fw-bold h6 mb-0">${getItemName(job)}</div>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="extra-small text-muted"><i class="fas fa-calendar-day me-1"></i>${formatDateThai(job.date)}</div>
                        <div class="extra-small text-muted"><i class="fas fa-map-marker-alt me-1"></i>${job.location || '-'}</div>
                    </div>
                </div>
                <div class="d-flex flex-wrap gap-2 pt-2 border-top">
                    ${teachers.map(t => `
                        <div class="d-flex align-items-center gap-2 p-1 pe-2 rounded-pill bg-light" style="border:1px solid #EEE;">
                            <div style="width:32px;height:32px;">${createTeacherAvatar(t)}</div>
                            <span class="extra-small fw-bold">${t.name}</span>
                        </div>
                    `).join('') || '<span class="extra-small text-muted">ยังไม่ได้ระบุคน</span>'}
                </div>
            </div>
        </div>`;
    };

    let html = '<div class="row">';
    html += renderSubCard(latestDuty, 'ออกเวร', 'fa-calendar-check', true);
    html += renderSubCard(latestTraining, 'อบรม', 'fa-graduation-cap', false);
    html += '</div>';

    container.innerHTML = html;
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

    const sorted = sortTeachers(window.teachers, 'combined').slice(0, 7);

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

function renderTeacherQueueStrips() {
    const dutyStrip = document.getElementById('duty-queue-strip');
    const trainingStrip = document.getElementById('training-queue-strip');
    if (!dutyStrip || !trainingStrip) return;

    const teachers = window.teachers || [];
    
    // Duty Queue
    const dutySorted = sortTeachers(teachers, 'duty');
    dutyStrip.innerHTML = dutySorted.map((t, i) => `
        <div class="teacher-queue-card-compact ${i < 3 ? 'top-rank' : ''}" onclick="showTeacherDetail(${t.teacherId})" title="${t.name} (คิว: ${getTeacherQueueScore(t, 'duty')})">
            <div class="rank-badge">${i + 1}</div>
            <div class="avatar-container">${createTeacherAvatar(t)}</div>
        </div>
    `).join('');

    // Training Queue
    const trainingSorted = sortTeachers(teachers, 'training');
    trainingStrip.innerHTML = trainingSorted.map((t, i) => `
        <div class="teacher-queue-card-compact ${i < 3 ? 'top-rank' : ''}" onclick="showTeacherDetail(${t.teacherId})" style="border-color: var(--secondary);" title="${t.name} (คิว: ${getTeacherQueueScore(t, 'training')})">
            <div class="rank-badge" style="background: var(--secondary);">${i + 1}</div>
            <div class="avatar-container">${createTeacherAvatar(t)}</div>
        </div>
    `).join('');
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
        const statusText  = item.status === 'assigned' ? 'จัดคิวแล้ว' : item.status === 'completed' ? 'สำเร็จ' : 'กำลังจัดคิว';
        
        const assignedIds = item.assignedTeachers || [];
        const teachers = assignedIds.map(tid => getTeacherById(tid)).filter(Boolean);
        const isSpecial = !!item.isSpecial;

        return `
        <div class="col-12 col-lg-6 col-xl-4">
          <div class="event-card-detailed animate-fade-in ${isSpecial ? 'special-event' : ''}">
            <div class="card-top">
              <div class="card-status-row">
                <span class="badge-status ${statusClass}" style="font-size:10px;">ประเภทงาน: ${type === 'training' ? 'อบรม' : 'ออกเวร'}</span>
                ${isSpecial ? '<span class="badge-status bg-warning text-dark"><i class="fas fa-star me-1"></i>งานสำคัญพิเศษ</span>' : ''}
                <span class="badge-status ${statusClass}">${statusText}</span>
              </div>
              <div class="card-title-main">${name}</div>
              <div class="info-item"><i class="fas fa-calendar-alt"></i> ${formatDateThai(item.date)}</div>
              <div class="info-item"><i class="fas fa-clock"></i> ${item.time || 'ไม่ระบุเวลา'}</div>
              <div class="info-item"><i class="fas fa-map-marker-alt"></i> ${item.location || 'ไม่ระบุสถานที่'}</div>
            </div>
            <div class="assigned-section">
              <div class="d-flex justify-content-between align-items-center">
                <div class="section-label">ครูที่ได้รับมอบหมาย</div>
                <div class="extra-small fw-bold text-muted">${teachers.length} / ${item.requiredQuota || 1} คน</div>
              </div>
              <div class="teacher-list-small">
                ${teachers.map(t => `
                  <div class="teacher-item-mini" onclick="showTeacherDetail(${t.teacherId})">
                    <div style="width:24px;height:24px;">${createTeacherAvatar(t)}</div>
                    <div class="teacher-name-mini">${t.name}</div>
                  </div>
                `).join('') || '<div class="text-muted extra-small py-2">ยังไม่มีการจัดคิว</div>'}
              </div>
            </div>
            <div class="card-bottom-actions admin-only">
              <div class="d-flex gap-1 w-100 mb-1">
                <button class="btn-edit flex-grow-1" onclick="editItem(${id}, '${type}')">
                  <i class="fas fa-edit"></i> แก้ไข
                </button>
                <button class="btn-assign flex-grow-1" onclick="openAutoAssignModal(${id}, '${type}')">
                  <i class="fas fa-user-plus"></i> จัดคิว
                </button>
              </div>
              <div class="d-flex gap-1 w-100">
                <button class="btn-rb btn-rb-ghost btn-sm flex-grow-1 py-1" style="font-size:11px;" onclick="openSubstitutionModal(${id}, '${type}')" ${teachers.length === 0 ? 'disabled' : ''}>
                  <i class="fas fa-exchange-alt"></i> เปลี่ยนตัว
                </button>
                <button class="btn-delete flex-grow-1" onclick="deleteItem(${id}, '${type}')">
                  <i class="fas fa-trash-alt"></i> ลบ
                </button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
}

function deleteItem(id: number, type: string) {
    if (!confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) return;
    
    if (type === 'training') {
        window.trainings = window.trainings.filter(t => t.trainingId !== id);
    } else {
        window.events = window.events.filter(e => e.eventId !== id);
    }
    
    persistAllData();
    renderQueueCards(type, type === 'training' ? 'trainings-cards' : 'events-cards');
    renderDashboard();
    showFirebaseStatus('success', 'ลบข้อมูลเรียบร้อยแล้ว');
}

/* ─── Teachers Table ─────────────────────────── */
function renderTeachersTable() {
    const tbody = document.getElementById('teachers-table-body');
    if (!tbody) return;
    const sorted = sortTeachers(window.teachers, 'duty');

    if (!sorted.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">ยังไม่มีข้อมูลบุคลากร</td></tr>';
        return;
    }

    tbody.innerHTML = sorted.map((t, i) => `
      <tr onclick="showTeacherDetail(${t.teacherId})" style="cursor:pointer;">
        <td class="text-muted d-none d-md-table-cell">${i + 1}</td>
        <td data-label="ชื่อ-นามสกุล">
          <div class="d-flex align-items-center gap-3">
            <div style="width:44px;height:44px;">${createTeacherAvatar(t)}</div>
            <div>
              <div class="fw-bold">${t.name}</div>
              <div class="extra-small text-muted">${t.position || '-'}</div>
            </div>
          </div>
        </td>
        <td data-label="คิวออกงาน" class="text-center fw-bold text-danger">${getTeacherQueueScore(t,'duty')}</td>
        <td data-label="คิวอบรม" class="text-center fw-bold" style="color:var(--secondary)">${getTeacherQueueScore(t,'training')}</td>
        <td data-label="รวมงาน" class="text-center text-muted">${t.totalDuties || 0} ครั้ง</td>
        <td data-label="จัดการ" class="text-end admin-only">
          <button class="btn-rb btn-rb-ghost btn-sm" onclick="editTeacher(${t.teacherId});event.stopPropagation();">
            <i class="fas fa-edit"></i> แก้ไข
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
function showTeacherDetail(teacherId: number) {
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
        </div>`).join('') || '<div class="text-muted small py-2">ไม่มีงานอบรม</div>'}
        
      <h6 class="fw-bold mt-3 mb-2">ประวัติคะแนนล่าสุด</h6>
      <div class="activity-history-small">
        ${(window.activityLog || []).filter(log => log.teacherId === teacherId).reverse().slice(0, 5).map(log => `
          <div class="d-flex justify-content-between py-1 border-bottom extra-small">
            <span>${log.message}</span>
            <span class="text-muted">${formatDateThai(log.timestamp)}</span>
          </div>
        `).join('') || '<div class="text-muted extra-small py-2">ไม่มีประวัติกิจกรรม</div>'}
      </div>`;

    document.getElementById('modalTitle').textContent = t.name;
    document.getElementById('modalBody').innerHTML = body;
    new bootstrap.Modal(document.getElementById('universalModal')).show();
}

/* ─── Modal Helper ───────────────────────────── */
function showModal(title, bodyHtml, footerHtml) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    const foot = document.getElementById('modalFooter');
    if (foot) foot.innerHTML = footerHtml || '';
    new bootstrap.Modal(document.getElementById('universalModal')).show();
}
function hideModal() {
    const m = bootstrap.Modal.getInstance(document.getElementById('universalModal'));
    if (m) m.hide();
}

/* ── Add/Edit Event ── */
function openEventModal(id) {
    const ev = id ? window.events.find(e => e.eventId == id) : null;
    showModal(ev ? 'แก้ไขงานออกเวร' : 'เพิ่มงานออกเวรใหม่', `
      <div class="row g-3">
        <div class="col-12"><label class="form-label fw-bold">ชื่อโครงการ / กิจกรรม</label>
          <input id="f-en" class="form-control" value="${ev ? getItemName(ev) : ''}"></div>
        <div class="col-md-6"><label class="form-label fw-bold">วันที่</label>
          <input id="f-ed" type="date" class="form-control" value="${ev?.date || ''}"></div>
        <div class="col-md-6"><label class="form-label fw-bold">เวลา</label>
          <input id="f-et" class="form-control" placeholder="09:00-12:00" value="${ev?.time || ''}"></div>
        <div class="col-12"><label class="form-label fw-bold">สถานที่</label>
          <input id="f-el" class="form-control" value="${ev?.location || ''}"></div>
        <div class="col-md-6"><label class="form-label fw-bold">จำนวนครูที่ต้องการ</label>
          <input id="f-eq" type="number" min="1" class="form-control" value="${ev?.requiredQuota || 1}"></div>
        <div class="col-md-6 d-flex align-items-end">
          <div class="form-check mb-2">
            <input class="form-check-input" type="checkbox" id="f-es" ${ev?.isSpecial ? 'checked' : ''}>
            <label class="form-check-label fw-bold text-danger" for="f-es">งานสำคัญพิเศษ (+20 คะแนน)</label>
          </div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
       <button class="btn btn-danger" onclick="saveEvent(${id || 'null'})">บันทึก</button>`);
}
function saveEvent(id) {
    const eventName = document.getElementById('f-en')?.value.trim();
    if (!eventName) { alert('กรุณาใส่ชื่อกิจกรรม'); return; }
    const existing = id ? window.events.find(e => e.eventId == id) : null;
    const isSpecial = document.getElementById('f-es')?.checked || false;
    const data = { eventId: id || Date.now(), eventName, date: document.getElementById('f-ed')?.value,
        time: document.getElementById('f-et')?.value, location: document.getElementById('f-el')?.value,
        requiredQuota: parseInt(document.getElementById('f-eq')?.value) || 1,
        isSpecial: isSpecial,
        status: existing?.status || 'pending', assignedTeachers: existing?.assignedTeachers || [] };
    if (id) { const i = window.events.findIndex(e => e.eventId == id); if (i >= 0) window.events[i] = data; }
    else window.events.push(data);
    persistAllData(); hideModal(); renderQueueCards('duty', 'events-cards');
    showFirebaseStatus('success', 'บันทึกงานสำเร็จ');
}
function editItem(id, type) { type === 'training' ? openTrainingModal(id) : openEventModal(id); }

/* ── Add/Edit Training ── */
function openTrainingModal(id) {
    const tr = id ? window.trainings.find(t => t.trainingId == id) : null;
    showModal(tr ? 'แก้ไขงานอบรม' : 'เพิ่มงานอบรมใหม่', `
      <div class="row g-3">
        <div class="col-12"><label class="form-label fw-bold">ชื่อโครงการ / หลักสูตร</label>
          <input id="f-tn" class="form-control" value="${tr ? getItemName(tr) : ''}"></div>
        <div class="col-md-6"><label class="form-label fw-bold">วันที่</label>
          <input id="f-td" type="date" class="form-control" value="${tr?.date || ''}"></div>
        <div class="col-md-6"><label class="form-label fw-bold">เวลา</label>
          <input id="f-tt" class="form-control" placeholder="09:00-16:00" value="${tr?.time || ''}"></div>
        <div class="col-12"><label class="form-label fw-bold">สถานที่</label>
          <input id="f-tl" class="form-control" value="${tr?.location || ''}"></div>
        <div class="col-md-6"><label class="form-label fw-bold">จำนวนครูที่ต้องการ</label>
          <input id="f-tq" type="number" min="1" class="form-control" value="${tr?.requiredQuota || 1}"></div>
        <div class="col-md-6 d-flex align-items-end">
          <div class="form-check mb-2">
            <input class="form-check-input" type="checkbox" id="f-ts" ${tr?.isSpecial ? 'checked' : ''}>
            <label class="form-check-label fw-bold text-danger" for="f-ts">งานสำคัญพิเศษ (+20 คะแนน)</label>
          </div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
       <button class="btn btn-danger" onclick="saveTraining(${id || 'null'})">บันทึก</button>`);
}
function saveTraining(id) {
    const trainingName = document.getElementById('f-tn')?.value.trim();
    if (!trainingName) { alert('กรุณาใส่ชื่อการอบรม'); return; }
    const existing = id ? window.trainings.find(t => t.trainingId == id) : null;
    const isSpecial = document.getElementById('f-ts')?.checked || false;
    const data = { trainingId: id || Date.now(), trainingName, date: document.getElementById('f-td')?.value,
        time: document.getElementById('f-tt')?.value, location: document.getElementById('f-tl')?.value,
        requiredQuota: parseInt(document.getElementById('f-tq')?.value) || 1,
        isSpecial: isSpecial,
        status: existing?.status || 'pending', assignedTeachers: existing?.assignedTeachers || [] };
    if (id) { const i = window.trainings.findIndex(t => t.trainingId == id); if (i >= 0) window.trainings[i] = data; }
    else window.trainings.push(data);
    persistAllData(); hideModal(); renderQueueCards('training', 'trainings-cards');
    showFirebaseStatus('success', 'บันทึกการอบรมสำเร็จ');
}

/* ── Add/Edit Teacher ── */
function openTeacherModal(id) {
    const t = id ? window.teachers.find(t => t.teacherId == id) : null;
    showModal(t ? 'แก้ไขข้อมูลครู' : 'เพิ่มครูใหม่', `
      <div class="row g-3">
        <div class="col-12"><label class="form-label fw-bold">ชื่อ-นามสกุล</label>
          <input id="f-rn" class="form-control" value="${t?.name || ''}"></div>
        <div class="col-12"><label class="form-label fw-bold">ตำแหน่ง</label>
          <input id="f-rp" class="form-control" value="${t?.position || ''}"></div>
        <div class="col-md-6"><label class="form-label fw-bold">คะแนนเริ่มต้น (ออกงาน)</label>
          <input id="f-rd" type="number" class="form-control" value="${t?.dutyQueueScore || 0}"></div>
        <div class="col-md-6"><label class="form-label fw-bold">คะแนนเริ่มต้น (อบรม)</label>
          <input id="f-rt" type="number" class="form-control" value="${t?.trainingQueueScore || 0}"></div>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
       <button class="btn btn-danger" onclick="saveTeacher(${id || 'null'})">บันทึก</button>`);
}
function saveTeacher(id) {
    const name = document.getElementById('f-rn')?.value.trim();
    if (!name) { alert('กรุณาใส่ชื่อครู'); return; }
    const existing = id ? window.teachers.find(t => t.teacherId == id) : null;
    const data = { teacherId: id || Date.now(), name, position: document.getElementById('f-rp')?.value,
        dutyQueueScore: parseInt(document.getElementById('f-rd')?.value) || 0,
        trainingQueueScore: parseInt(document.getElementById('f-rt')?.value) || 0,
        totalDuties: existing?.totalDuties || 0,
        lastDutyDate: existing?.lastDutyDate || null,
        lastTrainingDate: existing?.lastTrainingDate || null
    };
    if (id) { const i = window.teachers.findIndex(t => t.teacherId == id); if (i >= 0) window.teachers[i] = data; }
    else window.teachers.push(data);
    persistAllData(); hideModal(); renderTeachersTable();
    showFirebaseStatus('success', 'บันทึกข้อมูลครูสำเร็จ');
}
function editTeacher(id) { openTeacherModal(id); }

function reconcileScores() {
    if (!confirm('คุณต้องการให้ระบบคำนวณคะแนนใหม่ทั้งหมดจากประวัติงานใช่หรือไม่? (คะแนนที่พิมพ์มือไว้อาจหายไป)')) return;
    
    // 1. Reset all scores
    window.teachers.forEach(t => {
        t.dutyQueueScore = 0;
        t.trainingQueueScore = 0;
        t.totalDuties = 0;
        t.lastDutyDate = null;
        t.lastTrainingDate = null;
    });

    // 2. Process Events
    window.events.forEach(ev => {
        if (ev.status === 'assigned' || ev.status === 'completed') {
            const points = ev.isSpecial ? 20 : 15;
            (ev.assignedTeachers || []).forEach(tid => {
                const t = getTeacherById(tid);
                if (t) {
                    t.dutyQueueScore = (t.dutyQueueScore || 0) + points;
                    t.totalDuties = (t.totalDuties || 0) + 1;
                    if (!t.lastDutyDate || ev.date > t.lastDutyDate) t.lastDutyDate = ev.date;
                }
            });
        }
    });

    // 3. Process Trainings
    window.trainings.forEach(tr => {
        if (tr.status === 'assigned' || tr.status === 'completed') {
            const points = tr.isSpecial ? 20 : 15;
            (tr.assignedTeachers || []).forEach(tid => {
                const t = getTeacherById(tid);
                if (t) {
                    t.trainingQueueScore = (t.trainingQueueScore || 0) + points;
                    t.totalDuties = (t.totalDuties || 0) + 1;
                    if (!t.lastTrainingDate || tr.date > t.lastTrainingDate) t.lastTrainingDate = tr.date;
                }
            });
        }
    });

    // 4. Process Activity Log for Substitutions (Special case: +25 instead of base)
    // The substitute gets 25 total. Since they are in 'assignedTeachers', they already got 15 or 20 above.
    // We add the difference.
    (window.activityLog || []).forEach(log => {
        if (log.type === 'substitution') {
            const t = getTeacherById(log.teacherId);
            if (t) {
                // Determine if it was training or duty based on the message or just add difference
                // Since we don't have eventId in the log, we assume duty unless training is specified
                const isTraining = log.message.includes('อบรม');
                // Assume base point was 15 (if special, they got 20, they get 5 more. if normal, 15, they get 10 more)
                // To keep it simple, let's just add 10 points as compensation to reach ~25.
                if (isTraining) t.trainingQueueScore = (t.trainingQueueScore || 0) + 10;
                else t.dutyQueueScore = (t.dutyQueueScore || 0) + 10;
            }
        }
    });

    persistAllData();
    renderTeachersTable();
    renderDashboard();
    showFirebaseStatus('success', 'คำนวณคะแนนใหม่เรียบร้อยแล้ว');
}

/* ── Auto Assign ── */
function openAutoAssignModal(id, type) {
    const list = type === 'training' ? window.trainings : window.events;
    const item = list.find(e => (e.eventId || e.trainingId) == id);
    if (!item) return;
    const sorted = sortTeachers(window.teachers, type);
    showModal('จัดคิวครู — ' + getItemName(item), `
      <p class="text-muted small mb-3">ต้องการ <strong>${item.requiredQuota || 1}</strong> คน (เรียงตามลำดับคิว)</p>
      <div>${sorted.map(t => `
        <div class="d-flex align-items-center gap-3 p-2 rounded mb-1" style="border:1px solid var(--border);">
          <input type="checkbox" class="form-check-input assign-cb" value="${t.teacherId}" id="cb-${t.teacherId}"
            ${(item.assignedTeachers || []).includes(t.teacherId) ? 'checked' : ''}>
          <div style="width:36px;height:36px;">${createTeacherAvatar(t)}</div>
          <label class="flex-grow-1 fw-bold" for="cb-${t.teacherId}">${t.name}</label>
          <span class="text-danger small">คิว: ${getTeacherQueueScore(t, type)}</span>
        </div>`).join('')}</div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
       <button class="btn btn-danger" onclick="saveAssignment(${id},'${type}')">ยืนยัน</button>`);
}
function saveAssignment(id, type) {
    const list = type === 'training' ? window.trainings : window.events;
    const item = list.find(e => (e.eventId || e.trainingId) == id);
    if (!item) return;

    const prevAssigned = item.assignedTeachers || [];
    const checked = [...document.querySelectorAll('.assign-cb:checked')].map(cb => parseInt(cb.value));
    
    const added = checked.filter(tid => !prevAssigned.includes(tid));
    const removed = prevAssigned.filter(tid => !checked.includes(tid));

    const basePoints = item.isSpecial ? 20 : 15;

    // Award points to newly added teachers
    added.forEach(tid => {
        const t = window.teachers.find(t => t.teacherId === tid);
        if (t) {
            if (type === 'training') {
                t.trainingQueueScore = (t.trainingQueueScore || 0) + basePoints;
                t.lastTrainingDate = item.date;
            } else {
                t.dutyQueueScore = (t.dutyQueueScore || 0) + basePoints;
                t.lastDutyDate = item.date;
            }
            t.totalDuties = (t.totalDuties || 0) + 1;
            
            window.activityLog.push({
                timestamp: Date.now(),
                type: 'assignment',
                teacherId: tid,
                teacherName: t.name,
                message: `ได้รับมอบหมายงาน "${getItemName(item)}" (+${basePoints} คะแนน)`
            });
        }
    });

    // Revert points for removed teachers
    removed.forEach(tid => {
        const t = window.teachers.find(t => t.teacherId === tid);
        if (t) {
            if (type === 'training') t.trainingQueueScore = Math.max(0, (t.trainingQueueScore || 0) - basePoints);
            else t.dutyQueueScore = Math.max(0, (t.dutyQueueScore || 0) - basePoints);
            t.totalDuties = Math.max(0, (t.totalDuties || 0) - 1);

            window.activityLog.push({
                timestamp: Date.now(),
                type: 'unassignment',
                teacherId: tid,
                teacherName: t.name,
                message: `ถูกยกเลิกจากงาน "${getItemName(item)}" (-${basePoints} คะแนน)`
            });
        }
    });

    item.assignedTeachers = checked;
    item.status = checked.length > 0 ? 'assigned' : 'pending';

    persistAllData(); hideModal();
    renderQueueCards(type, type === 'training' ? 'trainings-cards' : 'events-cards');
    renderDashboard(); showFirebaseStatus('success', 'จัดคิวสำเร็จ');
}

/* ── Substitution ── */
function openSubstitutionModal(id, type) {
    const list = type === 'training' ? window.trainings : window.events;
    const item = list.find(e => (e.eventId || e.trainingId) == id);
    if (!item) return;
    const assigned = (item.assignedTeachers || []).map(tid => window.teachers.find(t => t.teacherId === tid)).filter(Boolean);
    const others   = window.teachers.filter(t => !assigned.find(a => a.teacherId === t.teacherId));
    showModal('เปลี่ยนตัวครู — ' + getItemName(item), `
      <div class="row g-3">
        <div class="col-12">
            <label class="form-label fw-bold">ครูที่จะเปลี่ยนออก</label>
            <select id="f-so" class="form-select">${assigned.map(t => `<option value="${t.teacherId}">${t.name}</option>`).join('')}</select>
        </div>
        <div class="col-12">
            <label class="form-label fw-bold">ครูที่จะเข้าแทน</label>
            <select id="f-si" class="form-select">${others.map(t => `<option value="${t.teacherId}">${t.name} (คิว: ${getTeacherQueueScore(t,type)})</option>`).join('')}</select>
        </div>
        <div class="col-12 mt-3">
            <label class="form-label fw-bold d-block">ประเภทการแทนงาน</label>
            <div class="form-check mb-2">
                <input class="form-check-input" type="radio" name="subType" id="st-exchange" value="exchange" checked>
                <label class="form-check-label" for="st-exchange">
                    <strong>แลกเวร (ได้คะแนน +25)</strong><br>
                    <small class="text-muted">ผู้แทนได้ 25 คะแนน และลบคะแนนออกจากคนเดิม</small>
                </label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="radio" name="subType" id="st-help" value="help">
                <label class="form-check-label" for="st-help">
                    <strong>แทนกันเฉยๆ/ฝากเวร (+0 คะแนน)</strong><br>
                    <small class="text-muted">ผู้แทนไม่ได้รับคะแนน และคนเดิมยังคงได้รับคะแนนปกติ</small>
                </label>
            </div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
       <button class="btn btn-danger" onclick="saveSubstitution(${id},'${type}')">ยืนยันการเปลี่ยนตัว</button>`);
}
function saveSubstitution(id, type) {
    const list = type === 'training' ? window.trainings : window.events;
    const item = list.find(e => (e.eventId || e.trainingId) == id);
    if (!item) return;
    const outId = parseInt(document.getElementById('f-so')?.value);
    const inId  = parseInt(document.getElementById('f-si')?.value);
    const subType = document.querySelector('input[name="subType"]:checked')?.value || 'exchange';
    if (!outId || !inId) return;

    item.assignedTeachers = item.assignedTeachers.map(tid => tid === outId ? inId : tid);
    const basePoints = item.isSpecial ? 20 : 15;

    const tOut = window.teachers.find(t => t.teacherId === outId);
    const tIn  = window.teachers.find(t => t.teacherId === inId);

    if (subType === 'exchange') {
        // Option 1: Point Exchange (+25)
        if (tOut) {
            if (type === 'training') tOut.trainingQueueScore = Math.max(0, (tOut.trainingQueueScore || 0) - basePoints);
            else tOut.dutyQueueScore = Math.max(0, (tOut.dutyQueueScore || 0) - basePoints);
            tOut.totalDuties = Math.max(0, (tOut.totalDuties || 0) - 1);
        }
        if (tIn) {
            if (type === 'training') {
                tIn.trainingQueueScore = (tIn.trainingQueueScore || 0) + 25;
                tIn.lastTrainingDate = item.date;
            } else {
                tIn.dutyQueueScore = (tIn.dutyQueueScore || 0) + 25;
                tIn.lastDutyDate = item.date;
            }
            tIn.totalDuties = (tIn.totalDuties || 0) + 1;
            
            window.activityLog.push({
                timestamp: Date.now(),
                type: 'substitution',
                teacherId: inId,
                teacherName: tIn.name,
                message: `แลกเวรแทน ${tOut?.name || 'คนเดิม'} ในงาน "${getItemName(item)}" (+25 คะแนน)`
            });
        }
    } else {
        // Option 2: Help out (+0 for substitute, original keeps points)
        // We don't change points for tOut (they keep the +15/20 they got when assigned)
        // We don't add points for tIn
        if (tIn) {
            tIn.totalDuties = (tIn.totalDuties || 0) + 1; // Still count as a duty done
            if (type === 'training') tIn.lastTrainingDate = item.date;
            else tIn.lastDutyDate = item.date;

            window.activityLog.push({
                timestamp: Date.now(),
                type: 'help_out',
                teacherId: inId,
                teacherName: tIn.name,
                message: `แทนกันเฉยๆ ให้ ${tOut?.name || 'คนเดิม'} ในงาน "${getItemName(item)}" (+0 คะแนน)`
            });
        }
    }

    persistAllData(); hideModal();
    renderQueueCards(type, type === 'training' ? 'trainings-cards' : 'events-cards');
    renderDashboard();
    showFirebaseStatus('success', 'เปลี่ยนตัวครูสำเร็จ (+25 คะแนนสำหรับผู้แทน)');
}
function handleTeacherClick(id) { showTeacherDetail(id); }

