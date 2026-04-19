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
    receiptUrl?: string;
    member?: {
        id: number;
        fullName: string;
        email: string;
    };
    booking?: {
        id: number;
        bookingDate: string;
        venue: {
            id: number;
            name: string;
        };
    };
    order?: {
        id: number;
        totalAmount: number;
    };
    membership?: {
        id: number;
        membershipType: string;
    };
}

export interface UploadReceiptPayload {
    amount: number;
    paymentMethod: string;
    receipt: File;
}

export interface PendingPaymentsResponse {
    membership: PaymentRecord[];
    booking: PaymentRecord[];
    order: PaymentRecord[];
    summary: {
        pendingMembership: number;
        pendingBooking: number;
        pendingOrder: number;
        total: number;
    };
}

export const paymentAPI = {
    /**
     * Get user's payments (all types)
     */
    getMyPayments: async (): Promise<{ membership: PaymentRecord[], booking: PaymentRecord[], order: PaymentRecord[] }> => {
        const response = await api.get('payments/my');
        return response.data;
    },

    /**
     * Upload membership payment receipt
     */
    uploadMembershipReceipt: async (membershipId: number, payload: UploadReceiptPayload): Promise<{ payment: PaymentRecord }> => {
        const formData = new FormData();
        formData.append('membershipId', membershipId.toString());
        formData.append('amount', payload.amount.toString());
        formData.append('paymentMethod', payload.paymentMethod);
        formData.append('receipt', payload.receipt);

        const response = await api.post('payments/upload/membership', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    /**
     * Upload booking payment receipt
     */
    uploadBookingReceipt: async (bookingId: number, payload: UploadReceiptPayload): Promise<{ payment: PaymentRecord }> => {
        const formData = new FormData();
        formData.append('bookingId', bookingId.toString());
        formData.append('amount', payload.amount.toString());
        formData.append('paymentMethod', payload.paymentMethod);
        formData.append('receipt', payload.receipt);

        const response = await api.post('payments/upload/booking', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    /**
     * Upload order payment receipt
     */
    uploadOrderReceipt: async (orderId: number, payload: UploadReceiptPayload): Promise<{ payment: PaymentRecord }> => {
        const formData = new FormData();
        formData.append('orderId', orderId.toString());
        formData.append('amount', payload.amount.toString());
        formData.append('paymentMethod', payload.paymentMethod);
        formData.append('receipt', payload.receipt);

        const response = await api.post('payments/upload/order', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    /**
     * Get all pending payment receipts (Admin only)
     */
    getPendingPayments: async (): Promise<PendingPaymentsResponse> => {
        const response = await api.get('payments/pending');
        return response.data;
    },

    /**
     * Verify and approve/reject a payment receipt (Admin only)
     */
    verifyPayment: async (type: 'membership' | 'booking' | 'order', paymentId: number, approved: boolean, reason?: string): Promise<{ payment: PaymentRecord }> => {
        const response = await api.post(`payments/verify/${type}/${paymentId}`, {
            approved,
            reason
        });
        return response.data;
    }
};

