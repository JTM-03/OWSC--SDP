import api from './axios';

export interface AdminStats {
    kpis: {
        revenue: number;
        activeBookings: number;
        pendingApprovals: number;
        lowStock: number;
    };
    revenueData: { day: string; revenue: number }[];
    lowStockItems: any[];
}

export interface PendingMembership {
    id: number;
    status: string;
    membershipType: string;
    membershipFee: number;
    member: {
        id: number;
        fullName: string;
        email: string;
        phone?: string;
        nic?: string;
        address?: string;
        emergencyContact?: string;
        emergencyPhone?: string;
        registrationDate: string;
        paymentSlipUrl?: string | null;
    };
    startDate: string;
}

export const adminAPI = {
    getStats: async (range: string = 'week'): Promise<AdminStats> => {
        const response = await api.get(`admin/stats?range=${range}`);
        return response.data;
    },

    getPendingMemberships: async (): Promise<PendingMembership[]> => {
        const response = await api.get('admin/pending-memberships');
        return response.data;
    },

    updateMembershipStatus: async (id: number, status: string): Promise<void> => {
        await api.put(`membership/${id}/status`, { status });
    },

    getAllBookings: async (): Promise<any[]> => {
        const response = await api.get('venues/bookings/all');
        return response.data;
    },

    updateBooking: async (id: number, data: any): Promise<any> => {
        const response = await api.put(`venues/bookings/${id}`, data);
        return response.data;
    }
};
