import api from './axios';

export interface MenuItem {
    id: number;
    name: string;
    category: string;
    price: number;
    description?: string;
    imageUrl?: string;
    isPopular?: boolean;
    availabilityStatus: string;
}

export const menuAPI = {
    getAllItems: async (): Promise<MenuItem[]> => {
        const response = await api.get('menu');
        return response.data;
    },

    getItemById: async (id: number): Promise<MenuItem> => {
        const response = await api.get(`menu/${id}`);
        return response.data;
    },

    addItem: async (data: Omit<MenuItem, 'id'> | FormData): Promise<{ message: string; menuItem: MenuItem }> => {
        const response = await api.post('menu', data);
        return response.data;
    },

    updateItem: async (id: number, data: Partial<MenuItem> | FormData): Promise<{ message: string; menuItem: MenuItem }> => {
        const response = await api.put(`menu/${id}`, data);
        return response.data;
    },

    deleteItem: async (id: number): Promise<{ message: string }> => {
        const response = await api.delete(`menu/${id}`);
        return response.data;
    }
};
