/**
 * API & Data Synchronization Layer
 */

window.firebaseAppConfig = window.firebaseAppConfig || {
    apiKey: "AIzaSyDv--hw2BWKE-NTFrCMpTNz9LEzGK8l5PE",
    authDomain: "thaigogo-e9112.firebaseapp.com",
    databaseURL: "https://thaigogo-e9112-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "thaigogo-e9112",
    storageBucket: "thaigogo-e9112.firebasestorage.app",
    messagingSenderId: "820257616141",
    appId: "1:820257616141:web:c92cf50ae5e05491fb4044",
    measurementId: "G-4FX435MNDC"
};

window.firebaseReadyPromise = window.firebaseReadyPromise || new Promise((resolve, reject) => {
    window.__resolveFirebaseReady = resolve;
    window.__rejectFirebaseReady = reject;
});

window.notifyFirebaseReady = function (app, database, helpers) {
    window.firebaseApp = app;
    window.firebaseDatabase = database;
    if (helpers) {
        window.firebaseDbApi = helpers;
    }
    if (typeof window.__resolveFirebaseReady === 'function') {
        window.__resolveFirebaseReady({ app, database });
        window.__resolveFirebaseReady = null;
    }
};

async function firebaseFetch(path, options = {}) {
    if (!canUseDirectFirebase()) {
        throw new Error('Firebase database is not ready');
    }

    const helpers = window.firebaseDbApi;
    const method = (options.method || 'GET').toUpperCase();

    if (method === 'GET') {
        return helpers.get(path);
    }

    let payload = options.body;
    if (typeof payload === 'string') {
        try {
            payload = JSON.parse(payload);
        } catch (error) {
            console.warn('Unable to parse Firebase payload string, sending raw value.');
        }
    }

    if (method === 'PUT') return helpers.put(path, payload);
    if (method === 'PATCH') return helpers.patch(path, payload);

    throw new Error(`Unsupported Firebase method: ${method}`);
}

function canUseDirectFirebase() {
    return !!(window.firebaseDatabase && window.firebaseDbApi && typeof window.firebaseDbApi.get === 'function');
}

async function persistAllData() {
    if (!canUseDirectFirebase()) return Promise.resolve();

    const payload = {
        config: window.systemConfig,
        teachers: window.teachers,
        events: window.events,
        trainings: window.trainings,
        activityLog: window.activityLog
    };

    const tasks = Object.entries(payload).map(([key, value]) => 
        firebaseFetch(key, {
            method: 'PUT',
            body: JSON.stringify(value)
        })
    );

    try {
        await Promise.all(tasks);
        window.firebaseWriteErrorNotified = false;
    } catch (error) {
        console.error('Firebase Save Error:', error);
        if (typeof showFirebaseStatus === 'function') {
            showFirebaseStatus('warning', 'ไม่สามารถซิงค์ข้อมูลไปยังคลาวด์ได้ในขณะนี้', true);
        }
    }
}

async function fetchInitialDataDirect() {
    const keys = ['config', 'teachers', 'events', 'trainings', 'activityLog'];
    const results = await Promise.all(keys.map(key => firebaseFetch(key)));
    
    return {
        config: results[0] || {},
        teachers: normalizeFirebaseList(results[1]),
        events: normalizeFirebaseList(results[2]),
        trainings: normalizeFirebaseList(results[3]),
        activityLog: normalizeFirebaseList(results[4])
    };
}

function normalizeFirebaseList(value) {
    if (Array.isArray(value)) return value.filter(item => item !== null);
    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort((a, b) => {
                const numA = Number(a), numB = Number(b);
                return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : a.localeCompare(b);
            })
            .map(key => value[key]);
    }
    return [];
}
