/**
 * Typed Message Dispatcher & Validator
 */

import { ExtensionMessage, ExtensionMessageType, ExtensionMessageResponse } from './types';

export function createMessage<T = any>(
  messageType: ExtensionMessageType,
  payload: T
): ExtensionMessage<T> {
  return {
    messageType,
    requestId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    payload,
    timestamp: Date.now()
  };
}

export function validateMessage(msg: any): msg is ExtensionMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    typeof msg.messageType === 'string' &&
    typeof msg.requestId === 'string' &&
    typeof msg.timestamp === 'number'
  );
}

export async function sendRuntimeMessage<TPayload = any, TResponse = any>(
  type: ExtensionMessageType,
  payload: TPayload
): Promise<ExtensionMessageResponse<TResponse>> {
  const message = createMessage(type, payload);

  if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response: ExtensionMessageResponse<TResponse>) => {
        if (chrome.runtime?.lastError) {
          resolve({
            success: false,
            requestId: message.requestId,
            error: chrome.runtime.lastError.message,
            timestamp: Date.now()
          });
        } else {
          resolve(response || {
            success: true,
            requestId: message.requestId,
            timestamp: Date.now()
          });
        }
      });
    });
  }

  // Fallback for mock environments / tests
  return {
    success: true,
    requestId: message.requestId,
    data: undefined as any,
    timestamp: Date.now()
  };
}

export async function sendTabMessage<TPayload = any, TResponse = any>(
  tabId: number,
  type: ExtensionMessageType,
  payload: TPayload
): Promise<ExtensionMessageResponse<TResponse>> {
  const message = createMessage(type, payload);

  if (typeof chrome !== 'undefined' && chrome?.tabs?.sendMessage) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response: ExtensionMessageResponse<TResponse>) => {
        if (chrome.runtime?.lastError) {
          resolve({
            success: false,
            requestId: message.requestId,
            error: chrome.runtime.lastError.message,
            timestamp: Date.now()
          });
        } else {
          resolve(response);
        }
      });
    });
  }

  return {
    success: false,
    requestId: message.requestId,
    error: 'Tab messaging not supported in current environment',
    timestamp: Date.now()
  };
}
