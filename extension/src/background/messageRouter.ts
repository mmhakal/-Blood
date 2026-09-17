/**
 * Background Service Worker Message Router
 * Routes incoming typed messages to appropriate services safely.
 */

import { ExtensionMessage, ExtensionMessageResponse } from '../services/messaging/types';
import { validateMessage } from '../services/messaging/messagePassing';
import { authService } from '../services/auth/authService';
import { searchService } from '../services/search/searchService';
import { notificationService } from '../services/notifications/notificationService';
import { featureFlagService } from '../services/featureFlags/featureFlagService';
import logger from '../services/logging/logger';

export async function handleIncomingMessage(
  message: any,
  sender: chrome.runtime.MessageSender
): Promise<ExtensionMessageResponse> {
  if (!validateMessage(message)) {
    return {
      success: false,
      requestId: message?.requestId || 'unknown',
      error: 'Malformed or invalid message envelope',
      timestamp: Date.now()
    };
  }

  logger.debug(`[ServiceWorker Msg] ${message.messageType}`, { senderId: sender.id, requestId: message.requestId });

  try {
    switch (message.messageType) {
      case 'GET_AUTH_STATUS': {
        const session = await authService.getSession();
        return {
          success: true,
          requestId: message.requestId,
          data: {
            isAuthenticated: Boolean(session && Date.now() < session.expiresAt),
            session
          },
          timestamp: Date.now()
        };
      }

      case 'LOGIN': {
        const { email, password } = message.payload || {};
        const session = await authService.login(email, password);
        await notificationService.getUnreadCount();
        return {
          success: true,
          requestId: message.requestId,
          data: session,
          timestamp: Date.now()
        };
      }

      case 'LOGOUT': {
        await authService.logout();
        notificationService.updateExtensionBadge(0);
        return {
          success: true,
          requestId: message.requestId,
          timestamp: Date.now()
        };
      }

      case 'REFRESH_SESSION': {
        const session = await authService.refreshSession();
        return {
          success: Boolean(session),
          requestId: message.requestId,
          data: session,
          timestamp: Date.now()
        };
      }

      case 'SWITCH_BRANCH': {
        const { branchId, branchName } = message.payload || {};
        const session = await authService.switchBranch(branchId, branchName);
        return {
          success: Boolean(session),
          requestId: message.requestId,
          data: session,
          timestamp: Date.now()
        };
      }

      case 'SEARCH_GLOBAL': {
        const { query, filter } = message.payload || {};
        const results = await searchService.search(query, filter);
        return {
          success: true,
          requestId: message.requestId,
          data: results,
          timestamp: Date.now()
        };
      }

      case 'GET_NOTIFICATIONS': {
        const { unreadOnly, limit } = message.payload || {};
        const list = await notificationService.getNotifications(unreadOnly, limit);
        return {
          success: true,
          requestId: message.requestId,
          data: list,
          timestamp: Date.now()
        };
      }

      case 'MARK_NOTIFICATION_READ': {
        const { id } = message.payload || {};
        await notificationService.markAsRead(id);
        return {
          success: true,
          requestId: message.requestId,
          timestamp: Date.now()
        };
      }

      case 'GET_FEATURE_FLAGS': {
        await featureFlagService.restoreFromCache();
        return {
          success: true,
          requestId: message.requestId,
          data: {
            'extension.enabled': featureFlagService.isEnabled('extension.enabled'),
            'sidepanel.enabled': featureFlagService.isEnabled('sidepanel.enabled'),
            'ai.enabled': featureFlagService.isEnabled('ai.enabled'),
            'advanced-search.enabled': featureFlagService.isEnabled('advanced-search.enabled')
          },
          timestamp: Date.now()
        };
      }

      case 'OPEN_SIDE_PANEL': {
        if (typeof chrome !== 'undefined' && chrome?.sidePanel?.open && sender.tab?.id) {
          await chrome.sidePanel.open({ tabId: sender.tab.id });
        }
        return {
          success: true,
          requestId: message.requestId,
          timestamp: Date.now()
        };
      }

      case 'PING': {
        return {
          success: true,
          requestId: message.requestId,
          data: { status: 'alive', version: '1.0.0' },
          timestamp: Date.now()
        };
      }

      default:
        return {
          success: false,
          requestId: message.requestId,
          error: `Unhandled message type: ${message.messageType}`,
          timestamp: Date.now()
        };
    }
  } catch (err: any) {
    logger.error(`[ServiceWorker Error in ${message.messageType}]`, err);
    return {
      success: false,
      requestId: message.requestId,
      error: err?.userMessage || err?.message || 'Internal service worker error',
      timestamp: Date.now()
    };
  }
}
