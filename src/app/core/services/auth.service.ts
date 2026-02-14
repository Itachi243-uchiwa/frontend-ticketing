import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { StateService } from './state.service';
import { Router } from '@angular/router';
import { LoginDto, RegisterDto } from '../models/auth.model';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = inject(ApiService);
  private storage = inject(StorageService);
  private state = inject(StateService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  login(credentials: LoginDto): Observable<any> {
    return this.api.post<any>('auth/login', credentials).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => {
        this.state.setError(error.error?.message || 'Login Failed');
        return throwError(() => error);
      })
    );
  }

  register(data: RegisterDto): Observable<any> {
    return this.api.post<any>('auth/register', data).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(err => {
        this.state.setError(err.error?.message || 'Registration Failed');
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    this.api.post('auth/logout', {}).subscribe({
      next: () => this.handleLogout(),
      error: () => this.handleLogout()
    });
  }

  getUser(): User | null {
    // Priorité au storage pour éviter les problèmes de timing
    return this.storage.getUser();
  }

  // ✅ CORRECTION CRITIQUE : Initialisation synchrone et forcée
  initializeAuth(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }

    const token = this.storage.getToken();
    const user = this.storage.getUser();

    console.log('🔧 AuthService.initializeAuth()');
    console.log('  - Token présent:', !!token);
    console.log('  - User présent:', !!user);

    if (token && user) {
      // ✅ Restauration FORCÉE et SYNCHRONE du state
      this.state.setUser(user);
      console.log('  ✅ User restauré dans le state:', user);
      console.log('  ✅ isAuthenticated:', this.state.isAuthenticated());
    } else {
      console.log('  ⚠️ Pas de données d\'authentification');
    }

    return Promise.resolve();
  }

  isAuthenticated(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;

    // Vérification directe du storage (plus fiable)
    const token = this.storage.getToken();
    const user = this.storage.getUser();

    if (token && user) {
      // Restauration de secours si le state est vide
      if (!this.state.user()) {
        this.state.setUser(user);
      }
      return true;
    }

    return false;
  }

  private handleLogout(): void {
    this.storage.clear();
    this.state.reset();
    this.router.navigate(['/auth/login']);
  }

  private handleAuthSuccess(response: any) {
    const authData = response.data || response;
    if (!authData.accessToken || !authData.user) {
      throw new Error('Invalid authentication response');
    }

    console.log('✅ handleAuthSuccess - Token:', authData.accessToken.substring(0, 20) + '...');
    console.log('✅ handleAuthSuccess - User:', authData.user);

    this.storage.setToken(authData.accessToken);
    this.storage.setRefreshToken(authData.refreshToken);
    this.storage.setUser(authData.user);
    this.state.setUser(authData.user);
    this.state.clearError();
  }
}
