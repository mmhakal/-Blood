/**
 * Typed Message Passing Contracts for MediFlow LIS Extension
 * Enforces strict structure across Popup, SidePanel, Options, Content Script, and Background Service Worker.
 */

export type ExtensionMessageType =
  | 'GET_AUTH_STATUS'
  | 'LOGIN'
  | 'LOGOUT'
  | 'REFRESH_SESSION'
  | 'GET_TENANT_CONTEXT'
  | 'SWITCH_BRANCH'
  | 'SEARCH_GLOBAL'
  | 'GET_NOTIFICATIONS'
  | 'MARK_NOTIFICATION_READ'
  | 'GET_FEATURE_FLAGS'
  | 'OPEN_SIDE_PANEL'
  | 'SYNC_DATA'
  | 'PAGE_CONTEXT_DETECTED'
  | 'EXTRACT_SELECTION'
  | 'PING';

export interface ExtensionMessage<T = any> {
  messageType: ExtensionMessageType;
  requestId: string;
  payload: T;
  timestamp: number;
}

export interface ExtensionMessageResponse<T = any> {
  success: boolean;
  requestId: string;
  data?: T;
  error?: string;
  timestamp: number;
}
