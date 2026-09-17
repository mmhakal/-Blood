/**
 * MediFlow LIS Browser Extension Platform - Canonical Types
 * Strict typing across Extension Surfaces, Service Worker, and LIS SaaS.
 */

export type UserRole = 
  | 'super_admin' 
  | 'lab_admin' 
  | 'pathologist' 
  | 'technician' 
  | 'phlebotomist' 
  | 'receptionist' 
  | 'billing_clerk'
  | 'doctor'
  | 'patient';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role_code: UserRole;
  role_name?: string;
  phone?: string;
  lab_id: string | null;
  branch_id: string | null;
  lab_name?: string;
  branch_name?: string;
  permissions: string[];
}

export interface LabBranch {
  id: string;
  name: string;
  code: string;
  is_primary?: boolean;
}

export interface SessionData {
  token: string;
  user: UserProfile;
  activeBranchId: string | null;
  activeBranchName: string | null;
  authorizedBranches: LabBranch[];
  expiresAt: number; // unix timestamp ms
  lastRefreshedAt: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface LocalSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'hi';
  apiBaseUrl: string;
  enableNotifications: boolean;
  enableSound: boolean;
  enablePanicAlerts: boolean;
  enableQuickAccession: boolean;
  compactMode: boolean;
  environment: 'development' | 'staging' | 'production';
  telemetryEnabled: boolean;
}

export interface SearchResultEntity {
  entity_type: 'patient' | 'order' | 'sample' | 'report' | 'test' | 'doctor' | 'invoice';
  entity_id: string;
  title: string;
  subtitle: string;
  badge?: string;
  badge_color?: string;
  url: string;
  created_at?: string;
}

export interface ExtensionNotification {
  id: string;
  lab_id?: string;
  user_id?: string;
  title: string;
  message: string;
  type: 'panic_result' | 'critical' | 'alert' | 'system' | 'info' | 'order' | 'turnaround';
  is_read: boolean | number;
  link?: string;
  created_at: string;
}

export interface FeatureFlag {
  flag_key: string;
  name: string;
  description: string;
  is_enabled: boolean | number;
  category: string;
  rollout_percentage: number;
}

export interface SubscriptionEntitlements {
  tier: 'starter' | 'basic' | 'professional' | 'enterprise' | 'unlimited';
  status: 'active' | 'trial' | 'past_due' | 'canceled';
  expires_at?: string;
  features: {
    extension_enabled: boolean;
    sidepanel_enabled: boolean;
    advanced_search: boolean;
    realtime_sync: boolean;
    ai_predictions: boolean;
    barcode_scanning: boolean;
    export_data: boolean;
  };
}

export type ConnectionStatus = 'online' | 'offline' | 'syncing' | 'error';
