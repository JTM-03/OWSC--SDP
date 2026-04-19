import api from './axios';

export interface CalendarEvent {
    id: number;
    title: string;
    start: string;
    end: string;
    bookingId: number;
    venueId: number;
    venueName: string;
    memberName: string;
    memberEmail: string;
    memberPhone: string;
    timeSlot: string;
    bookingStatus: string;
    paymentStatus: string;
    paymentAmount: number;
    paymentMethod: string;
    receiptUrl: string | null;
    backgroundColor: string;
}

export const bookingCalendarAPI = {
    getCalendarEvents: async (startDate: string, endDate: string, venueId?: number): Promise<CalendarEvent[]> => {
        const params: any = { startDate, endDate };
        if (venueId) params.venueId = venueId;
        const response = await api.get('venues/bookings/calendar', { params });
        return response.data;
    },

    cancelBooking: async (bookingId: number, reason: string): Promise<any> => {
        const response = await api.put(`venues/bookings/${bookingId}/admin-cancel`, { reason });
        return response.data;
    }
};
