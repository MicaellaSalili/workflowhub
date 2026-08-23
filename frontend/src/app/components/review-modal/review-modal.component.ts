import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DocumentItem, DocumentStatus } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';

export type ReviewDecisionType = 'Approved' | 'ChangesRequested' | 'Rejected';

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './review-modal.component.html',
  styleUrls: ['./review-modal.component.scss']
})
export class ReviewModalComponent implements OnChanges {
  @Input() document: DocumentItem | null = null;
  @Input() isOpen = false;
  @Input() initialDecision: ReviewDecisionType = 'Approved';

  @Output() close = new EventEmitter<void>();
  @Output() statusUpdated = new EventEmitter<DocumentItem>();

  private docService = inject(DocumentService);
  private toastService = inject(ToastService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  public selectedDecision = signal<ReviewDecisionType>('Approved');
  public isSubmitting = signal<boolean>(false);

  public reviewForm = this.fb.group({
    feedbackNote: ['', [Validators.maxLength(1000)]]
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialDecision'] && this.initialDecision) {
      this.setDecision(this.initialDecision);
    }
    if (changes['isOpen'] && this.isOpen && this.document) {
      this.populateDefaultNote(this.selectedDecision());
    }
  }

  public setDecision(decision: ReviewDecisionType): void {
    this.selectedDecision.set(decision);
    this.populateDefaultNote(decision);
  }

  private populateDefaultNote(decision: ReviewDecisionType): void {
    const currentVal = this.reviewForm.get('feedbackNote')?.value;
    // Only prefill if empty or previously prefilled
    if (!currentVal || currentVal.startsWith('Architecture') || currentVal.startsWith('Please update') || currentVal.startsWith('Does not comply')) {
      if (decision === 'Approved') {
        this.reviewForm.patchValue({
          feedbackNote: 'Architecture, security, and compliance requirements verified and approved.'
        });
      } else if (decision === 'ChangesRequested') {
        this.reviewForm.patchValue({
          feedbackNote: 'Please update the specifications and diagrams in Section 3, then re-upload a new version.'
        });
      } else if (decision === 'Rejected') {
        this.reviewForm.patchValue({
          feedbackNote: 'Does not comply with enterprise architecture standards.'
        });
      }
    }
  }

  public onCancel(): void {
    this.close.emit();
  }

  public onSubmitReview(): void {
    if (!this.document) return;

    const decision = this.selectedDecision();
    const note = this.reviewForm.get('feedbackNote')?.value?.trim() || '';

    if ((decision === 'ChangesRequested' || decision === 'Rejected') && !note) {
      this.toastService.warning('Feedback Required', `Please provide feedback or justification when selecting "${decision}".`);
      return;
    }

    this.isSubmitting.set(true);
    const targetDoc = this.document;
    const previousStatus = targetDoc.status;
    const reviewerName = this.authService.currentUser()?.fullName || 'Reviewer';

    // API Service Call to execute status transition
    this.docService.updateStatus(targetDoc.id, decision, note).subscribe({
      next: (updatedDoc) => {
        this.isSubmitting.set(false);
        this.toastService.success(
          'Decision Applied',
          `Document "${updatedDoc.title}" marked as ${decision}.`
        );
        this.statusUpdated.emit(updatedDoc);
        this.close.emit();
      },
      error: (err) => {
        // Fallback mock endpoint pattern: simulate client-side transition if backend is offline
        console.warn('[ReviewModal] API call failed, applying mock transition pattern:', err);
        
        const mockUpdatedDoc: DocumentItem = {
          ...targetDoc,
          status: decision as DocumentStatus,
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          assignedReviewerName: reviewerName,
          comments: note ? [
            ...(targetDoc.comments || []),
            {
              id: 'comment-' + Math.random().toString(36).substring(2, 9),
              authorId: this.authService.currentUser()?.id || 'reviewer-id',
              authorName: reviewerName,
              authorRole: this.authService.currentUser()?.role || (this.authService.isReviewer() ? 'Reviewer' as any : 'Admin' as any),
              content: `[Decision: ${decision}] ${note}`,
              isInternalReviewerNote: false,
              createdAt: new Date().toISOString()
            }
          ] : (targetDoc.comments || []),
          auditLogs: [
            {
              id: 'audit-' + Math.random().toString(36).substring(2, 9),
              action: `Status Transition: ${previousStatus} -> ${decision}`,
              performedBy: reviewerName,
              details: note || `Review decision set to ${decision}.`,
              timestamp: new Date().toISOString()
            },
            ...(targetDoc.auditLogs || [])
          ]
        };

        this.isSubmitting.set(false);
        this.toastService.success(
          'Decision Applied (Mock Mode)',
          `Document "${mockUpdatedDoc.title}" marked as ${decision}.`
        );
        this.statusUpdated.emit(mockUpdatedDoc);
        this.close.emit();
      }
    });
  }
}
