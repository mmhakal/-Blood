/**
 * Manifest V3 Background Service Worker for MediFlow LIS Extension
 * Lightweight, stateless, self-recovering upon suspension/restart.
 */

import { handleIncomingMessage } from './messageRouter';
import { checkAndRunStorageMigrations } from '../services/storage/storageMigration';
import { notificationService } from '../services/notifications/notificationService';
import { authService } from '../services/auth/authService';
import telemetry from '../services/logging/telemetry';
import logger from '../services/logging/logger';

const ALARM_REFRESH_TOKEN = 'mediflow_alarm_token_refresh';
const ALARM_SYNC_NOTIFICATIONS = 'mediflow_alarm_sync_notifications';

// --- LIFECYCLE LISTENERS ---
chrome.runtime.onInstalled.addListener(async (details) => {
  logger.info('[ServiceWorker] Extension installed / updated', details.reason);
  await checkAndRunStorageMigrations();

  if (details.reason === 'install') {
    await telemetry.track('extension_installed');
  } else if (details.reason === 'update') {
    await telemetry.track('extension_updated', { previousVersion: details.previousVersion });
  }

  // Set up periodic alarms
  chrome.alarms.create(ALARM_REFRESH_TOKEN, { periodInMinutes: 45 });
  chrome.alarms.create(ALARM_SYNC_NOTIFICATIONS, { periodInMinutes: 2 });

  // Set up Context Menus
  chrome.contextMenus.create({
    id: 'mediflow_search_selection',
    title: 'Search "%s" in MediFlow LIS',
    contexts: ['selection']
  });

  // Enable Side Panel behavior where supported
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }

  // Initial sync
  await notificationService.getUnreadCount();
});

chrome.runtime.onStartup.addListener(async () => {
  logger.info('[ServiceWorker] Browser startup. Re-initializing background state...');
  await checkAndRunStorageMigrations();
  await notificationService.getUnreadCount();
});

// --- ALARM HANDLER ---
chrome.alarms.onAlarm.addListener(async (alarm) => {
  logger.debug(`[ServiceWorker Alarm] ${alarm.name}`);

  if (alarm.name === ALARM_REFRESH_TOKEN) {
    const isAuthed = await authService.isAuthenticated();
    if (isAuthed) {
      await authService.refreshSession();
    }
  } else if (alarm.name === ALARM_SYNC_NOTIFICATIONS) {
    const isAuthed = await authService.isAuthenticated();
    if (isAuthed) {
      await notificationService.getUnreadCount();
    }
  }
});

// --- CONTEXT MENU CLICK HANDLER ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'mediflow_search_selection' && info.selectionText) {
    const query = info.selectionText.trim();
    if (tab?.id && chrome.sidePanel?.open) {
      await chrome.sidePanel.open({ tabId: tab.id });
      // Notify content / side panel of the search trigger
      chrome.runtime.sendMessage({
        messageType: 'SEARCH_GLOBAL',
        requestId: `ctx-${Date.now()}`,
        payload: { query },
        timestamp: Date.now()
      });
    }
  }
});

// --- RUNTIME MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleIncomingMessage(message, sender)
    .then((response) => sendResponse(response))
    .catch((err) => {
      sendResponse({
        success: false,
        requestId: message?.requestId || 'unknown',
        error: err?.message || 'Service worker exception',
        timestamp: Date.now()
      });
    });

  // Return true to keep the message channel open for async response
  return true;
});
