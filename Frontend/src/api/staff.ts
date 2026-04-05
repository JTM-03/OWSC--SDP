import api from './axios';
import { User } from './auth';

export interface StaffMember extends User {
    registrationDate: string;
}

export const staffAPI = {
    getAll: async (): Promise<StaffMember[]> => {
        const response = await api.get('staff');
        return response.data;
    },

    updateRole: async (id: number, role: string): Promise<any> => {
        const response = await api.put(`staff/${id}/role`, { role });
        return response.data;
    },

    assign: async (data: { staffId: number; venueId: number; shift: string }): Promise<any> => {
        const response = await api.post('staff/assign', data);
        return response.data;
    }
};
