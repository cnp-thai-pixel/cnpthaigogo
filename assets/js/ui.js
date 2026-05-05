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
    document.getElementById('total-events').textContent = window.events.length;
    document.getElementById('total-trainings').textContent = window.trainings.length;
    
    const pendingEvents = window.events.filter(e => e.status === 'pending').length;
    const pendingTrainings = window.trainings.filter(e => e.status === 'pending').length;
    
    document.getElementById('pending-events').textContent = pendingEvents + pendingTrainings;
    document.getElementById('total-teachers').textContent = window.teachers.length;

    renderNextQueue();
    renderUrgentEvents();
    renderDashboardStats();
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
    const dutyQueue = getNextQueueTeachers(13, 'duty');
    const trainingQueue = getNextQueueTeachers(13, 'training');
    
    const renderList = (teachers, type) => {
        return teachers.map((t, i) => `
            <div class="queue-item-mini animate-fade-in" style="animation-delay: ${i * 0.05}s" onclick="handleTeacherClick(${t.teacherId})">
                ${createTeacherAvatar(t)}
                <p class="mt-2 mb-0 font-weight-bold small">${t.name}</p>
                <p class="text-muted extra-small mb-1">${t.position}</p>
                <span class="badge badge-pill ${type === 'duty' ? 'btn-premium-secondary' : 'btn-premium-primary'} small">
                    ${getTeacherQueueScore(t, type)}
                </span>
            </div>
        `).join('');
    };

    document.getElementById('next-queue-duty').innerHTML = renderList(dutyQueue, 'duty');
    document.getElementById('next-queue-training').innerHTML = renderList(trainingQueue, 'training');
}

function renderUrgentEvents() {
    const urgent = window.events
        .filter(e => e.status === 'pending')
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 4);

    const container = document.getElementById('urgent-events');
    if (urgent.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-4">ไม่มีงานค้าง</p>';
        return;
    }

    container.innerHTML = urgent.map(e => `
        <div class="card-premium p-3 mb-3 d-flex align-items-center justify-content-between">
            <div>
                <h6 class="mb-1 font-weight-bold">${e.eventName}</h6>
                <p class="mb-0 text-muted small"><i class="far fa-calendar-alt mr-1"></i> ${formatDateThai(e.date)} | ${e.time}</p>
            </div>
            <button class="btn btn-sm btn-premium-primary admin-only" onclick="openAutoAssignModal(${e.eventId}, 'duty')">จัดคิว</button>
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

    container.innerHTML = list.sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => {
        const slots = getEventAssignmentSlots(item);
        const assigned = slots.filter(s => s.currentTeacherId).length;
        const statusClass = `badge-${item.status}`;
        const statusText = item.status === 'assigned' ? 'จัดคิวแล้ว' : item.status === 'completed' ? 'เสร็จสิ้น' : 'รอจัดคิว';

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card-premium h-100">
                    <div class="p-4">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="badge-status ${statusClass}">${statusText}</span>
                            <small class="text-muted">${assigned}/${item.requiredQuota} คน</small>
                        </div>
                        <h5 class="font-weight-bold mb-3">${item.eventName || item.trainingName}</h5>
                        <div class="small text-muted mb-4">
                            <div class="mb-1"><i class="far fa-calendar mr-2"></i>${formatDateThai(item.date)}</div>
                            <div class="mb-1"><i class="far fa-clock mr-2"></i>${item.time}</div>
                            <div><i class="fas fa-map-marker-alt mr-2"></i>${item.location}</div>
                        </div>
                        
                        <div class="d-flex flex-wrap gap-2 mb-4">
                            ${slots.slice(0, 5).map(s => {
                                const t = getTeacherById(s.currentTeacherId);
                                return t ? `<div class="avatar-ring mr-1" title="${t.name}">${createTeacherAvatar(t)}</div>` : '';
                            }).join('')}
                        </div>

                        <div class="d-flex gap-2 admin-only">
                            <button class="btn btn-sm btn-premium-secondary flex-grow-1" onclick="editItem(${item.eventId || item.trainingId}, '${type}')">แก้ไข</button>
                            ${item.status === 'pending' 
                                ? `<button class="btn btn-sm btn-premium-primary flex-grow-1" onclick="openAutoAssignModal(${item.eventId || item.trainingId}, '${type}')">จัดคิว</button>`
                                : `<button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="openSubstitutionModal(${item.eventId || item.trainingId}, '${type}')">แทนคน</button>`
                            }
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
        <tr onclick="showTeacherDetail(${t.teacherId})" style="cursor: pointer">
            <td>${i+1}</td>
            <td>
                <div class="d-flex align-items-center">
                    ${createTeacherAvatar(t)}
                    <span class="ml-3 font-weight-bold">${t.name}</span>
                </div>
            </td>
            <td>${t.position}</td>
            <td class="text-center"><span class="badge badge-pill btn-premium-secondary">${getTeacherQueueScore(t, 'duty')}</span></td>
            <td class="text-center"><span class="badge badge-pill btn-premium-primary">${getTeacherQueueScore(t, 'training')}</span></td>
            <td class="text-center">${t.totalDuties || 0}</td>
            <td class="text-right admin-only">
                <button class="btn btn-sm btn-light" onclick="editTeacher(${t.teacherId})"><i class="fas fa-edit"></i></button>
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
