import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from '../services/storage.service';
import { StateService } from '../services/state.service';

export const authGuard: CanActivateFn = (route, state) => {
  const storageService = inject(StorageService);
  const stateService = inject(StateService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // ✅ SSR: Toujours autoriser côté serveur
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // ✅ Vérifier l'authentification
  const token = storageService.getToken();
  const storedUser = storageService.getUser();

  console.log('🔒 authGuard check:', {
    hasToken: !!token,
    hasUser: !!storedUser,
    url: state.url
  });

  if (token && storedUser) {
    // Restaurer le state si nécessaire
    if (!stateService.user()) {
      console.log('🔄 Restoring user in state from guard');
      stateService.setUser(storedUser);
    }
    return true;
  }

  console.warn('❌ Auth guard: Not authenticated, redirecting to login');

  // Redirection vers login
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
};
