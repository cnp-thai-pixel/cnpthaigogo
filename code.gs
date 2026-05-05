// =========================
// File: Code.gs  (Apps Script)
// =========================
const APP_TITLE = 'ระบบจัดการออกงานครู';

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle(APP_TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function ping() {
  return { ok: true, time: new Date().toISOString() };
}