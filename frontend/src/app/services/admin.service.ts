import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
   UserAdmin, 
   UserRole, 
   SystemStats, 
   SystemLog, 
   SyncStorageResponse 
} from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = '/api/admin';

  getUsers(search?: string, role?: UserRole): Observable<UserAdmin[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (role !== undefined && role !== null) params = params.set('role', role);
    return this.http.get<UserAdmin[]>(`${this.apiUrl}/users`, { params });
  }

  createUser(payload: {
    email: string;
    fullName: string;
    password?: string;
    role: UserRole;
    department: string;
    storageQuotaMb?: number;
  }): Observable<UserAdmin> {
    return this.http.post<UserAdmin>(`${this.apiUrl}/users`, {
      ...payload,
      password: payload.password || 'WorkflowSecure2026!'
    });
  }

  updateUser(id: string, payload: {
    fullName: string;
    department: string;
    role: UserRole;
    status: string;
    storageQuotaMb: number;
  }): Observable<UserAdmin> {
    return this.http.put<UserAdmin>(`${this.apiUrl}/users/${id}`, payload);
  }

  assignRole(id: string, newRole: UserRole, reason?: string): Observable<UserAdmin> {
    return this.http.patch<UserAdmin>(`${this.apiUrl}/users/${id}/role`, {
      newRole,
      reason: reason || 'Role reassignment via Admin Console'
    });
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`);
  }

  getSystemStats(): Observable<SystemStats> {
    return this.http.get<SystemStats>(`${this.apiUrl}/system/stats`);
  }

  getSystemLogs(level?: string): Observable<SystemLog[]> {
    let params = new HttpParams();
    if (level && level !== 'ALL') params = params.set('level', level);
    return this.http.get<SystemLog[]>(`${this.apiUrl}/system/logs`, { params });
  }

  broadcastNotification(title: string, message: string, level = 'info'): Observable<any> {
    return this.http.post(`${this.apiUrl}/system/broadcast`, { title, message, level });
  }

  syncStorage(): Observable<SyncStorageResponse> {
    return this.http.post<SyncStorageResponse>(`${this.apiUrl}/system/storage/sync`, {});
  }
}
