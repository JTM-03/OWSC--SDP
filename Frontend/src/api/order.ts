import api from './axios';
import { MenuItem } from './menu';

export interface OrderItem {
    id: number;
    orderId: number;
    menuItemId: number;
    quantity: number;
    unitPrice: number;
    menuItem?: MenuItem;
}

export interface Order {
    id: number;
    memberId: number;
    orderType: 'Dine-in' | 'Takeaway';
    orderDate: string;
    orderStatus: string;
    totalAmount: number;
    orderItems?: OrderItem[];
}

export const orderAPI = {
    createOrder: async (data: { orderType: string; items: { menuItemId: number; quantity: number }[] }): Promise<{ message: string; order: Order }> => {
        const response = await api.post('orders', data);
        return response.data;
    },

    getMyOrders: async (): Promise<Order[]> => {
        const response = await api.get('orders/my');
        return response.data;
    },

    getAllOrders: async (): Promise<Order[]> => {
        const response = await api.get('orders');
        return response.data;
    },

    updateStatus: async (id: number, status: string): Promise<Order> => {
        const response = await api.put(`orders/${id}/status`, { status });
        return response.data;
    }
};
