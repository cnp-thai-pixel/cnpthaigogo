/**
 * UI Rendering & Interactivity
 */

function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('d-none'));
    const target = document.getElementById(`${viewName}-view`);
    if (target) target.classList.remove('d-none');

    document.querySelectorAll('.nav-link-custom').forEach(l => {
        l.classList.remove('active');
        if (l.getAttribute('data-view') === viewName) l.classList.add('active');
    });

    // Specific renders
    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'events') renderQueueCards('duty', 'events-cards');
    if (viewName === 'trainings') renderQueueCards('training', 'trainings-cards');
    if (viewName === 'teachers') renderTeachersTable();
    if (viewName === 'history') renderHistory();
}

function renderDashboard() {
    const totalD = window.events.length;
    const totalT = window.trainings.length;
    const pendingD = window.events.filter(e => e.status === 'pending').length;
    const pendingT = window.trainings.filter(e => e.status === 'pending').length;
    const assignedD = window.events.filter(e => e.status === 'assigned').length;
    const assignedT = window.trainings.filter(e => e.status === 'assigned').length;

    document.getElementById('total-events-combined').textContent = totalD + totalT;
    document.getElementById('assigned-count').textContent = assignedD + assignedT;
    document.getElementById('pending-count').textContent = pendingD + pendingT;
    document.getElementById('total-teachers-count').textContent = window.teachers.length;

    renderLatestAssignedJob();
    renderUrgentEvents();
    renderNextQueue();
    renderDashboardStats();
}

function renderLatestAssignedJob() {
    const container = document.getElementById('latest-assigned-job');
    if (!container) return;

    const allAssigned = [
        ...window.events.filter(e => e.status === 'assigned').map(e => ({ ...e, type: 'duty' })),
        ...window.trainings.filter(e => e.status === 'assigned').map(e => ({ ...e, type: 'training' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (allAssigned.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-muted">ยังไม่มีงานที่จัดคิวแล้ว</div>';
        return;
    }

    const job = allAssigned[0];
    const teachers = job.assignedTeachers.map(id => getTeacherById(id)).filter(t => t);

    container.innerHTML = `
        <div class="row align-items-center">
            <div class="col-md-7">
                <div class="d-flex align-items-center gap-3 mb-3">
                    <div class="bg-light rounded-circle p-3 text-primary">
                        <i class="fas ${job.type === 'duty' ? 'fa-calendar-check' : 'fa-graduation-cap'} fa-2x"></i>
                    </div>
                    <div>
                        <h4 class="fw-bold mb-1">${job.title}</h4>
                        <div class="text-muted"><i class="fas fa-map-marker-alt me-2"></i>${job.location}</div>
                    </div>
                </div>
                <div class="d-flex flex-wrap gap-4 text-muted small">
                    <div><i class="fas fa-calendar me-2"></i>${formatDateThai(job.date)}</div>
                    <div><i class="fas fa-clock me-2"></i>${job.time || 'ไม่ระบุเวลา'}</div>
                    <div><i class="fas fa-tag me-2"></i>${job.type === 'duty' ? 'งานออกเวร' : 'งานอบรม'}</div>
                </div>
            </div>
            <div class="col-md-5 mt-4 mt-md-0">
                <div class="fw-bold mb-3 small text-uppercase text-muted">บุคลากรที่ได้รับมอบหมาย</div>
                <div class="d-flex flex-wrap gap-3">
                    ${teachers.map(t => `
                        <div class="d-flex align-items-center gap-2 bg-light p-2 rounded-pill pe-3">
                            <div style="width: 32px; height: 32px;">${createTeacherAvatar(t)}</div>
                            <span class="small fw-bold">${t.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('d-none');
}

function renderDashboardStats() {
    // Top 5 Teachers (Based on assigned events + trainings)
    const teacherWorkloads = window.teachers.map(t => {
        const dutyCount = window.events.filter(e => e.status === 'assigned' && e.assignedTeachers?.includes(t.teacherId)).length;
        const trainingCount = window.trainings.filter(e => e.status === 'assigned' && e.assignedTeachers?.includes(t.teacherId)).length;
        return {
            name: `${t.prefix || ''}${t.firstName} ${t.lastName}`,
            total: dutyCount + trainingCount,
            dutyCount,
            trainingCount,
            avatarUrl: createTeacherAvatar(t)
        };
    }).sort((a, b) => b.total - a.total).slice(0, 5);

    const maxTotal = teacherWorkloads.length > 0 ? Math.max(...teacherWorkloads.map(t => t.total), 1) : 1;
    
    const topTeachersContainer = document.getElementById('top-teachers-chart');
    if (!topTeachersContainer) return;
    
    if (teacherWorkloads.length === 0 || teacherWorkloads.every(t => t.total === 0)) {
        topTeachersContainer.innerHTML = '<div class="text-muted text-center py-4">ยังไม่มีข้อมูลการออกงาน</div>';
    } else {
        topTeachersContainer.innerHTML = teacherWorkloads.map(t => {
            const height = (t.total / maxTotal) * 100;
            return `
                <div class="vertical-bar-group">
                    <span class="small font-weight-bold text-muted">${t.total}</span>
                    <div class="vertical-bar" style="height: ${height}%;"></div>
                    ${t.avatarUrl.includes('div') ? t.avatarUrl.replace('teacher-avatar', 'teacher-avatar shadow-sm border border-light').replace('style="', 'style="width:36px;height:36px;font-size:0.9rem;') : `<img src="${t.avatarUrl}" class="rounded-circle shadow-sm" style="width:36px;height:36px;object-fit:cover;">`}
                </div>
            `;
        }).join('');
    }

    // Proportion Stats
    const totalD = window.events.length;
    const totalT = window.trainings.length;
    const totalAll = totalD + totalT || 1; // Prevent div by zero
    
    const pctD = Math.round((totalD / totalAll) * 100);
    const pctT = totalAll > 1 ? Math.round((totalT / totalAll) * 100) : 0;

    const statDoughnut = document.getElementById('stat-doughnut');
    if(statDoughnut) {
        statDoughnut.style.background = `conic-gradient(var(--primary) 0% ${pctD}%, var(--secondary) ${pctD}% ${pctD + pctT}%, var(--surface-hover) ${pctD + pctT}% 100%)`;
        document.getElementById('stat-total-center').textContent = totalAll;
        document.getElementById('stat-duty-percent').textContent = `${pctD}%`;
        document.getElementById('stat-training-percent').textContent = `${pctT}%`;
    }

    // Recent Transactions (Updates)
    const recentList = document.getElementById('recent-transactions-list');
    if (recentList) {
        const allEvents = [...window.events.map(e => ({...e, type: 'duty'})), ...window.trainings.map(e => ({...e, type: 'training'}))];
        allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recent = allEvents.slice(0, 5);
        
        if (recent.length === 0) {
            recentList.innerHTML = '<div class="text-muted text-center py-3">ยังไม่มีรายการ</div>';
        } else {
            recentList.innerHTML = recent.map(r => {
                const isDuty = r.type === 'duty';
                const statusBadgeClass = r.status === 'assigned' ? 'badge-assigned' : (r.status === 'completed' ? 'badge-completed' : 'badge-pending');
                const statusText = r.status === 'assigned' ? 'SUCCESS' : (r.status === 'completed' ? 'COMPLETED' : 'PENDING');
                return `
                    <div class="d-flex align-items-center justify-content-between border-bottom py-3" style="border-color: var(--border) !important;">
                        <div class="d-flex align-items-center gap-3">
                            <div class="avatar-ring">
                                <div class="rounded-circle bg-light d-flex align-items-center justify-content-center text-primary" style="width:40px;height:40px;">
                                    <i class="fas ${isDuty ? 'fa-calendar-check' : 'fa-graduation-cap'}"></i>
                                </div>
                            </div>
                            <div>
                                <div class="font-weight-bold text-dark">${r.title}</div>
                                <div class="small text-muted">${formatDateThai(r.date)} &middot; ${isDuty ? 'งานออกเวร' : 'งานอบรม'}</div>
                            </div>
                        </div>
                        <div class="d-flex align-items-center gap-4">
                            <span class="badge-status ${statusBadgeClass}">${statusText}</span>
                            <span class="font-weight-bold d-none d-md-block text-truncate" style="max-width: 150px;">${r.location || '-'}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function renderNextQueue() {
    const container = document.getElementById('next-teachers-queue');
    if (!container) return;

    // Sort teachers by workload (lowest first)
    const sortedTeachers = [...window.teachers].sort((a, b) => {
        const scoreA = getTeacherQueueScore(a, 'duty') + getTeacherQueueScore(a, 'training');
        const scoreB = getTeacherQueueScore(b, 'duty') + getTeacherQueueScore(b, 'training');
        return scoreA - scoreB;
    }).slice(0, 6);

    container.innerHTML = sortedTeachers.map((t, i) => `
        <div class="d-flex align-items-center justify-content-between p-3 border border-light rounded-3 animate-fade-in" style="animation-delay: ${i * 0.05}s">
            <div class="d-flex align-items-center gap-3">
                <div class="fw-bold text-muted small" style="width: 20px;">${i + 1}</div>
                <div style="width: 40px; height: 40px;">${createTeacherAvatar(t)}</div>
                <div>
                    <div class="fw-bold small">${t.name}</div>
                    <div class="text-muted extra-small">${t.position}</div>
                </div>
            </div>
            <div class="text-end">
                <div class="fw-bold text-primary small">${getTeacherQueueScore(t, 'duty') + getTeacherQueueScore(t, 'training')}</div>
                <div class="text-muted extra-small">คะแนนรวม</div>
            </div>
        </div>
    `).join('');
}

function renderUrgentEvents() {
    const container = document.getElementById('urgent-events-list');
    if (!container) return;

    const urgent = [
        ...window.events.filter(e => e.status === 'pending'),
        ...window.trainings.filter(e => e.status === 'pending')
    ].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);

    if (urgent.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-muted small">ไม่มีงานที่ต้องจัดคิวเร่งด่วน</div>';
        return;
    }

    container.innerHTML = urgent.map((e, i) => `
        <div class="d-flex align-items-center justify-content-between p-3 bg-light rounded-3 border-start border-warning border-4 animate-fade-in" style="animation-delay: ${i * 0.1}s">
            <div class="d-flex align-items-center gap-3">
                <div class="bg-white rounded-circle d-flex align-items-center justify-content-center text-warning shadow-sm" style="width: 36px; height: 36px;">
                    <i class="fas fa-clock"></i>
                </div>
                <div>
                    <div class="fw-bold small">${e.title}</div>
                    <div class="text-muted extra-small">${formatDateThai(e.date)} &middot; ${e.location}</div>
                </div>
            </div>
            <button class="btn btn-premium btn-premium-accent btn-sm admin-only" onclick="openAutoAssignModal(${e.eventId || e.trainingId}, '${e.eventId ? 'duty' : 'training'}')">
                จัดคิว
            </button>
        </div>
    `).join('');
}

function renderQueueCards(type, containerId) {
    const container = document.getElementById(containerId);
    const list = type === 'training' ? window.trainings : window.events;
    
    if (list.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5 text-muted">ไม่พบข้อมูล</div>';
        return;
    }

    container.innerHTML = list.map(item => {
        const statusBadgeClass = item.status === 'assigned' ? 'badge-assigned' : (item.status === 'completed' ? 'badge-completed' : 'badge-pending');
        const statusText = item.status === 'assigned' ? 'จัดคิวแล้ว' : (item.status === 'completed' ? 'สำเร็จ' : 'รอจัดคิว');
        
        return `
            <div class="col-sm-6 col-lg-4 col-xl-3 mb-4">
                <div class="card-premium h-100 bg-transparent animate-fade-in">
                    <!-- Thumbnail Area (16:9) -->
                    <div class="position-relative mb-3" style="aspect-ratio: 16/9; background: var(--surface); border-radius: var(--radius-lg); overflow: hidden;">
                        <div class="w-100 h-100 d-flex align-items-center justify-content-center text-muted">
                            <i class="fas ${type === 'duty' ? 'fa-calendar-alt' : 'fa-graduation-cap'} fa-3x opacity-25"></i>
                        </div>
                        <div class="position-absolute bottom-0 end-0 m-2 px-2 py-1 bg-dark text-white rounded-1 extra-small fw-bold opacity-75">
                            ${item.time || '00:00'}
                        </div>
                        <div class="position-absolute top-0 start-0 m-2">
                            <span class="badge-status ${statusBadgeClass}">${statusText}</span>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="d-flex gap-3 px-1">
                        <div class="flex-shrink-0" style="width: 36px; height: 36px;">
                            ${item.assignedTeachers?.length > 0 
                                ? createTeacherAvatar(getTeacherById(item.assignedTeachers[0]))
                                : '<div class="teacher-avatar" style="width:36px;height:36px;font-size:0.8rem;">?</div>'}
                        </div>
                        <div class="flex-grow-1 overflow-hidden">
                            <h6 class="fw-bold mb-1 text-truncate-2" style="font-size: 14px; line-height: 20px;">${item.title}</h6>
                            <div class="text-muted extra-small mb-2">
                                <div>${item.location}</div>
                                <div>${formatDateThai(item.date)}</div>
                            </div>
                            
                            <div class="d-flex gap-2 admin-only mt-2">
                                <button class="btn btn-premium btn-premium-secondary btn-sm flex-grow-1 px-1" onclick="editItem(${item.eventId || item.trainingId}, '${type}')" style="height:32px; font-size:12px;">แก้ไข</button>
                                ${item.status === 'pending' 
                                    ? `<button class="btn btn-premium btn-premium-accent btn-sm flex-grow-1 px-1" onclick="openAutoAssignModal(${item.eventId || item.trainingId}, '${type}')" style="height:32px; font-size:12px;">จัดคิว</button>`
                                    : `<button class="btn btn-premium btn-premium-secondary btn-sm flex-grow-1 px-1" onclick="openSubstitutionModal(${item.eventId || item.trainingId}, '${type}')" style="height:32px; font-size:12px;">แทนคน</button>`
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTeachersTable() {
    const tbody = document.getElementById('teachers-table-body');
    const sorted = [...window.teachers].sort((a, b) => getTeacherQueueScore(a, 'duty') - getTeacherQueueScore(b, 'duty'));
    
    tbody.innerHTML = sorted.map((t, i) => `
        <tr onclick="showTeacherDetail(${t.teacherId})" style="cursor: pointer" class="align-middle">
            <td class="text-muted small">${i+1}</td>
            <td>
                <div class="d-flex align-items-center gap-3">
                    <div style="width: 40px; height: 40px;">${createTeacherAvatar(t)}</div>
                    <div>
                        <div class="fw-bold">${t.name}</div>
                        <div class="text-muted extra-small">${t.position}</div>
                    </div>
                </div>
            </td>
            <td class="text-center"><span class="fw-bold text-primary">${getTeacherQueueScore(t, 'duty')}</span></td>
            <td class="text-center"><span class="fw-bold text-secondary">${getTeacherQueueScore(t, 'training')}</span></td>
            <td class="text-center small">${t.totalDuties || 0} ครั้ง</td>
            <td class="text-end admin-only">
                <button class="btn btn-premium btn-premium-secondary btn-sm" onclick="editTeacher(${t.teacherId})"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
}

function showFirebaseStatus(type, message, sticky = false) {
    const banner = document.getElementById('status-toast');
    if (!banner) return;
    
    banner.className = `alert alert-${type === 'error' ? 'danger' : (type === 'success' ? 'success' : 'info')} glass animate-fade-in`;
    banner.innerHTML = `<i class="fas fa-info-circle mr-2"></i> ${message}`;
    banner.style.display = 'block';

    if (!sticky) {
        setTimeout(() => banner.style.display = 'none', 5000);
    }
}

// Modal Handlers
const bootstrapModal = () => new bootstrap.Modal(document.getElementById('universalModal'));

function openEventModal(eventId = null) {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const event = eventId ? window.events.find(e => e.eventId === eventId) : null;

    modalTitle.textContent = event ? 'แก้ไขข้อมูลงาน' : 'เพิ่มงานใหม่';
    modalBody.innerHTML = `
        <form id="modal-form">
            <div class="mb-3">
                <label class="form-label small font-weight-bold">ชื่องาน</label>
                <input type="text" class="form-control" id="f-name" value="${event?.eventName || ''}" required>
            </div>
            <div class="row mb-3">
                <div class="col-6">
                    <label class="form-label small font-weight-bold">วันที่</label>
                    <input type="date" class="form-control" id="f-date" value="${event?.date || ''}" required>
                </div>
                <div class="col-6">
                    <label class="form-label small font-weight-bold">จำนวนครูที่ต้องการ</label>
                    <input type="number" class="form-control" id="f-quota" value="${event?.requiredQuota || ''}" required>
                </div>
            </div>
            <div class="mb-3">
                <label class="form-label small font-weight-bold">สถานที่</label>
                <input type="text" class="form-control" id="f-location" value="${event?.location || ''}" required>
            </div>
            <div class="text-right mt-4">
                <button type="button" class="btn btn-light mr-2" data-bs-dismiss="modal">ยกเลิก</button>
                <button type="submit" class="btn btn-premium-primary">บันทึกข้อมูล</button>
            </div>
        </form>
    `;

    const myModal = bootstrapModal();
    myModal.show();

    document.getElementById('modal-form').onsubmit = (e) => {
        e.preventDefault();
        saveEvent(eventId);
        myModal.hide();
    };
}

function openAutoAssignModal(eventId, type) {
    const event = type === 'duty' ? window.events.find(e => e.eventId === eventId) : window.trainings.find(e => e.trainingId === eventId);
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = `จัดคิวอัตโนมัติ: ${event.eventName || event.trainingName}`;
    
    const suggested = getNextQueueTeachers(event.requiredQuota, type);
    
    modalBody.innerHTML = `
        <div class="alert alert-info small mb-4">
            ระบบแนะนำบุคลากรที่มีคะแนนสะสมน้อยที่สุดเพื่อความยุติธรรม
        </div>
        <div class="list-group mb-4">
            ${suggested.map(t => `
                <div class="list-group-item d-flex align-items-center">
                    ${createTeacherAvatar(t)}
                    <div class="ml-3">
                        <h6 class="mb-0">${t.name}</h6>
                        <small class="text-muted">${t.position} | คะแนน: ${getTeacherQueueScore(t, type)}</small>
                    </div>
                    <div class="ml-auto text-success"><i class="fas fa-check-circle"></i></div>
                </div>
            `).join('')}
        </div>
        <div class="text-right">
            <button class="btn btn-light mr-2" data-bs-dismiss="modal">ยกเลิก</button>
            <button class="btn btn-premium-primary" id="confirm-assign">ยืนยันการจัดคิว</button>
        </div>
    `;

    const myModal = bootstrapModal();
    myModal.show();

    document.getElementById('confirm-assign').onclick = () => {
        confirmAssignment(eventId, suggested, type);
        myModal.hide();
    };
}

function confirmAssignment(eventId, teachers, type) {
    const list = type === 'duty' ? window.events : window.trainings;
    const item = list.find(e => (e.eventId || e.trainingId) === eventId);
    
    item.status = 'assigned';
    item.assignedTeachers = teachers.map(t => t.teacherId);
    
    // Update scores
    teachers.forEach(t => {
        if (type === 'duty') t.dutyQueueScore = (t.dutyQueueScore || 0) + 15;
        else t.trainingQueueScore = (t.trainingQueueScore || 0) + 15;
    });

    persistAllData();
    showView(type === 'duty' ? 'events' : 'trainings');
    showFirebaseStatus('success', 'จัดคิวเรียบร้อยแล้ว');
}

function saveEvent(eventId) {
    const data = {
        eventName: document.getElementById('f-name').value,
        date: document.getElementById('f-date').value,
        requiredQuota: parseInt(document.getElementById('f-quota').value),
        location: document.getElementById('f-location').value,
        status: 'pending'
    };

    if (eventId) {
        const index = window.events.findIndex(e => e.eventId === eventId);
        window.events[index] = { ...window.events[index], ...data };
    } else {
        data.eventId = Date.now();
        window.events.push(data);
    }

    persistAllData();
    showView('events');
}
