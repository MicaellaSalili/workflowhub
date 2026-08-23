import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { 
  DocumentItem, 
  WorkflowDocument,
  DocumentVersion,
  WorkflowDocumentVersion,
  DocumentStatus, 
  StorageProviderType, 
  DashboardStats, 
  StorageInfo, 
  UserRole,
  User,
  UserAdmin,
  SystemStats,
  SystemLog
} from '../../models/document.model';
import { DocumentService } from '../../services/document.service';
import { SignalRService } from '../../services/signalr.service';
import { StorageService } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { ToastService } from '../../services/toast.service';
import { ReviewModalComponent, ReviewDecisionType } from '../review-modal/review-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ReviewModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  public docService = inject(DocumentService);
  public signalRService = inject(SignalRService);
  public storageService = inject(StorageService);
  public authService = inject(AuthService);
  public adminService = inject(AdminService);
  public toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  // Main UI Mode & Tabs
  public mainView = signal<'documents' | 'admin'>('documents');
  public activeTab = signal<'all' | 'pending' | 'changes' | 'approved' | 'my_submissions'>('all');
  public adminTab = signal<'telemetry' | 'users' | 'storage' | 'logs' | 'broadcast'>('telemetry');

  // Core Data Signals
  public documents = signal<DocumentItem[]>([]);
  public stats = signal<DashboardStats | null>(null);
  public storageInfo = signal<StorageInfo | null>(null);
  public selectedDocument = signal<DocumentItem | null>(null);
  public systemStats = signal<SystemStats | null>(null);
  public adminUsers = signal<UserAdmin[]>([]);
  public systemLogs = signal<SystemLog[]>([]);

  // State Indicators
  public isLoading = signal<boolean>(false);
  public isUploading = signal<boolean>(false);
  public uploadProgress = signal<number>(0);
  public isRevising = signal<boolean>(false);
  public revisionProgress = signal<number>(0);
  public isSyncingStorage = signal<boolean>(false);

  // Filters & Search
  public searchQuery = signal<string>('');
  public selectedCategory = signal<string>('All');
  public userFilterRole = signal<string>('All');
  public logFilterLevel = signal<string>('ALL');

  // Modals & Dialogs
  public showUploadModal = signal<boolean>(false);
  public showRevisionModal = signal<boolean>(false);
  public showReviewDecisionModal = signal<boolean>(false);
  public showCreateUserModal = signal<boolean>(false);
  public showBroadcastModal = signal<boolean>(false);
  public pendingDecisionType = signal<'Approved' | 'ChangesRequested' | 'Rejected'>('Approved');

  // Real-time notifications & broadcasts
  public toastNotification = computed(() => this.toastService.activeToast());
  public activeBroadcastBanner = signal<{ title: string; message: string; level: string; sender: string } | null>(null);

  // Forms
  public uploadForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    category: ['Engineering', Validators.required]
  });

  public revisionForm = this.fb.group({
    revisionNotes: ['', [Validators.required, Validators.minLength(3)]]
  });

  public decisionForm = this.fb.group({
    feedbackNote: ['']
  });

  public newCommentContent = signal<string>('');
  public isInternalComment = signal<boolean>(false);

  public createUserForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    role: [UserRole.Submitter, Validators.required],
    department: ['Engineering', Validators.required],
    storageQuotaMb: [1024, [Validators.required, Validators.min(100)]]
  });

  public broadcastForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    message: ['', [Validators.required, Validators.minLength(5)]],
    level: ['info', Validators.required]
  });

  public selectedFile: File | null = null;
  public selectedRevisionFile: File | null = null;
  private subs: Subscription[] = [];

  // Filtered documents list computed signal
  public filteredDocuments = computed(() => {
    let list = this.documents();
    const tab = this.activeTab();
    const query = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    const currentUser = this.authService.currentUser();

    if (tab === 'pending') {
      list = list.filter(d => {
        const s = this.getStatusText(d.status);
        return s === 'Submitted' || s === 'UnderReview';
      });
    } else if (tab === 'changes') {
      list = list.filter(d => this.getStatusText(d.status) === 'ChangesRequested');
    } else if (tab === 'approved') {
      list = list.filter(d => this.getStatusText(d.status) === 'Approved');
    } else if (tab === 'my_submissions') {
      list = list.filter(d => d.submitterId === currentUser?.id);
    }

    if (cat !== 'All') {
      list = list.filter(d => (d.category || '').toLowerCase() === cat.toLowerCase());
    }

    if (query) {
      list = list.filter(d => 
        (d.title || '').toLowerCase().includes(query) ||
        (d.description || '').toLowerCase().includes(query) ||
        (d.originalFileName || '').toLowerCase().includes(query) ||
        (d.submitterName || '').toLowerCase().includes(query) ||
        (d.category || '').toLowerCase().includes(query)
      );
    }

    return list;
  });

  // Action required count for submitters
  public myChangesRequestedCount = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    return this.documents().filter(d => 
      d.submitterId === currentUserId && this.getStatusText(d.status) === 'ChangesRequested'
    ).length;
  });

  // Pending count for reviewers
  public pendingQueueCount = computed(() => {
    return this.documents().filter(d => {
      const s = this.getStatusText(d.status);
      return s === 'Submitted' || s === 'UnderReview';
    }).length;
  });

  public getStatusText(status: any): string {
    if (typeof status === 'number') {
      const statusMap: Record<number, string> = {
        0: 'Draft',
        1: 'Submitted',
        2: 'UnderReview',
        3: 'ChangesRequested',
        4: 'Approved',
        5: 'Rejected'
      };
      return statusMap[status] || 'Unknown';
    }
    return status ? String(status) : 'Submitted';
  }

  public getStatusClass(status: any): string {
    const text = this.getStatusText(status);
    return text.toLowerCase();
  }

  ngOnInit(): void {
    this.signalRService.startConnection();
    this.loadInitialData();
    this.subscribeToRealtimeEvents();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  public loadInitialData(): void {
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

  public loadAdminData(): void {
    this.adminService.getSystemStats().subscribe({
      next: stats => this.systemStats.set(stats)
    });

    this.adminService.getUsers().subscribe({
      next: users => this.adminUsers.set(users)
    });

    this.adminService.getSystemLogs().subscribe({
      next: logs => this.systemLogs.set(logs)
    });
  }

  public onMainViewChange(view: 'documents' | 'admin'): void {
    this.mainView.set(view);
    if (view === 'admin') {
      this.loadAdminData();
    }
  }

  private subscribeToRealtimeEvents(): void {
    // 1. New document submitted
    this.subs.push(
      this.signalRService.newDocumentSubmitted$.subscribe(newDoc => {
        this.documents.update(docs => [newDoc, ...docs.filter(d => d.id !== newDoc.id)]);
        this.showToast('New Submission', `"${newDoc.title}" submitted by ${newDoc.submitterName}`, 'info');
        this.refreshStats();
      })
    );

    // 2. Document status changed / revised
    this.subs.push(
      this.signalRService.documentStatusChanged$.subscribe(({ document, note }) => {
        this.documents.update(docs => docs.map(d => d.id === document.id ? document : d));
        if (this.selectedDocument()?.id === document.id) {
          this.selectedDocument.set(document);
        }
        this.showToast(
          'Workflow Updated', 
          `"${document.title}" is now ${this.getStatusText(document.status)}. ${note ? `("${note}")` : ''}`, 
          'success'
        );
        this.refreshStats();
      })
    );

    // 3. Comment added
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

    // 4. System Broadcast Received
    this.subs.push(
      this.signalRService.systemBroadcast$.subscribe(broadcast => {
        this.activeBroadcastBanner.set(broadcast);
      })
    );

    // 5. User notifications
    this.subs.push(
      this.signalRService.notification$.subscribe(notif => {
        this.showToast(notif.title, notif.message, notif.type);
      })
    );
  }

  // --- SUBMITTER ACTIONS ---
  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  public submitDocument(): void {
    if (this.uploadForm.invalid || !this.selectedFile) {
      this.showToast('Validation Error', 'Please enter a valid title and select a file to submit.', 'danger');
      return;
    }

    const file = this.selectedFile;
    const formVal = this.uploadForm.value;
    this.isUploading.set(true);
    this.uploadProgress.set(20);

    this.storageService.getPresignedUploadUrl(file.name, file.type || 'application/octet-stream', file.size).subscribe({
      next: presignedRes => {
        this.uploadProgress.set(55);

        this.storageService.uploadBinaryDirect(presignedRes.uploadUrl, file, presignedRes.requiredHeaders).subscribe({
          next: () => {
            this.uploadProgress.set(85);

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
                this.documents.update(docs => [createdDoc, ...docs.filter(d => d.id !== createdDoc.id)]);
                this.uploadForm.reset({ category: 'Engineering' });
                this.selectedFile = null;
                this.showToast('Submission Successful', `"${createdDoc.title}" queued for review!`, 'success');
                this.refreshStats();
              },
              error: err => {
                this.isUploading.set(false);
                this.showToast('Database Error', err?.error?.message || 'Failed to record document metadata in database.', 'danger');
              }
            });
          },
          error: err => {
            this.isUploading.set(false);
            this.showToast('Storage Error', err?.error?.message || 'Failed to upload binary file to storage.', 'danger');
          }
        });
      },
      error: err => {
        this.isUploading.set(false);
        this.showToast('Upload Error', err?.error?.message || 'Failed to request upload signature.', 'danger');
      }
    });
  }

  // --- DOCUMENT REVISION / RE-UPLOAD (Submitter Use Case) ---
  public onRevisionFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedRevisionFile = input.files[0];
    }
  }

  public openRevisionModal(doc: DocumentItem): void {
    this.selectedDocument.set(doc);
    this.revisionForm.reset({ revisionNotes: '' });
    this.selectedRevisionFile = null;
    this.showRevisionModal.set(true);
  }

  public openUploadNewVersionModal(doc: DocumentItem): void {
    this.openRevisionModal(doc);
  }

  public submitRevision(): void {
    const doc = this.selectedDocument();
    if (!doc) return;

    if (!this.selectedRevisionFile) {
      this.showToast('File Required', 'Please select a revised file to upload.', 'danger');
      return;
    }

    const file = this.selectedRevisionFile;
    const notes = this.revisionForm.value.revisionNotes || '';
    this.isRevising.set(true);
    this.revisionProgress.set(25);

    this.storageService.getPresignedUploadUrl(file.name, file.type || 'application/octet-stream', file.size).subscribe({
      next: presignedRes => {
        this.revisionProgress.set(60);

        this.storageService.uploadBinaryDirect(presignedRes.uploadUrl, file, presignedRes.requiredHeaders).subscribe({
          next: () => {
            this.revisionProgress.set(85);

            this.docService.reviseDocument(doc.id, {
              originalFileName: file.name,
              storedFileKey: presignedRes.fileKey,
              contentType: file.type || 'application/octet-stream',
              fileSizeBytes: file.size,
              storageProvider: presignedRes.provider,
              revisionNotes: notes
            }).subscribe({
              next: revisedDoc => {
                this.revisionProgress.set(100);
                this.isRevising.set(false);
                this.showRevisionModal.set(false);
                this.selectedDocument.set(revisedDoc);
                this.documents.update(docs => docs.map(d => d.id === revisedDoc.id ? revisedDoc : d));
                this.selectedRevisionFile = null;
                this.showToast('Revision Submitted', `"${revisedDoc.title}" (v${revisedDoc.versionNumber}) is now submitted for re-review.`, 'success');
                this.refreshStats();
              },
              error: err => {
                this.isRevising.set(false);
                this.showToast('Revision Error', err?.error?.message || 'Failed to update document revision in database.', 'danger');
              }
            });
          },
          error: err => {
            this.isRevising.set(false);
            this.showToast('Storage Error', err?.error?.message || 'Failed to upload revised file.', 'danger');
          }
        });
      },
      error: err => {
        this.isRevising.set(false);
        this.showToast('Signature Error', err?.error?.message || 'Failed to get storage signature.', 'danger');
      }
    });
  }

  // --- REVIEWER ACTIONS & WORKFLOW DECISION MODAL ---
  public openDecisionModal(doc: DocumentItem, decision: ReviewDecisionType = 'Approved'): void {
    this.selectedDocument.set(doc);
    this.pendingDecisionType.set(decision);
    this.showReviewDecisionModal.set(true);
  }

  public openReviewModal(doc: DocumentItem, decision: ReviewDecisionType = 'Approved'): void {
    this.openDecisionModal(doc, decision);
  }

  public onReviewStatusUpdated(updatedDoc: DocumentItem): void {
    this.selectedDocument.set(updatedDoc);
    this.documents.update(docs => docs.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    this.refreshStats();
  }

  // --- COMMENTS & REVIEWS ---
  public postComment(doc: DocumentItem): void {
    const content = this.newCommentContent().trim();
    if (!content) return;

    const isInternal = this.isInternalComment();
    this.docService.addComment(doc.id, content, isInternal).subscribe({
      next: newComment => {
        this.newCommentContent.set('');
        this.isInternalComment.set(false);
        const updatedComments = [...(doc.comments || []), newComment];
        const updatedDoc = { ...doc, comments: updatedComments };
        this.selectedDocument.set(updatedDoc);
        this.documents.update(docs => docs.map(d => d.id === doc.id ? updatedDoc : d));
      },
      error: err => {
        this.showToast('Comment Failed', err?.error?.message || 'Could not submit comment.', 'danger');
      }
    });
  }

  // --- DOWNLOAD ---
  public downloadDocument(doc: DocumentItem): void {
    this.storageService.getDownloadUrl(doc.storedFileKey, doc.originalFileName).subscribe({
      next: res => {
        window.open(res.downloadUrl, '_blank');
      },
      error: err => {
        this.showToast('Download Error', err?.error?.message || 'Failed to generate download URL.', 'danger');
      }
    });
  }

  public downloadVersion(ver: DocumentVersion): void {
    this.storageService.getDownloadUrl(ver.storedFileKey, ver.originalFileName).subscribe({
      next: res => {
        window.open(res.downloadUrl, '_blank');
      },
      error: err => {
        this.showToast('Download Error', err?.error?.message || 'Failed to generate download URL for this version.', 'danger');
      }
    });
  }

  // --- ADMIN ACTIONS ---
  public triggerStorageSync(): void {
    this.isSyncingStorage.set(true);
    this.adminService.syncStorage().subscribe({
      next: res => {
        this.isSyncingStorage.set(false);
        this.showToast('Storage Synchronized', res.status, 'success');
        this.loadAdminData();
        this.refreshStats();
      },
      error: err => {
        this.isSyncingStorage.set(false);
        this.showToast('Sync Failed', err?.error?.message || 'Storage synchronization failed.', 'danger');
      }
    });
  }

  public createNewUser(): void {
    if (this.createUserForm.invalid) return;

    const val = this.createUserForm.value;
    this.adminService.createUser({
      fullName: val.fullName!,
      email: val.email!,
      role: val.role as UserRole,
      department: val.department!,
      storageQuotaMb: val.storageQuotaMb!
    }).subscribe({
      next: user => {
        this.showCreateUserModal.set(false);
        this.createUserForm.reset({
          role: UserRole.Submitter,
          department: 'Engineering',
          storageQuotaMb: 1024
        });
        this.adminUsers.update(users => [user, ...users]);
        this.authService.getAvailableUsers().subscribe();
        this.showToast('User Created', `${user.fullName} added with role ${user.role}.`, 'success');
      },
      error: err => {
        this.showToast('Error', err?.error?.message || 'Failed to create user.', 'danger');
      }
    });
  }

  public assignUserRole(user: UserAdmin, newRole: string): void {
    this.adminService.assignRole(user.id, newRole as UserRole).subscribe({
      next: updated => {
        this.adminUsers.update(users => users.map(u => u.id === updated.id ? updated : u));
        this.authService.getAvailableUsers().subscribe();
        this.showToast('Role Re-assigned', `${updated.fullName} is now a ${updated.role}.`, 'success');
      },
      error: err => {
        this.showToast('Error', err?.error?.message || 'Failed to update role.', 'danger');
      }
    });
  }

  public deleteUser(userId: string): void {
    if (!confirm('Are you sure you want to remove this user from the organization?')) return;

    this.adminService.deleteUser(userId).subscribe({
      next: () => {
        this.adminUsers.update(users => users.filter(u => u.id !== userId));
        this.authService.getAvailableUsers().subscribe();
        this.showToast('User Deleted', 'User was removed from the system.', 'info');
      },
      error: err => {
        this.showToast('Delete Error', err?.error?.message || 'Failed to delete user.', 'danger');
      }
    });
  }

  public sendBroadcast(): void {
    if (this.broadcastForm.invalid) return;

    const val = this.broadcastForm.value;
    this.adminService.broadcastNotification(val.title!, val.message!, val.level!).subscribe({
      next: () => {
        this.showBroadcastModal.set(false);
        this.broadcastForm.reset({ level: 'info' });
        this.showToast('Broadcast Dispatched', 'Urgent message broadcasted to all connected clients.', 'success');
      },
      error: err => {
        this.showToast('Broadcast Error', err?.error?.message || 'Failed to dispatch broadcast.', 'danger');
      }
    });
  }

  public filterLogs(level: string): void {
    this.logFilterLevel.set(level);
    this.adminService.getSystemLogs(level).subscribe(logs => this.systemLogs.set(logs));
  }

  public dismissBroadcast(): void {
    this.activeBroadcastBanner.set(null);
  }

  public onPersonaChange(userId: string): void {
    const found = this.authService.availableUsers().find(u => u.id === userId);
    if (found) {
      this.authService.switchUser(found);
      this.showToast('Persona Switched', `Active user: ${found.fullName} (${this.authService.getRoleLabel(found.role)})`, 'info');
    }
  }

  private refreshStats(): void {
    this.docService.getDashboardStats().subscribe(stats => this.stats.set(stats));
  }

  public showToast(title: string, message: string, type: string): void {
    this.toastService.show(title, message, (type as any) || 'info');
  }
}
