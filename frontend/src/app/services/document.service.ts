import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  DashboardStats, 
  DocumentItem, 
  DocumentStatus, 
  DocumentComment,
  StorageProviderType 
} from '../models/document.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = '/api/document';

  private getAuthHeaders(): HttpHeaders {
    const user = this.auth.currentUser();
    return new HttpHeaders({
      'X-User-Id': user?.id || '22222222-2222-2222-2222-222222222222'
    });
  }

  getDocuments(filter?: { status?: DocumentStatus; category?: string; search?: string }): Observable<DocumentItem[]> {
    let params = new HttpParams();
    if (filter?.status) params = params.set('status', filter.status);
    if (filter?.category && filter.category !== 'All') params = params.set('category', filter.category);
    if (filter?.search) params = params.set('search', filter.search);

    return this.http.get<DocumentItem[]>(this.apiUrl, { params });
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard-stats`);
  }

  getDocumentById(id: string): Observable<DocumentItem> {
    return this.http.get<DocumentItem>(`${this.apiUrl}/${id}`);
  }

  createDocument(payload: {
    title: string;
    description: string;
    category: string;
    originalFileName: string;
    storedFileKey: string;
    contentType: string;
    fileSizeBytes: number;
    storageProvider: StorageProviderType;
  }): Observable<DocumentItem> {
    return this.http.post<DocumentItem>(this.apiUrl, payload, { headers: this.getAuthHeaders() });
  }

  updateStatus(id: string, newStatus: DocumentStatus | string, reasonOrNote?: string): Observable<DocumentItem> {
    return this.http.post<DocumentItem>(`${this.apiUrl}/${id}/status`, {
      newStatus,
      reasonOrNote: reasonOrNote || ''
    }, { headers: this.getAuthHeaders() });
  }

  addComment(documentId: string, content: string, isInternalNote = false): Observable<DocumentComment> {
    return this.http.post<DocumentComment>(`${this.apiUrl}/${documentId}/comments`, {
      content,
      isInternalReviewerNote: isInternalNote
    }, { headers: this.getAuthHeaders() });
  }
}
