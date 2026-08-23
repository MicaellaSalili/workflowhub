import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { 
  DocumentItem, 
  DocumentStatus, 
  StorageProviderType, 
  DashboardStats,
  StorageInfo,
  UserRole
} from '../../models/document.model';
import { DocumentService } from '../../services/document.service';
import { SignalRService } from '../../services/signalr.service';
import { StorageService } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private docService = inject(DocumentService);
  public signalRService = inject(SignalRService);
  private storageService = inject(StorageService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // State signals
  public documents = signal<DocumentItem[]>([]);
  public stats = signal<DashboardStats | null>(null);
  public storageInfo = signal<StorageInfo | null>(null);
  public selectedDocument = signal<DocumentItem | null>(null);
  public isLoading = signal<boolean>(false);
  public isUploading = signal<boolean>(false);
  public uploadProgress = signal<number>(0);
  public showUploadModal = signal<boolean>(false);
  public activeTab = signal<'all' | 'pending' | 'approved' | 'changes'>('all');
  public searchQuery = signal<string>('');
  public selectedCategory = signal<string>('All');
  public toastNotification = signal<{ title: string; message: string; type: string } | null>(null);

  // Reactive Upload Form
  public uploadForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    category: ['Engineering', Validators.required]
  });

  public selectedFile: File | null = null;
  private subs: Subscription[] = [];

  // Filtered documents computed signal
  public filteredDocuments = computed(() => {
    let list = this.documents();
    const tab = this.activeTab();
    const query = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();

    if (tab === 'pending') {
      list = list.filter(d => d.status === DocumentStatus.Submitted || d.status === DocumentStatus.UnderReview);
    } else if (tab === 'approved') {
      list = list.filter(d => d.status === DocumentStatus.Approved);
    } else if (tab === 'changes') {
      list = list.filter(d => d.status === DocumentStatus.ChangesRequested);
    }

    if (cat !== 'All') {
      list = list.filter(d => d.category.toLowerCase() === cat.toLowerCase());
    }

    if (query) {
      list = list.filter(d => 
        d.title.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query) ||
        d.originalFileName.toLowerCase().includes(query) ||
        d.submitterName.toLowerCase().includes(query)
      );
    }

    return list;
  });

  ngOnInit(): void {
    this.signalRService.startConnection();
    this.loadInitialData();
    this.subscribeToRealtimeEvents();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private loadInitialData(): void {
    this.isLoading.set(true);

    this.docService.getDocuments().subscribe({
      next: docs => {
        this.documents.set(docs);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.docService.getDashboardStats().subscribe({
      next: stats => this.stats.set(stats)
    });

    this.storageService.getStorageInfo().subscribe({
      next: info => this.storageInfo.set(info)
    });

    this.authService.getAvailableUsers().subscribe();
  }

  private subscribeToRealtimeEvents(): void {
    // 1. SignalR: New document submitted
    this.subs.push(
      this.signalRService.newDocumentSubmitted$.subscribe(newDoc => {
        this.documents.update(docs => [newDoc, ...docs.filter(d => d.id !== newDoc.id)]);
        this.showToast('New Submission', `"${newDoc.title}" submitted by ${newDoc.submitterName}`, 'info');
        this.refreshStats();
      })
    );

    // 2. SignalR: Document status changed
    this.subs.push(
      this.signalRService.documentStatusChanged$.subscribe(({ document, note }) => {
        this.documents.update(docs => docs.map(d => d.id === document.id ? document : d));
        if (this.selectedDocument()?.id === document.id) {
          this.selectedDocument.set(document);
        }
        this.showToast(
          'Workflow Updated', 
          `"${document.title}" is now ${document.status}. ${note ? `("${note}")` : ''}`, 
          'success'
        );
        this.refreshStats();
      })
    );

    // 3. SignalR: New comment added
    this.subs.push(
      this.signalRService.commentAdded$.subscribe(({ documentId, comment }) => {
        this.documents.update(docs => docs.map(d => {
          if (d.id === documentId) {
            const comments = [...(d.comments || []), comment];
            return { ...d, comments };
          }
          return d;
        }));

        if (this.selectedDocument()?.id === documentId) {
          const current = this.selectedDocument()!;
          this.selectedDocument.set({
            ...current,
            comments: [...(current.comments || []), comment]
          });
        }
      })
    );
  }

  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  public submitDocument(): void {
    if (this.uploadForm.invalid || !this.selectedFile) return;

    const file = this.selectedFile;
    const formVal = this.uploadForm.value;
    this.isUploading.set(true);
    this.uploadProgress.set(10);

    // Step 1: Request Pre-signed S3 URL or Local Fallback upload target
    this.storageService.getPresignedUploadUrl(file.name, file.type || 'application/octet-stream', file.size).subscribe({
      next: presignedRes => {
        this.uploadProgress.set(40);

        // Step 2: Direct Binary PUT to S3 / LocalFiles
        this.storageService.uploadBinaryDirect(presignedRes.uploadUrl, file, presignedRes.requiredHeaders).subscribe({
          next: () => {
            this.uploadProgress.set(80);

            // Step 3: Register document in PostgreSQL database
            this.docService.createDocument({
              title: formVal.title!,
              description: formVal.description || '',
              category: formVal.category!,
              originalFileName: file.name,
              storedFileKey: presignedRes.fileKey,
              contentType: file.type || 'application/octet-stream',
              fileSizeBytes: file.size,
              storageProvider: presignedRes.provider
            }).subscribe({
              next: createdDoc => {
                this.uploadProgress.set(100);
                this.isUploading.set(false);
                this.showUploadModal.set(false);
                this.uploadForm.reset({ category: 'Engineering' });
                this.selectedFile = null;
                this.showToast('Success', `"${createdDoc.title}" uploaded and queued for review!`, 'success');
              },
              error: () => this.isUploading.set(false)
            });
          },
          error: () => this.isUploading.set(false)
        });
      },
      error: () => this.isUploading.set(false)
    });
  }

  public readonly DocumentStatus = DocumentStatus;

  public reviewStatusChange(doc: DocumentItem, newStatus: DocumentStatus | string, note: string): void {
    this.docService.updateStatus(doc.id, newStatus, note).subscribe({
      next: updated => {
        this.selectedDocument.set(updated);
      }
    });
  }

  public downloadDocument(doc: DocumentItem): void {
    this.storageService.getDownloadUrl(doc.storedFileKey, doc.originalFileName).subscribe({
      next: res => {
        window.open(res.downloadUrl, '_blank');
      }
    });
  }

  private refreshStats(): void {
    this.docService.getDashboardStats().subscribe(stats => this.stats.set(stats));
  }

  private showToast(title: string, message: string, type: string): void {
    this.toastNotification.set({ title, message, type });
    setTimeout(() => this.toastNotification.set(null), 5000);
  }
}
