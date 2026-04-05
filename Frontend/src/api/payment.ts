import api from './axios';

export interface PaymentRecord {
    id: number;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    paymentStatus: string;
    bookingId?: number;
    membershipId?: number;
    orderId?: number;
}

export const paymentAPI = {
    getMyPayments: async (): Promise<{ membership: PaymentRecord[], booking: PaymentRecord[], order: PaymentRecord[] }> => {
        const response = await api.get('payments/my');
        return response.data;
    }
};
