import api from './axios';

export interface Notification {
    id: string | number;
    type: 'alert' | 'info' | 'promotion' | 'reminder';
    title: string;
    message: string;
    link?: string;
    createdAt: string;
    read?: boolean;
}

export const notificationsAPI = {
    getNotifications: async (): Promise<Notification[]> => {
        const response = await api.get('notifications');
        return response.data;
    }
};
