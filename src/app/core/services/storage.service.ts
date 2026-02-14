import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly TOKEN_KEY = 'ticketing_access_token';
  private readonly REFRESH_TOKEN_KEY = 'ticketing_refresh_token';
  private readonly USER_KEY = 'ticketing_user';
  private platformId = inject(PLATFORM_ID);

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  setToken(token: string) {
    if (!this.isBrowser()) {
      return;
    }
    localStorage.setItem(this.TOKEN_KEY, token);

    // Vérification immédiate
    const saved = localStorage.getItem(this.TOKEN_KEY);
    if (saved !== token) {
      console.error('❌ Token save FAILED! Saved value doesn\'t match');
    }
  }

  getToken(): string | null {
    if (!this.isBrowser()) {
      return null;
    }
    return localStorage.getItem(this.TOKEN_KEY);
  }

  removeToken(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  setRefreshToken(token: string) {
    if (!this.isBrowser()) {
      return;
    }
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  getRefreshToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  removeRefreshToken(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
  }

  setUser(user: any) {
    if (!this.isBrowser()) {
      return;
    }
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getUser(): any {
    if (!this.isBrowser()) return null;

    const userStr = localStorage.getItem(this.USER_KEY);

    // Protection contre "undefined" et autres valeurs invalides
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
      if (userStr) {
        localStorage.removeItem(this.USER_KEY);
      }
      return null;
    }

    try {
      return JSON.parse(userStr);
    } catch (e) {
      console.error('❌ Failed to parse user JSON, cleaning up');
      localStorage.removeItem(this.USER_KEY);
      return null;
    }
  }

  removeUser(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.USER_KEY);
    }
  }

  clear(): void {
    if (this.isBrowser()) {
      localStorage.clear();
    }
  }

  hasToken(): boolean {
    return !!this.getToken();
  }
}
