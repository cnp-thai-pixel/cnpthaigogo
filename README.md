# Thai Queue Pro v2.0 (Premium)
ระบบจัดการคิวออกงานและอบรมบุคลากร - กลุ่มสาระการเรียนรู้ภาษาไทย

## ✨ คุณสมบัติใหม่
- **Premium Design System**: ดีไซน์ใหม่ทันสมัยด้วย Glassmorphism และ Responsive Layout ที่ใช้งานได้ดีทั้งคอมพิวเตอร์และมือถือ
- **Modular Architecture**: แยกโครงสร้าง Code อย่างชัดเจน (CSS, JS, API) เพื่อง่ายต่อการพัฒนาต่อ
- **Smart Queueing**: ระบบคำนวณลำดับคิวอัตโนมัติอ้างอิงจากคะแนนภาระงานและความเป็นธรรม
- **Cloud Sync**: เชื่อมต่อข้อมูลแบบ Real-time กับ Google Firebase / Cloud Firestore

## 📂 โครงสร้างโฟลเดอร์
```text
/
├── assets/
│   ├── css/
│   │   └── style.css      # Custom Premium Styles
│   ├── js/
│   │   ├── api.js         # Firebase & Data Logic
│   │   ├── app.js         # Main Application Logic
│   │   ├── ui.js          # UI Rendering & Modals
│   │   └── utils.js       # Thai Date & Helpers
│   └── img/               # Assets Images
├── index.html             # Main Entry Point
└── README.md              # Documentation
```

## 🚀 การเริ่มต้นใช้งาน
1. อัปโหลดไฟล์ทั้งหมดขึ้นบน Web Hosting หรือ GitHub Pages
2. แก้ไขไฟล์ `assets/js/api.js` เพื่อกำหนดค่า Firebase Config ของคุณเอง (ถ้ามี)
3. หากใช้งานผ่าน Google Apps Script ให้ใช้เทคนิคการ Include ไฟล์ CSS/JS เข้ามาในหน้าหลัก

## 🛠 เทคโนโลยีที่ใช้
- **HTML5 / CSS3** (Vanilla with Glassmorphism)
- **Bootstrap 5** (Layout & Components)
- **Vanilla JavaScript** (State Management)
- **Firebase** (Real-time Database)
- **FontAwesome 6** (Icons)

---
พัฒนาโดยทีมงานเพื่อเพิ่มประสิทธิภาพการทำงานของบุคลากร
