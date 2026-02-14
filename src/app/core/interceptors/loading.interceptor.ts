import {StateService} from '../services/state.service';
import {inject} from '@angular/core';
import {HttpInterceptorFn} from '@angular/common/http';
import {finalize} from 'rxjs';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const state = inject(StateService);
  state.setLoading(true);
  return next(req).pipe(
    finalize(() => {
      state.setLoading(false);
    })
  );

}
