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
    membershipType?: string; // actual DB column name
    type?: string;           // alias added by backend for frontend compatibility
    payments?: {
        id: number;
        amount: number;
        paymentMethod: string;
        paymentStatus: string;
        paymentDate: string;
        receiptUrl?: string | null;
    }[];
}

export interface Member {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    nic?: string;
    address?: string;
    paymentSlipUrl?: string | null;
    emergencyContact?: string;
    emergencyPhone?: string;
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
        const data = response.data;
        // FIX: safely unwrap in case backend returns a wrapped object
        if (Array.isArray(data))           return data;
        if (Array.isArray(data?.requests)) return data.requests;
        if (Array.isArray(data?.data))     return data.data;
        console.error('Unexpected /membership/upgrade-requests response shape:', data);
        return [];
    },

    updateRequestStatus: async (requestId: number, status: 'Approved' | 'Rejected') => {
        const response = await api.put(`membership/upgrade-requests/${requestId}/approve`, { status });
        return response.data;
    },

    // FIX: was returning response.data directly — if the backend 404s or returns
    // an error/wrapped object, members.filter() in MembershipManagement.tsx crashes.
    // Now safely unwraps any response shape and always returns an array.
    getAdminMembers: async (): Promise<Member[]> => {
        const response = await api.get('admin/members');
        const data = response.data;
        if (Array.isArray(data))           return data;
        if (Array.isArray(data?.members))  return data.members;
        if (Array.isArray(data?.data))     return data.data;
        console.error('Unexpected /admin/members response shape:', data);
        return [];
    }
};