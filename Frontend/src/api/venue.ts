import api from './axios';

export interface Venue {
    id: number;
    name: string;
    capacity: number;
    facilities?: string;
    atmosphere?: string;
    description?: string;
    imageUrl?: string;
    charge: number;
    pricingUnit?: string;
}

export interface Booking {
    id: number;
    memberId: number;
    venueId: number;
    bookingDate: string;
    timeSlot: string;
    bookingStatus: string;
    venue?: Venue;
}

export const venueAPI = {
    getAllVenues: async (): Promise<Venue[]> => {
        const response = await api.get('venues');
        return response.data;
    },

    searchVenues: async (params: { date: string; startTime: string; endTime: string; capacity?: string; occasion?: string; venueType?: string }): Promise<Venue[]> => {
        const response = await api.get('venues/search', { params });
        return response.data;
    },

    getVenueById: async (id: number): Promise<Venue> => {
        const response = await api.get(`venues/${id}`);
        return response.data;
    },

    createBooking: async (data: FormData): Promise<{ message: string; booking: Booking }> => {
        const response = await api.post('venues/bookings', data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    getMyBookings: async (): Promise<Booking[]> => {
        const response = await api.get('venues/bookings/my');
        return response.data;
    },

    cancelBookingWithReason: async (id: number, reason: string): Promise<void> => {
        await api.put(`venues/bookings/${id}/cancel`, { reason });
    }
};
