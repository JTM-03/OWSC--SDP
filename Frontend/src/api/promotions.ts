import api from './axios';

export interface Promotion {
    id: number;
    title: string;
    description: string;
    validUntil: string;
    isActive: boolean;
    createdDate: string;
}

export const promotionsAPI = {
    getAll: async (): Promise<Promotion[]> => {
        const response = await api.get('promotions');
        const data = response.data;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    },

    create: async (data: Omit<Promotion, 'id' | 'createdDate'>): Promise<Promotion> => {
        const response = await api.post('promotions', data);
        return response.data;
    },

    update: async (id: number, data: Partial<Omit<Promotion, 'id' | 'createdDate'>>): Promise<Promotion> => {
        const response = await api.put(`promotions/${id}`, data);
        return response.data;
    },
    
    delete: async (id: number): Promise<void> => {
        await api.delete(`promotions/${id}`);
    }
};
