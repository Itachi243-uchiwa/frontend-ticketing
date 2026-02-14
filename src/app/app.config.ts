import { ApplicationConfig, PLATFORM_ID, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { isPlatformBrowser } from '@angular/common';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { StorageService } from './core/services/storage.service';
import { StateService } from './core/services/state.service';

/**
 * ✅ Factory pour initialiser l'état d'authentification AVANT le démarrage de l'app
 * Cela évite les problèmes de timing avec les guards et resolvers
 */
export function initializeAuth(
  storage: StorageService,
  state: StateService,
  platformId: Object
): () => void {
  return () => {
    // ✅ Ne s'exécute que côté client (browser)
    if (isPlatformBrowser(platformId)) {
      console.log('🚀 APP_INITIALIZER: Initializing auth state...');

      const token = storage.getToken();
      const user = storage.getUser();

      if (token && user) {
        console.log('✅ APP_INITIALIZER: Restoring user in state');
        state.setUser(user);
      } else {
        console.log('ℹ️ APP_INITIALIZER: No auth data found');
      }
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, errorInterceptor, loadingInterceptor])
    ),
    provideAnimations(),
    // ✅ Initialiser l'état d'auth AVANT le démarrage de l'app
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [StorageService, StateService, PLATFORM_ID],
      multi: true
    }
  ]
};
