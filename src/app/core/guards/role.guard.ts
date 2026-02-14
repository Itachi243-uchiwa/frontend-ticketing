import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UserRole } from '../models/user.model';
import { StorageService } from '../services/storage.service';
import { StateService } from '../services/state.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const storageService = inject(StorageService);
  const stateService = inject(StateService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // ✅ SSR: Toujours autoriser côté serveur
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // ✅ Vérifier l'authentification d'abord
  const token = storageService.getToken();
  const storedUser = storageService.getUser();

  // 1. Vérifier l'authentification
  if (!token || !storedUser) {
    console.warn('🔒 roleGuard: Pas de token ou user dans storage');
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  // 2. Restaurer le state si nécessaire
  if (!stateService.user()) {
    console.log('🔄 roleGuard: Restauration du user dans le state');
    stateService.setUser(storedUser);
  }

  // 3. Vérifier les rôles
  const requiredRoles = route.data['roles'] as UserRole[];
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  if (!requiredRoles.includes(storedUser.role)) {
    console.warn(`❌ Accès refusé : Rôle ${storedUser.role} non autorisé pour ${state.url}`);
    console.warn(`Rôles requis: ${requiredRoles.join(', ')}`);
    return router.createUrlTree(['/dashboard']);
  }

  console.log(`✅ roleGuard: Accès autorisé pour ${storedUser.role}`);
  return true;
};
