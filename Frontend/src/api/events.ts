import api from './axios';

export interface Event {
    id: number;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    imageUrl?: string;
    status: 'Upcoming' | 'Completed' | 'Cancelled';
    ticketPrice?: number;
    createdDate?: string;
    category?: string;
    totalTickets?: number;
}

export const eventsAPI = {
    getAllEvents: async (): Promise<Event[]> => {
        const response = await api.get('events');
        return response.data;
    },

    createEvent: async (data: Omit<Event, 'id' | 'createdDate'>): Promise<Event> => {
        const response = await api.post('events', data);
        return response.data;
    },

    updateEvent: async (id: number, data: Omit<Event, 'id' | 'createdDate'>): Promise<Event> => {
        const response = await api.put(`events/${id}`, data);
        return response.data;
    },

    deleteEvent: async (id: number): Promise<void> => {
        await api.delete(`events/${id}`);
    }
};
