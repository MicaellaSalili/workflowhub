import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from './toast.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: any) => {
      // Check if caller requested to skip global error toast
      const skipGlobalToast = req.headers.has('X-Skip-Global-Error-Toast');

      if (!skipGlobalToast && error instanceof HttpErrorResponse) {
        // Specifically capture HTTP 500, 5xx server errors, connection drop (0), or API exceptions
        if (error.status >= 500 || error.status === 0) {
          const { title, message } = toastService.parseHttpError(error);
          console.error(`[GlobalHttpErrorInterceptor] ${error.status} ${req.method} ${req.url}:`, error);
          toastService.danger(title, message, 8000);
        } else if (error.status >= 400 && error.status !== 401) {
          // For client errors (e.g. 400 Bad Request, 403 Forbidden, 404 Not Found), also format cleanly if not handled
          const { title, message } = toastService.parseHttpError(error);
          console.warn(`[GlobalHttpErrorInterceptor] ${error.status} ${req.method} ${req.url}:`, error);
          toastService.warning(title, message, 6000);
        }
      }

      return throwError(() => error);
    })
  );
};
