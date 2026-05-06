/**
 * Global Type Definitions for Thai Queue Pro
 * This file is for IDE support and does not affect runtime.
 */

interface Window {
    // Firebase & Data
    firebaseAppConfig: any;
    firebaseReadyPromise: Promise<any>;
    __resolveFirebaseReady: ((value: any) => void) | null;
    __rejectFirebaseReady: ((reason?: any) => void) | null;
    notifyFirebaseReady: (app: any, database: any, helpers: any) => void;
    firebaseApp: any;
    firebaseDatabase: any;
    firebaseDbApi: any;
    
    // Application State
    systemConfig: { system_title: string; school_name: string };
    teachers: any[];
    events: any[];
    trainings: any[];
    activityLog: any[];
    dataInitialized: boolean;
    isAdmin: boolean;
    firebaseWriteErrorNotified: boolean;

    // Global UI Functions
    showView: (view: string) => void;
    renderDashboard: () => void;
    updateHeader: () => void;
    toggleSidebar: () => void;
    closeSidebar: () => void;
    showTeacherDetail: (id: number) => void;
    openAutoAssignModal: (id: number, type: string) => void;
    openSubstitutionModal: (id: number, type: string) => void;
    openEventModal: (id?: number) => void;
    openTrainingModal: (id?: number) => void;
    openTeacherModal: (id?: number) => void;
    editItem: (id: number, type: string) => void;
    deleteItem: (id: number, type: string) => void;
    editTeacher: (id: number) => void;
    reconcileScores: () => void;
    toggleAdmin: () => void;
    showFirebaseStatus: (type: string, message: string, sticky?: boolean) => void;
}

// Logic Helpers (Global scope)
declare function getTeacherById(id: number): any;
declare function getTeacherQueueScore(teacher: any, type: string): number;
declare function getTeacherCombinedScore(teacher: any): number;
declare function sortTeachers(teachers: any[], type?: string): any[];
declare function getNextQueueTeachers(limit: number, type: string): any[];
declare function getEventAssignmentSlots(event: any): any[];

// UI Helpers (Global scope)
declare function getItemName(item: any): string;
declare function getItemId(item: any): number | null;
declare function setText(id: string, val: any): void;
declare function formatDateThai(date: any): string;
declare function createTeacherAvatar(teacher: any, large?: boolean): string;
declare function persistAllData(): Promise<void>;
declare function fetchInitialDataDirect(): Promise<any>;
declare function canUseDirectFirebase(): boolean;
declare function normalizeFirebaseList(value: any): any[];
