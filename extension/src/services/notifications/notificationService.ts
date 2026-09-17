/**
 * Notification Center & Extension Badge Synchronizer
 */

import apiClient from '../api/apiClient';
import { ExtensionNotification } from '../../types';
import logger from '../logging/logger';

class NotificationService {
  public async getNotifications(unreadOnly: boolean = false, limit: number = 25): Promise<ExtensionNotification[]> {
    try {
      const notifications = await apiClient.get<ExtensionNotification[]>(
        `/notifications?unread=${unreadOnly}&limit=${limit}`
      );
      return Array.isArray(notifications) ? notifications : [];
    } catch (err) {
      logger.error('Failed to fetch notifications', err);
      return [];
    }
  }

  public async getUnreadCount(): Promise<number> {
    try {
      const res = await apiClient.get<{ count: number }>('/notifications/unread-count');
      const count = res?.count || 0;
      this.updateExtensionBadge(count);
      return count;
    } catch (err) {
      logger.warn('Failed to fetch unread notification count', err);
      return 0;
    }
  }

  public async markAsRead(notificationId: string): Promise<void> {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
      await this.getUnreadCount();
    } catch (err) {
      logger.error(`Failed to mark notification ${notificationId} as read`, err);
    }
  }

  public updateExtensionBadge(unreadCount: number): void {
    if (typeof chrome !== 'undefined' && chrome?.action?.setBadgeText) {
      const text = unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : '';
      chrome.action.setBadgeText({ text });
      chrome.action.setBadgeBackgroundColor({
        color: unreadCount > 0 ? '#ef4444' : '#0ea5e9'
      });
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
