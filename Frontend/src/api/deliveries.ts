import api from './axios';

export interface DeliveryItem {
    id: number;
    productId: number;
    quantity: number;
    product: {
        productName: string;
        unit: string;
    };
}

export interface Delivery {
    id: number;
    supplierId: number;
    deliveryDate: string;
    deliveryStatus: string;
    supplier: {
        name: string;
        email: string;
    };
    deliveryItems: DeliveryItem[];
}

export const deliveryAPI = {
    getAll: async () => {
        const response = await api.get('/deliveries');
        return response.data;
    },

    create: async (data: { supplierId: number; items: { productId: number; quantity: number }[] }) => {
        const response = await api.post('/deliveries', data);
        return response.data;
    },

    updateStatus: async (id: number, status: string) => {
        const response = await api.put(`/deliveries/${id}/status`, { status });
        return response.data;
    }
};
