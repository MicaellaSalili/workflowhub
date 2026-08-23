import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export type ToastType = 'success' | 'danger' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  durationMs?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  public activeToast = signal<ToastMessage | null>(null);
  private timerHandle: any = null;

  /**
   * Display a toast notification
   */
  public show(title: string, message: string, type: ToastType = 'info', durationMs: number = 6000): void {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    const toast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      type,
      durationMs,
      timestamp: new Date()
    };

    this.activeToast.set(toast);

    if (durationMs > 0) {
      this.timerHandle = setTimeout(() => {
        this.dismiss();
      }, durationMs);
    }
  }

  public success(title: string, message: string, durationMs = 5000): void {
    this.show(title, message, 'success', durationMs);
  }

  public danger(title: string, message: string, durationMs = 7000): void {
    this.show(title, message, 'danger', durationMs);
  }

  public warning(title: string, message: string, durationMs = 6000): void {
    this.show(title, message, 'warning', durationMs);
  }

  public info(title: string, message: string, durationMs = 5000): void {
    this.show(title, message, 'info', durationMs);
  }

  public dismiss(): void {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
    this.activeToast.set(null);
  }

  /**
   * Parses various error response structures (ASP.NET Core ProblemDetails, EF Core errors,
   * custom JSON {message, error}, string payloads, or status code fallbacks) into user-friendly text.
   */
  public parseHttpError(error: any): { title: string; message: string } {
    if (error instanceof HttpErrorResponse) {
      const status = error.status;
      let title = `Server Error (${status || '500'})`;
      let message = 'An unexpected server error occurred. Please try again or contact support.';

      if (status === 500) {
        title = 'Internal Server Error (500)';
        message = 'The server encountered an internal error while processing the request.';
      } else if (status === 502) {
        title = 'Bad Gateway (502)';
        message = 'The server received an invalid response from an upstream server.';
      } else if (status === 503) {
        title = 'Service Unavailable (503)';
        message = 'The backend service is temporarily overloaded or down for maintenance.';
      } else if (status === 504) {
        title = 'Gateway Timeout (504)';
        message = 'The server timed out waiting for an internal process or upstream service.';
      } else if (status === 0) {
        title = 'Network Connection Error';
        message = 'Unable to connect to the backend server. Please verify your internet connection.';
      } else if (status === 404) {
        title = 'Resource Not Found (404)';
        message = 'The requested resource or endpoint was not found.';
      } else if (status === 403) {
        title = 'Access Forbidden (403)';
        message = 'You do not have the required permissions to perform this operation.';
      } else if (status === 401) {
        title = 'Unauthorized (401)';
        message = 'Authentication credentials are missing or expired.';
      } else if (status === 400) {
        title = 'Bad Request (400)';
        message = 'The request could not be processed due to invalid parameters.';
      }

      // Check for structured error payload in error.error
      if (error.error) {
        if (typeof error.error === 'string') {
          try {
            const parsed = JSON.parse(error.error);
            message = this.extractMessageFromObject(parsed) || message;
          } catch {
            if (error.error.trim().length > 0 && !error.error.includes('<!DOCTYPE')) {
              message = error.error;
            }
          }
        } else if (typeof error.error === 'object') {
          const extracted = this.extractMessageFromObject(error.error);
          if (extracted) {
            message = extracted;
          }
        }
      } else if (error.message && !error.message.startsWith('Http failure response')) {
        message = error.message;
      }

      return { title, message };
    }

    if (error?.message) {
      return {
        title: 'Application Error',
        message: error.message
      };
    }

    return {
      title: 'Unexpected Error',
      message: typeof error === 'string' ? error : 'An unexpected error occurred.'
    };
  }

  private extractMessageFromObject(obj: any): string | null {
    if (!obj) return null;

    // 1. Explicit message or error property
    if (obj.message && typeof obj.message === 'string') {
      if (obj.error && typeof obj.error === 'string' && obj.error !== obj.message) {
        return `${obj.message}: ${obj.error}`;
      }
      return obj.message;
    }

    if (obj.error && typeof obj.error === 'string') {
      return obj.error;
    }

    // 2. ASP.NET Core ProblemDetails RFC 7807 (detail / title / errors)
    if (obj.detail && typeof obj.detail === 'string') {
      return obj.detail;
    }

    if (obj.errors && typeof obj.errors === 'object') {
      const errorEntries = Object.entries(obj.errors);
      if (errorEntries.length > 0) {
        const firstEntry = errorEntries[0];
        const fieldName = firstEntry[0];
        const errorMessages = Array.isArray(firstEntry[1]) ? firstEntry[1].join(', ') : String(firstEntry[1]);
        return `${fieldName}: ${errorMessages}`;
      }
    }

    if (obj.title && typeof obj.title === 'string') {
      return obj.title;
    }

    return null;
  }
}
