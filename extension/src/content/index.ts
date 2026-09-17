/**
 * Isolated, Safe Content Script for MediFlow LIS Extension
 * Listens for user text selections passively. Never injects unsolicited intrusive UI.
 */

import { detectMedicalIdentifiers } from './scanner';
import { sendRuntimeMessage } from '../services/messaging/messagePassing';

let lastSelectedValue: string | null = null;

function handleSelectionChange() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;

  const text = selection.toString().trim();
  if (!text || text === lastSelectedValue) return;

  const detected = detectMedicalIdentifiers(text);
  if (detected) {
    lastSelectedValue = text;
    // Notify extension of detected clinical identifier
    sendRuntimeMessage('PAGE_CONTEXT_DETECTED', detected).catch(() => {});
  }
}

// Attach debounced selection listener
let selectionTimer: any = null;
document.addEventListener('selectionchange', () => {
  clearTimeout(selectionTimer);
  selectionTimer = setTimeout(handleSelectionChange, 300);
});

// Clean up listeners on page unload
window.addEventListener('beforeunload', () => {
  clearTimeout(selectionTimer);
  lastSelectedValue = null;
});

// Runtime message listener for content script
if (typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.messageType === 'EXTRACT_SELECTION') {
      const selection = window.getSelection()?.toString().trim() || '';
      sendResponse({
        success: true,
        requestId: message.requestId,
        data: {
          selection,
          detected: detectMedicalIdentifiers(selection)
        },
        timestamp: Date.now()
      });
      return true;
    }
    return false;
  });
}
