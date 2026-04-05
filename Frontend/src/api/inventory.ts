import api from './axios';

export interface InventoryItem {
    id: number;
    productId: number;
    currentQuantity: number;
    reorderLevel: number;
    product: {
        id: number;
        productName: string;
        category: string;
        unit: string;
    };
}


export const inventoryAPI = {
    getAll: async (): Promise<InventoryItem[]> => {
        const response = await api.get('inventory');
        return response.data;
    },

    createProduct: async (data: {
        productName: string;
        category: string;
        unit: string;
        reorderLevel: number;
        initialQuantity: number;
    }): Promise<any> => {
        const response = await api.post('inventory/product', data);
        return response.data;
    },

    getDeliveries: async (): Promise<any[]> => {
        const response = await api.get('inventory/deliveries');
        return response.data;
    },

    recordDelivery: async (data: { productId: number; quantity: number; supplierId: number }): Promise<any> => {
        const response = await api.post('inventory/delivery', data);
        return response.data;
    },

    returnItem: async (data: {
        productId: number;
        supplierId: number;
        quantity: number;
        reason: string;
    }): Promise<any> => {
        const response = await api.post('inventory/return', data);
        return response.data;
    },

    getReturns: async (): Promise<any[]> => {
        const response = await api.get('inventory/returns');
        return response.data;
    }
};

