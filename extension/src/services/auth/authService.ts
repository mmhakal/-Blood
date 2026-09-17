/**
 * Authentication & Session Management Service
 * Secure token management, automatic background token renewal, and branch switching.
 */

import apiClient from '../api/apiClient';
import { extensionStorage } from '../storage/extensionStorage';
import { SessionData, UserProfile, LabBranch } from '../../types';
import logger from '../logging/logger';
import telemetry from '../logging/telemetry';

export class AuthService {
  private listeners: Set<(session: SessionData | null) => void> = new Set();

  public async getSession(): Promise<SessionData | null> {
    return extensionStorage.getSession();
  }

  public async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return Boolean(session && Date.now() < session.expiresAt);
  }

  public async login(email: string, password: string): Promise<SessionData> {
    try {
      const res = await apiClient.post<{
        token: string;
        user: any;
      }>('/auth/login', { email, password });

      const rawUser = res.user;
      const user: UserProfile = {
        id: rawUser.id,
        email: rawUser.email,
        name: rawUser.name,
        role_code: rawUser.role_code,
        role_name: rawUser.role_name || rawUser.role_code,
        phone: rawUser.phone,
        lab_id: rawUser.lab_id,
        branch_id: rawUser.branch_id,
        lab_name: rawUser.lab_name,
        branch_name: rawUser.branch_name,
        permissions: Array.isArray(rawUser.permissions) ? rawUser.permissions : []
      };

      const branches: LabBranch[] = Array.isArray(rawUser.authorized_branches)
        ? rawUser.authorized_branches.map((b: any) => ({
            id: b.id,
            name: b.name,
            code: b.code,
            is_primary: b.is_primary
          }))
        : [];

      // 7 days token expiration default (in ms)
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const session: SessionData = {
        token: res.token,
        user,
        activeBranchId: user.branch_id || (branches[0]?.id ?? null),
        activeBranchName: user.branch_name || (branches[0]?.name ?? null),
        authorizedBranches: branches,
        expiresAt,
        lastRefreshedAt: Date.now()
      };

      await extensionStorage.setSession(session);
      await telemetry.track('login_success', { role: user.role_code });
      this.notifyListeners(session);

      return session;
    } catch (err: any) {
      await telemetry.track('login_failure', { emailDomain: email.split('@')[1] });
      logger.error('Login failed', err);
      throw err;
    }
  }

  public async refreshSession(): Promise<SessionData | null> {
    const current = await this.getSession();
    if (!current) return null;

    try {
      logger.info('Refreshing session token...');
      const res = await apiClient.post<{
        token: string;
        user: Partial<UserProfile>;
      }>('/auth/refresh');

      const updatedSession: SessionData = {
        ...current,
        token: res.token,
        user: {
          ...current.user,
          ...(res.user as any)
        },
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        lastRefreshedAt: Date.now()
      };

      await extensionStorage.setSession(updatedSession);
      this.notifyListeners(updatedSession);
      return updatedSession;
    } catch (err) {
      logger.warn('Token refresh failed, session might be revoked', err);
      return null;
    }
  }

  public async switchBranch(branchId: string, branchName: string): Promise<SessionData | null> {
    const current = await this.getSession();
    if (!current) return null;

    const updated: SessionData = {
      ...current,
      activeBranchId: branchId,
      activeBranchName: branchName
    };

    await extensionStorage.setSession(updated);
    this.notifyListeners(updated);
    return updated;
  }

  public async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      logger.warn('Server logout failed, clearing local session anyway', e);
    } finally {
      await extensionStorage.clearSession();
      this.notifyListeners(null);
    }
  }

  public onSessionChange(listener: (session: SessionData | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(session: SessionData | null) {
    this.listeners.forEach(fn => fn(session));
  }
}

export const authService = new AuthService();
export default authService;
