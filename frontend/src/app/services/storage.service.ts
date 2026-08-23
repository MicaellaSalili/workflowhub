import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { PresignedUploadResponse, StorageInfo, StorageProviderType } from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private http = inject(HttpClient);
  private apiUrl = '/api/storage';

  /**
   * Retrieves active storage provider configuration and status
   */
  getStorageInfo(): Observable<StorageInfo> {
    return this.http.get<StorageInfo>(`${this.apiUrl}/info`);
  }

  /**
   * Requests a time-limited Pre-Signed Upload URL (for S3) or a local fallback upload target
   */
  getPresignedUploadUrl(fileName: string, contentType: string, fileSizeBytes: number): Observable<PresignedUploadResponse> {
    return this.http.post<PresignedUploadResponse>(`${this.apiUrl}/presigned-upload-url`, {
      fileName,
      contentType,
      fileSizeBytes
    });
  }

  /**
   * Performs direct-to-cloud upload using S3 Pre-signed URL or falls back to local streaming endpoint.
   * This executes the binary HTTP PUT without passing through application servers in AWS mode.
   */
  uploadBinaryDirect(uploadUrl: string, file: File, requiredHeaders?: Record<string, string>): Observable<any> {
    let headers = new HttpHeaders();
    if (requiredHeaders) {
      Object.keys(requiredHeaders).forEach(key => {
        headers = headers.set(key, requiredHeaders[key]);
      });
    } else {
      headers = headers.set('Content-Type', file.type || 'application/octet-stream');
    }

    return this.http.put(uploadUrl, file, {
      headers,
      reportProgress: true,
      observe: 'events'
    });
  }

  /**
   * Gets download URL for document
   */
  getDownloadUrl(fileKey: string, originalFileName: string): Observable<{ downloadUrl: string; directFromCloud: boolean }> {
    return this.http.get<{ downloadUrl: string; directFromCloud: boolean }>(
      `${this.apiUrl}/download-url?fileKey=${encodeURIComponent(fileKey)}&originalFileName=${encodeURIComponent(originalFileName)}`
    );
  }
}
