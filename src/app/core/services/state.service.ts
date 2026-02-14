import {computed, Injectable, signal} from '@angular/core';
import {User} from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class StateService {

  private userSignal = signal<User | null>(null);
  readonly user = this.userSignal.asReadonly();

  // ✅ CORRECTION: Vérifier que l'utilisateur existe ET est non-null/undefined
  readonly isAuthenticated = computed(() => {
    const user = this.userSignal();
    return user !== null && user !== undefined;
  });

  readonly userRole = computed(() => this.userSignal()?.role || null);

  readonly userName = computed(() => {
    const user = this.userSignal();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });

  private loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  setUser(user: User | null) {
    console.log('🔄 StateService.setUser called with:', user);
    this.userSignal.set(user);
    console.log('✅ User signal updated to:', this.userSignal());
    console.log('✅ isAuthenticated:', this.isAuthenticated());
  }

  setLoading(loading: boolean) {
    this.loadingSignal.set(loading);
  }

  setError(error: string | null) {
    this.errorSignal.set(error);
  }

  clearError() {
    this.errorSignal.set(null);
  }

  reset(): void {
    console.log('🔄 StateService.reset called');
    this.userSignal.set(null);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
  }
}
