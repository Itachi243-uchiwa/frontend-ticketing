import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from '../services/storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const platformId = inject(PLATFORM_ID);

  // ✅ Ne pas tenter d'ajouter un token côté serveur (localStorage n'existe pas)
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const isAuthEndpoint = req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh');

  // Skip auth endpoints
  if (isAuthEndpoint) {
    return next(req);
  }

  // ✅ CORRECTION : Récupérer le token à chaque requête (pas de cache)
  const token = storage.getToken();

  if (token) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedReq);
  }

  return next(req);
};
