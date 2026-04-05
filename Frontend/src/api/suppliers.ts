import api from './axios';

export interface Supplier {
    id: number;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    items?: string[];
}

export const supplierAPI = {
    getAll: async (): Promise<Supplier[]> => {
        const response = await api.get('suppliers');
        return response.data;
    },

    create: async (data: Omit<Supplier, 'id'>): Promise<Supplier> => {
        const response = await api.post('suppliers', data);
        return response.data.supplier;
    },

    update: async (id: number, data: Partial<Supplier>): Promise<Supplier> => {
        const response = await api.put(`suppliers/${id}`, data);
        return response.data.supplier;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`suppliers/${id}`);
    }
};
