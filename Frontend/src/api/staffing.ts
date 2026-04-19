import api from './axios';

export interface VenueAssignment {
    id: number;
    venueId: number;
    staffId: number;
    staffName: string;
    staffRole: string; // This is the role for the assignment (e.g. "Service")
    eventName: string;
    eventDate: string; // ISO String
    startTime: string;
    endTime: string;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

export interface CreateAssignmentData {
    venueId: number;
    staffId: number;
    assignmentDate: string;
    startTime: string;
    endTime: string;
    eventName?: string;
    role?: string;
}

export interface UpdateAssignmentData {
    venueId?: number;
    staffId?: number;
    assignmentDate?: string;
    startTime?: string;
    endTime?: string;
    eventName?: string;
    role?: string;
    status?: string;
}

export interface BusyStaffInfo {
    eventName: string;
    venueName: string;
    startTime: string;
    endTime: string;
}

export const staffingAPI = {
    getByVenue: async (venueId: number): Promise<VenueAssignment[]> => {
        const response = await api.get(`staffing/venue/${venueId}`);
        const data = response.data;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    },

    create: async (data: CreateAssignmentData): Promise<{ message: string; assignment: any }> => {
        const response = await api.post('staffing', data);
        return response.data;
    },

    update: async (id: number, data: UpdateAssignmentData): Promise<{ message: string; assignment: any }> => {
        const response = await api.put(`staffing/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<{ message: string }> => {
        const response = await api.delete(`staffing/${id}`);
        return response.data;
    },

    checkAvailability: async (date: string, startTime: string, endTime: string): Promise<Record<string, BusyStaffInfo>> => {
        const response = await api.get(`staffing/check-availability?date=${date}&startTime=${startTime}&endTime=${endTime}`);
        return response.data.busyStaff;
    }
};
