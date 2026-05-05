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
            btn.innerHTML = '<i class="fas fa-unlock me-1"></i> ออกจากระบบ Admin';
            btn.classList.replace('btn-outline-danger', 'btn-danger');
            btn.classList.add('text-white');
        }
    } else {
        document.body.classList.remove('admin-mode');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-lock me-1"></i> เข้าสู่ระบบ Admin';
            btn.classList.replace('btn-danger', 'btn-outline-danger');
            btn.classList.remove('text-white');
        }
    }
}

async function loadInitialData() {
    toggleLoading(true);
    try {
        // Wait for Firebase to be ready (up to 5 seconds)
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('Firebase Timeout'), 5000));
        try {
            await Promise.race([window.firebaseReadyPromise, timeoutPromise]);
        } catch (e) {
            console.warn('Firebase connection timed out or not available, using fallback data.');
        }

        if (canUseDirectFirebase()) {
            const data = await fetchInitialDataDirect();
            applyInitialData(data);
        } else {
            // Fallback to defaults if no firebase
            applyInitialData({
                teachers: createDefaultTeachers(),
                events: createDefaultEvents(),
                trainings: createDefaultTrainings()
            });
        }
    } catch (error) {
        console.error('Init error:', error);
        showFirebaseStatus('error', 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
        toggleLoading(false);
        window.dataInitialized = true;
        showView('dashboard');
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
            
            // Auto close sidebar on mobile after clicking a link
            if (window.innerWidth <= 991 && typeof toggleSidebar === 'function') {
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('show')) {
                    toggleSidebar();
                }
            }
        });
    });
}

function toggleLoading(show) {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        if (show) {
            loader.classList.remove('d-none');
            loader.classList.add('d-flex');
        } else {
            loader.classList.remove('d-flex');
            loader.classList.add('d-none');
        }
    }
}

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
