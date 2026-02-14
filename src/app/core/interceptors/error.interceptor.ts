import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { StateService } from '../services/state.service';
import { StorageService } from '../services/storage.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const state = inject(StateService);
  const storage = inject(StorageService);
  const platformId = inject(PLATFORM_ID);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // ✅ Ne traiter les erreurs que côté browser
      if (!isPlatformBrowser(platformId)) {
        return throwError(() => error);
      }

      console.error('❌ HTTP Error:', {
        status: error.status,
        url: error.url,
        message: error.message
      });

      // ✅ CORRECTION : Gérer les 401 intelligemment
      if (error.status === 401) {
        const hasToken = storage.hasToken();
        const hasUser = !!storage.getUser();
        const stateHasUser = !!state.user();
        const requestHadAuth = req.headers.has('Authorization');

        console.log('🔍 401 Error Analysis:', {
          hasToken,
          hasUser,
          stateHasUser,
          requestHadAuth,
          url: req.url
        });

        // ✅ CAS 1: Requête d'auth (login/register) qui a échoué
        if (req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
          console.log('ℹ️ Auth request failed (wrong credentials?)');
          state.setError('Identifiants incorrects');
          return throwError(() => error);
        }

        // ✅ CAS 2: On a un token ET il était dans la requête = token invalide/expiré
        if (hasToken && requestHadAuth) {
          console.warn('🔒 Token was sent but rejected - token is invalid/expired');
          storage.clear();
          state.reset();
          router.navigate(['/auth/login'], {
            queryParams: { returnUrl: router.url, reason: 'session_expired' }
          });
          return throwError(() => error);
        }

        // ✅ CAS 3: On a un token mais il n'était PAS dans la requête = bug de timing
        if (hasToken && !requestHadAuth) {
          console.warn('⚠️ Token exists but was not sent! Timing issue - ignoring this 401');
          state.setError('Erreur de synchronisation. Veuillez rafraîchir la page.');
          return throwError(() => error);
        }

        // ✅ CAS 4: Pas de token du tout = pas connecté
        console.warn('🔒 No token found, user is not authenticated');
        storage.clear();
        state.reset();
        router.navigate(['/auth/login'], {
          queryParams: { returnUrl: router.url }
        });
      }

      if (error.status === 403) {
        console.warn('🚫 Forbidden:', req.url);
        state.setError('Vous n\'avez pas les permissions nécessaires.');
        router.navigate(['/dashboard']);
      }

      if (error.status === 500) {
        console.error('💥 Server error:', error);
        state.setError('Erreur serveur. Veuillez réessayer plus tard.');
      }

      return throwError(() => error);
    })
  );
};
