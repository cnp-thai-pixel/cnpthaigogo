/**
 * Utility Functions & Helpers
 */

function normalizeDateString(input) {
    if (!input) return null;
    if (input instanceof Date && !isNaN(input)) return input.toISOString().slice(0, 10);

    const str = String(input).trim();
    const direct = new Date(str);
    if (!isNaN(direct.getTime())) return direct.toISOString().slice(0, 10);

    const match = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (match) {
        let day = parseInt(match[1], 10), month = parseInt(match[2], 10) - 1, year = parseInt(match[3], 10);
        if (year > 2400) year -= 543;
        const normalized = new Date(year, month, day);
        if (!isNaN(normalized.getTime())) return normalized.toISOString().slice(0, 10);
    }
    return null;
}

function formatDateThai(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';

    const buddhistYear = date.getFullYear() + 543;
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${date.getDate()} ${months[date.getMonth()]} ${buddhistYear}`;
}

function formatDateRangeThai(startDate, endDate) {
    const s = normalizeDateString(startDate), e = normalizeDateString(endDate);
    if (!s && !e) return '-';
    if (s === e) return formatDateThai(s);
    return `${formatDateThai(s)} - ${formatDateThai(e)}`;
}

const teacherPhotos = {
    'กฤษณีนาท': 'assets/img/techerpic/กฤษณีนาท.png',
    'ขวัญนาค': 'assets/img/techerpic/ขวัญนาค.png',
    'นัชนันท์': 'assets/img/techerpic/นัชนันท์.png',
    'นันทนา': 'assets/img/techerpic/นันทนา.png',
    'พรรวินท์': 'assets/img/techerpic/พรรวินท์.png',
    'วินัย': 'assets/img/techerpic/วินัย.png',
    'วิลาวรรณ': 'assets/img/techerpic/วิลาวรรณ.png',
    'สอาดวรรณ': 'assets/img/techerpic/สอาดวรรณ.png',
    'สุทัศษา': 'assets/img/techerpic/สุทัศษา.png',
    'อรวรรณ': 'assets/img/techerpic/อรวรรณ.png',
    'อังคณา': 'assets/img/techerpic/อังคณา.png',
    'เพ็ญพรรณี': 'assets/img/techerpic/เพ็ญพรรณี.png',
    'ภาณุวัฒน์': 'assets/img/techerpic/ภาณุวัฒน์.jpg'
};

function createTeacherAvatar(teacher, large = false) {
    const name = teacher?.name || '';
    const size = large ? 'width:80px;height:80px;font-size:28px;' : 'width:100%;height:100%;font-size:16px;';
    const cls  = 'teacher-avatar rounded-circle d-flex align-items-center justify-content-center fw-bold';

    // Find matching photo key
    let photoKey = null;
    for (const key of Object.keys(teacherPhotos)) {
        if (name.includes(key)) { photoKey = key; break; }
    }
    const photo = photoKey ? teacherPhotos[photoKey] : null;

    if (photo) {
        return `<img src="${photo}" class="${cls}" alt="${name}"
            style="${size}object-fit:cover;border-radius:50%;flex-shrink:0;"
            onerror="this.outerHTML='<div class=\\'${cls}\\' style=\\'${size}background:#0F0F0F;color:#fff;flex-shrink:0;\\'>${name.charAt(0) || '?'}</div>'">`; 
    }
    return `<div class="${cls}" style="${size}background:#0F0F0F;color:#fff;flex-shrink:0;">${name ? name.charAt(0) : '?'}</div>`;
}

function safeDate(value) {
    const n = normalizeDateString(value);
    return n ? new Date(n) : null;
}

function latestDateString(dateA, dateB) {
    const a = safeDate(dateA), b = safeDate(dateB);
    if (!a && !b) return null;
    if (!a) return b.toISOString().slice(0, 10);
    if (!b) return a.toISOString().slice(0, 10);
    return (a > b ? a : b).toISOString().slice(0, 10);
}
