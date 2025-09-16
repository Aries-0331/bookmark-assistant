// 🗄️ User Storage Service (In-Memory Implementation)

import { UserData } from '../types';
import { auditLog, isSessionExpired } from '../utils';
import { config } from '../config';

export class UserStorageService {
  private userStore = new Map<string, UserData>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Start session cleanup interval
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredSessions(),
      config.session.cleanupIntervalMs
    );
  }

  /**
   * Store user data
   */
  setUser(userId: string, userData: UserData): void {
    this.userStore.set(userId, userData);
  }

  /**
   * Get user data by ID
   */
  getUser(userId: string): UserData | undefined {
    return this.userStore.get(userId);
  }

  /**
   * Update user's last activity timestamp
   */
  updateLastActivity(userId: string): boolean {
    const userData = this.userStore.get(userId);
    if (userData) {
      userData.lastActivity = new Date();
      this.userStore.set(userId, userData);
      return true;
    }
    return false;
  }

  /**
   * Delete user data
   */
  deleteUser(userId: string): boolean {
    return this.userStore.delete(userId);
  }

  /**
   * Check if user exists
   */
  hasUser(userId: string): boolean {
    return this.userStore.has(userId);
  }

  /**
   * Get all user IDs (for admin purposes)
   */
  getAllUserIds(): string[] {
    return Array.from(this.userStore.keys());
  }

  /**
   * Get total user count
   */
  getUserCount(): number {
    return this.userStore.size;
  }

  /**
   * Update user's template database ID
   */
  setTemplateDatabase(userId: string, templateDatabaseId: string): boolean {
    const userData = this.userStore.get(userId);
    if (userData) {
      userData.templateDatabaseId = templateDatabaseId;
      userData.lastActivity = new Date();
      this.userStore.set(userId, userData);
      return true;
    }
    return false;
  }

  /**
   * Update user's databases list
   */
  setUserDatabases(userId: string, databases: any[]): boolean {
    const userData = this.userStore.get(userId);
    if (userData) {
      userData.databases = databases;
      userData.lastActivity = new Date();
      this.userStore.set(userId, userData);
      return true;
    }
    return false;
  }

  /**
   * Update user's tokens
   */
  updateTokens(userId: string, accessToken: string, refreshToken?: string): boolean {
    const userData = this.userStore.get(userId);
    if (userData) {
      userData.notionAccessToken = accessToken;
      if (refreshToken) {
        userData.notionRefreshToken = refreshToken;
      }
      userData.lastActivity = new Date();
      this.userStore.set(userId, userData);
      return true;
    }
    return false;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const expiredUserIds: string[] = [];

    for (const [userId, userData] of this.userStore.entries()) {
      if (isSessionExpired(userData.lastActivity, config.session.expiryHours)) {
        expiredUserIds.push(userId);
      }
    }

    // Remove expired sessions
    for (const userId of expiredUserIds) {
      this.userStore.delete(userId);
      auditLog('session_expired', userId);
    }

    if (expiredUserIds.length > 0) {
      console.log(`🧹 Cleaned up ${expiredUserIds.length} expired sessions`);
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const now = new Date();
    let activeCount = 0;
    let expiredCount = 0;

    for (const userData of this.userStore.values()) {
      if (isSessionExpired(userData.lastActivity, config.session.expiryHours)) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }

    return {
      total: this.userStore.size,
      active: activeCount,
      expired: expiredCount,
      lastCleanup: now.toISOString(),
    };
  }

  /**
   * Manually trigger session cleanup
   */
  forceCleanup(): number {
    const beforeCount = this.userStore.size;
    this.cleanupExpiredSessions();
    const afterCount = this.userStore.size;
    return beforeCount - afterCount;
  }

  /**
   * Cleanup resources when shutting down
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.userStore.clear();
  }
}

// Export singleton instance
export const userStorage = new UserStorageService();
