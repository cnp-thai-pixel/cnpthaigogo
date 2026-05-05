/**
 * Main Application Logic & State Management
 */

// Global State
window.systemConfig = { system_title: "ระบบจัดการออกงานครู", school_name: "กลุ่มสาระการเรียนรู้ภาษาไทย" };
window.teachers = [];
window.events = [];
window.trainings = [];
window.activityLog = [];
window.dataInitialized = false;
window.isAdmin = localStorage.getItem('isAdmin') === 'true';

document.addEventListener('DOMContentLoaded', async () => {
    updateAdminUI();
    await loadInitialData();
    setupEventListeners();
});

function toggleAdmin() {
    if (window.isAdmin) {
        localStorage.removeItem('isAdmin');
        window.isAdmin = false;
        alert('ออกจากโหมด Admin แล้ว (ดูได้อย่างเดียว)');
    } else {
        const pin = prompt('กรุณาใส่รหัสผ่าน Admin:');
        if (pin === 'thai1234') {
            localStorage.setItem('isAdmin', 'true');
            window.isAdmin = true;
            alert('เข้าสู่โหมด Admin สำเร็จ (แก้ไขข้อมูลได้)');
        } else {
            if (pin) alert('รหัสผ่านไม่ถูกต้อง');
            return;
        }
    }
    updateAdminUI();
    showView(document.querySelector('.nav-link-custom.active').getAttribute('data-view'));
}

function updateAdminUI() {
    const btn = document.getElementById('admin-btn');
    if (window.isAdmin) {
        document.body.classList.add('admin-mode');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-unlock-alt me-1"></i> Admin (ปลดล็อก)';
            btn.classList.remove('btn-rb-red');
            btn.classList.add('btn-rb-ghost');
        }
    } else {
        document.body.classList.remove('admin-mode');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-lock me-1"></i> Admin (ล็อก)';
            btn.classList.remove('btn-rb-ghost');
            btn.classList.add('btn-rb-red');
        }
    }
}

async function loadInitialData() {
    // Safety: force-hide loader after 8s no matter what
    const safetyTimer = setTimeout(() => toggleLoading(false), 8000);
    toggleLoading(true);
    try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('Firebase Timeout'), 5000));
        try {
            await Promise.race([window.firebaseReadyPromise, timeoutPromise]);
        } catch (e) {
            console.warn('Firebase timeout or unavailable — using fallback data.');
        }

        if (canUseDirectFirebase()) {
            try {
                const data = await fetchInitialDataDirect();
                applyInitialData(data);
            } catch (fetchErr) {
                console.error('Firestore fetch error:', fetchErr);
                applyInitialData({
                    teachers: createDefaultTeachers(),
                    events: createDefaultEvents(),
                    trainings: createDefaultTrainings()
                });
            }
        } else {
            applyInitialData({
                teachers: createDefaultTeachers(),
                events: createDefaultEvents(),
                trainings: createDefaultTrainings()
            });
        }
    } catch (error) {
        console.error('Init error:', error);
    } finally {
        clearTimeout(safetyTimer);
        toggleLoading(false);
        window.dataInitialized = true;
        try { showView('dashboard'); } catch(e) { console.error('showView error:', e); }
    }
}

function applyInitialData(data) {
    window.systemConfig = { ...window.systemConfig, ...data.config };
    window.teachers = data.teachers || [];
    window.events = data.events || [];
    window.trainings = data.trainings || [];
    window.activityLog = data.activityLog || [];
    
    updateHeader();
    renderDashboard();
}

function updateHeader() {
    document.getElementById('brand-title').textContent = window.systemConfig.system_title;
    document.getElementById('brand-subtitle').textContent = window.systemConfig.school_name;
}

function setupEventListeners() {
    document.querySelectorAll('.nav-link-custom').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.getAttribute('data-view');
            showView(view);
        });
    });
}

function toggleLoading(show) {
    const loader = document.getElementById('loading-overlay');
    if (!loader) return;
    if (show) {
        loader.style.display = 'flex';
    } else {
        loader.style.display = 'none';
    }
}

// createTeacherAvatar is defined in utils.js — no override needed here

// Logic Helpers
function getTeacherById(id) {
    return window.teachers.find(t => t.teacherId === id);
}

function getTeacherQueueScore(teacher, type) {
    return type === 'training' ? (teacher.trainingQueueScore || 0) : (teacher.dutyQueueScore || 0);
}

function getNextQueueTeachers(limit, type) {
    return [...window.teachers].sort((a, b) => {
        const scoreA = getTeacherQueueScore(a, type);
        const scoreB = getTeacherQueueScore(b, type);
        if (scoreA !== scoreB) return scoreA - scoreB;
        
        // Tie breaker: last event date
        const dateA = new Date(type === 'duty' ? a.lastDutyDate : a.lastTrainingDate || 0);
        const dateB = new Date(type === 'duty' ? b.lastDutyDate : b.lastTrainingDate || 0);
        return dateA - dateB;
    }).slice(0, limit);
}

function getEventAssignmentSlots(event) {
    if (!event) return [];
    if (!event.assignmentSlots) {
        event.assignmentSlots = (event.assignedTeachers || []).map(id => ({
            originalTeacherId: id,
            currentTeacherId: id,
            substitutionType: 'none'
        }));
    }
    return event.assignmentSlots;
}

// Mock Data Creators (for fallback)
function createDefaultTeachers() {
    return [
        { teacherId: 1, name: 'พรรวินท์', position: 'ครูชำนาญการ', dutyQueueScore: 30, trainingQueueScore: 0, totalDuties: 2 },
        { teacherId: 2, name: 'สอาดวรรณ', position: 'ครูชำนาญการพิเศษ', dutyQueueScore: 30, trainingQueueScore: 0, totalDuties: 2 },
        { teacherId: 3, name: 'สุทัศษา', position: 'ครูชำนาญการ', dutyQueueScore: 30, trainingQueueScore: 0, totalDuties: 2 },
        { teacherId: 4, name: 'กฤษณีนาท', position: 'ครู', dutyQueueScore: 30, trainingQueueScore: 0, totalDuties: 2 }
    ];
}

function createDefaultEvents() {
    return [
        { eventId: 1, eventName: 'พิธีเสกน้ำพระพุทธมนต์ศักดิ์สิทธิ์', date: '2024-07-07', time: '15:00-17:00', location: 'วัดพระบรมธาตุวรวิหาร', requiredQuota: 3, assignedTeachers: [1, 2, 3], status: 'assigned' }
    ];
}

function createDefaultTrainings() {
    return [
        { trainingId: 1, trainingName: 'อบรม Active Learning', date: '2025-06-15', time: '09:00-16:00', location: 'อาคารวิมลคุณากร', requiredQuota: 4, assignedTeachers: [], status: 'pending' }
    ];
}
