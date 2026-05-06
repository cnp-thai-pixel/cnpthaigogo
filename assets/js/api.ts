/**
 * API & Data Synchronization Layer
 */

export { }; // Mark as module to allow global augmentation

declare global {
    interface Window {
        firebaseAppConfig: any;
        firebaseReadyPromise: Promise<any>;
        __resolveFirebaseReady: ((value: any) => void) | null;
        __rejectFirebaseReady: ((reason?: any) => void) | null;
        notifyFirebaseReady: (app: any, database: any, helpers: any) => void;
        firebaseApp: any;
        firebaseDatabase: any;
        firebaseDbApi: any;
        systemConfig: any;
        teachers: any[];
        events: any[];
        trainings: any[];
        activityLog: any[];
        firebaseWriteErrorNotified: boolean;
        showFirebaseStatus: (type: string, message: string, sticky?: boolean) => void;
    }
}

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

window.notifyFirebaseReady = function (app: any, database: any, helpers: any) {
    window.firebaseApp = app;
    window.firebaseDatabase = database;
    if (helpers) {
        window.firebaseDbApi = helpers;
    }
    if (typeof window.__resolveFirebaseReady === 'function') {
        window.__resolveFirebaseReady!({ app, database });
        window.__resolveFirebaseReady = null;
    }
};

/**
 * @param {string} path 
 * @param {any} [options] 
 * @returns {Promise<any>}
 */
async function firebaseFetch(path: string, options: any = {}) {
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

/**
 * @returns {boolean}
 */
function canUseDirectFirebase(): boolean {
    return !!(window.firebaseDatabase && window.firebaseDbApi && typeof window.firebaseDbApi.get === 'function');
}

/**
 * @returns {Promise<void>}
 */
async function persistAllData(): Promise<void> {
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
        if (typeof window.showFirebaseStatus === 'function') {
            window.showFirebaseStatus('warning', 'ไม่สามารถซิงค์ข้อมูลไปยังคลาวด์ได้ในขณะนี้', true);
        }
    }
}

/**
 * @returns {Promise<any>}
 */
async function fetchInitialDataDirect(): Promise<any> {
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

/**
 * @param {any} value 
 * @returns {any[]}
 */
function normalizeFirebaseList(value: any): any[] {
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
