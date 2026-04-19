import api from './axios';

export interface InventoryItem {
    id: number;
    productId: number;
    currentQuantity: number;
    reorderLevel: number;
    lastUpdated?: string;
    product: {
        id: number;
        productName: string;
        category: string;
        unit: string;
        description?: string;
        unitCost?: number;  // derived from latest delivery item price
    };
}


export const inventoryAPI = {
    getAll: async (): Promise<InventoryItem[]> => {
        const response = await api.get('inventory');
        const data = response.data;
        const raw: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        // Prisma Decimal fields come back as strings over JSON — coerce to number
        return raw.map(item => ({
            ...item,
            currentQuantity: parseFloat(item.currentQuantity ?? 0),
            reorderLevel:    parseFloat(item.reorderLevel    ?? 0),
        }));
    },

    createProduct: async (data: {
        productName: string;
        category: string;
        unit: string;
        reorderLevel: number;
        initialQuantity: number;
        supplierId?: number;
    }): Promise<any> => {
        const response = await api.post('inventory/product', data);
        return response.data;
    },

    getDeliveries: async (): Promise<any[]> => {
        const response = await api.get('inventory/deliveries');
        const data = response.data;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    },

    updateStock: async (data: { productId: number; quantity: number; supplierId?: number; type: 'delivery' | 'used'; reason?: string }): Promise<any> => {
        const response = await api.post('inventory/update', data);
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
        const data = response.data;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }
};

