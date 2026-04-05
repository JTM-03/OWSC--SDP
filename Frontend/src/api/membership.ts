import api from './axios';

export interface MembershipPlan {
    id: string;
    name: string;
    price: number;
    durationMonths?: number;
    description: string;
}

export interface Membership {
    id: number;
    memberId: number;
    startDate: string;
    endDate: string;
    status: string;
    membershipFee: number;
    type?: string; // Added type
}

export interface Member {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    status: string;
    role: string;
    registrationDate: string;
    memberships: Membership[];
}

export interface UpgradeRequest {
    id: number;
    memberId: number;
    oldPlanId: string;
    newPlanId: string;
    status: string;
    requestDate: string;
    reason?: string;
    member?: {
        fullName: string;
        email: string;
    };
}

export const membershipAPI = {
    getPlans: async (): Promise<MembershipPlan[]> => {
        const response = await api.get('membership/plans');
        return response.data;
    },

    register: async (planId: string) => {
        const response = await api.post('membership/register', { planId });
        return response.data;
    },

    getMy: async (): Promise<Membership> => {
        const response = await api.get('membership/my');
        return response.data;
    },

    getAll: async (): Promise<Membership[]> => {
        const response = await api.get('membership/all');
        return response.data;
    },

    updateStatus: async (id: number, status: string) => {
        const response = await api.put(`membership/${id}/status`, { status });
        return response.data;
    },

    requestUpgrade: async (newPlanId: string, reason?: string) => {
        const response = await api.post('membership/upgrade-request', { newPlanId, reason });
        return response.data;
    },

    getAllRequests: async (): Promise<UpgradeRequest[]> => {
        const response = await api.get('membership/upgrade-requests');
        return response.data;
    },

    updateRequestStatus: async (requestId: number, status: 'Approved' | 'Rejected') => {
        const response = await api.put(`membership/upgrade-requests/${requestId}/approve`, { status });
        return response.data;
    },

    getAdminMembers: async (): Promise<Member[]> => {
        const response = await api.get('admin/members');
        return response.data;
    }
};
