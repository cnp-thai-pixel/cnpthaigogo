/**
 * UI Rendering — Red Broadcast Design System
 * Fixed: undefined fields, new IDs, sidebar toggle
 */

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
const VIEW_TITLES: Record<string, string> = {
    dashboard: 'หน้าหลัก',
    events:    'จัดการออกงาน',
    trainings: 'จัดการอบรม',
    teachers:  'บุคลากร',
    history:   'บันทึกและประวัติ',
};

window.showView = function(viewName: string) {
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

    if (viewName === 'dashboard') window.renderDashboard();
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
        if (overlay) overlay.classList.toggle('show');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
}

/* ─── Dashboard ─────────────────────────────── */
window.renderDashboard = function() {
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
    renderTeacherQueueStrips(); 
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
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    const latestTraining = window.trainings
        .filter(e => e.status === 'assigned')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!latestDuty && !latestTraining) {
        container.innerHTML = '<div class="text-center py-4 text-muted">ยังไม่มีงานที่จัดคิวแล้ว</div>';
        return;
    }

    const renderSubCard = (job: any, label: string, icon: string, isDuty: boolean) => {
        if (!job) return '';
        
        // @ts-ignore
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
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 6);

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
        <button class="btn-rb btn-rb-red btn-sm admin-only" onclick="window.openAutoAssignModal(${getItemId(e)}, '${e._type}')">จัดคิว</button>
      </div>`).join('');
}

function renderNextQueue() {
    const container = document.getElementById('next-teachers-queue');
    if (!container) return;

    // @ts-ignore
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
    })).sort((a: any, b: any) => b.total - a.total).slice(0, 5);

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
    // @ts-ignore
    const dutySorted = sortTeachers(teachers, 'duty');
    dutyStrip.innerHTML = dutySorted.map((t, i) => `
        <div class="teacher-queue-card-compact ${i < 3 ? 'top-rank' : ''}" onclick="window.showTeacherDetail(${t.teacherId})" title="${t.name} (คิว: ${getTeacherQueueScore(t, 'duty')})">
            <div class="rank-badge">${i + 1}</div>
            <div class="avatar-container">${createTeacherAvatar(t)}</div>
        </div>
    `).join('');

    // Training Queue
    // @ts-ignore
    const trainingSorted = sortTeachers(teachers, 'training');
    trainingStrip.innerHTML = trainingSorted.map((t, i) => `
        <div class="teacher-queue-card-compact ${i < 3 ? 'top-rank' : ''}" onclick="window.showTeacherDetail(${t.teacherId})" style="border-color: var(--secondary);" title="${t.name} (คิว: ${getTeacherQueueScore(t, 'training')})">
            <div class="rank-badge" style="background: var(--secondary);">${i + 1}</div>
            <div class="avatar-container">${createTeacherAvatar(t)}</div>
        </div>
    `).join('');
}
