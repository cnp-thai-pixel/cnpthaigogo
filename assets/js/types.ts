export interface Teacher {
    teacherId: number;
    name: string;
    position?: string;
    dutyQueueScore: number;
    trainingQueueScore: number;
    queueScore: number; // Primary sort score
    lastDutyDate?: string | null;
    lastTrainingDate?: string | null;
    lastEventDate?: string | null;
    totalDuties: number;
    dutyDuties: number;
    trainingDuties: number;
    swapCount: number;
    dutySwapCount: number;
    trainingSwapCount: number;
}

export interface AssignmentSlot {
    originalTeacherId: number;
    currentTeacherId: number;
    substituteTeacherId?: number | null;
    substitutionType: 'none' | 'replacement' | 'swap';
}

export interface EventItem {
    eventId: number;
    eventName: string;
    details?: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    requiredQuota: number;
    assignedTeachers: number[];
    assignmentSlots: AssignmentSlot[];
    status: 'pending' | 'assigned' | 'completed';
}

export interface TrainingItem {
    trainingId: number;
    trainingName: string;
    details?: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    location: string;
    requiredQuota: number;
    assignedTeachers: number[];
    assignmentSlots: AssignmentSlot[];
    status: 'pending' | 'assigned' | 'completed';
}

export interface ActivityLog {
    id: number;
    type: 'auto-assign' | 'manual-edit' | 'substitution' | 'recalculate';
    description: string;
    details: string;
    timestamp: string;
    admin: string;
    teacherId?: number;
}

export interface SystemConfig {
    system_title: string;
    school_name: string;
}
