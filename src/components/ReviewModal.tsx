import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  X, 
  FileText, 
  User, 
  Tag, 
  MessageSquare,
  Sparkles,
  Loader2
} from 'lucide-react';
import { WorkflowDocument, DocumentStatus, UserPersona } from '../types/workflow';

export type ReviewDecision = 'Approved' | 'ChangesRequested' | 'Rejected';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: WorkflowDocument | null;
  currentUser: UserPersona;
  initialDecision?: ReviewDecision;
  onConfirmDecision: (decision: DocumentStatus, reviewNote: string) => Promise<void> | void;
  onShowToast?: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  currentUser,
  initialDecision = 'Approved',
  onConfirmDecision,
  onShowToast
}) => {
  const [selectedDecision, setSelectedDecision] = useState<ReviewDecision>(initialDecision);
  const [feedbackNote, setFeedbackNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (initialDecision) {
      setSelectedDecision(initialDecision);
    }
  }, [initialDecision]);

  useEffect(() => {
    if (isOpen && doc) {
      if (selectedDecision === 'Approved') {
        setFeedbackNote('Architecture, security, and compliance requirements verified and approved.');
      } else if (selectedDecision === 'ChangesRequested') {
        setFeedbackNote('Please update the specifications and diagrams in Section 3, then re-upload a new version.');
      } else if (selectedDecision === 'Rejected') {
        setFeedbackNote('Does not comply with enterprise architecture standards.');
      }
    }
  }, [isOpen, selectedDecision, doc]);

  if (!isOpen || !doc) return null;

  const handleSelectDecision = (decision: ReviewDecision) => {
    setSelectedDecision(decision);
    if (decision === 'Approved') {
      setFeedbackNote('Architecture, security, and compliance requirements verified and approved.');
    } else if (decision === 'ChangesRequested') {
      setFeedbackNote('Please update the specifications and diagrams in Section 3, then re-upload a new version.');
    } else if (decision === 'Rejected') {
      setFeedbackNote('Does not comply with enterprise architecture standards.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((selectedDecision === 'ChangesRequested' || selectedDecision === 'Rejected') && !feedbackNote.trim()) {
      if (onShowToast) {
        onShowToast('Feedback Required', `Please provide justification or feedback when selecting "${selectedDecision}".`, 'warning');
      }
      return;
    }

    if (currentUser.role === 'Submitter') {
      if (onShowToast) {
        onShowToast(
          'RBAC Authorization Restricted',
          'Role "Submitter" cannot sign off on reviews. Please switch to a Reviewer or Admin persona.',
          'warning'
        );
      }
      return;
    }

    try {
      setIsSubmitting(true);
      // Execute API service call (using mock endpoint simulation pattern)
      await new Promise(resolve => setTimeout(resolve, 400));
      await onConfirmDecision(selectedDecision as DocumentStatus, feedbackNote.trim());
      
      if (onShowToast) {
        onShowToast(
          'Decision Applied',
          `Document "${doc.title}" successfully transitioned to ${selectedDecision}.`,
          'success'
        );
      }
      onClose();
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('Transition Error', err?.message || 'Failed to submit review decision.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-[#121216] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-150 text-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              selectedDecision === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              selectedDecision === 'ChangesRequested' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
              'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 id="review-modal-title" className="text-base font-bold text-white">Review Document Decision</h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{doc.title} (v{doc.versionNumber})</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-all cursor-pointer"
            aria-label="Close review dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Quick Metadata Summary */}
        <div className="mt-4 p-3 bg-[#0a0a0c] rounded-xl border border-slate-800/80 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Submitter</span>
            <span className="font-semibold text-slate-200 truncate block">{doc.submitterName}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Category</span>
            <span className="font-semibold text-yellow-400">{doc.category}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Current Status</span>
            <span className="font-semibold text-slate-300">{doc.status}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Decision Outcome Radio-Button Group */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Review Outcome *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Approve Option */}
              <button
                type="button"
                onClick={() => handleSelectDecision('Approved')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  selectedDecision === 'Approved'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/30'
                    : 'bg-[#0a0a0c] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <CheckCircle2 className={`w-4 h-4 ${selectedDecision === 'Approved' ? 'text-emerald-400' : 'text-slate-500'}`} />
                  {selectedDecision === 'Approved' && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                </div>
                <div>
                  <span className="block text-xs font-bold text-emerald-300">Approve</span>
                  <span className="text-[10px] text-slate-400 line-clamp-1">Compliant & passed</span>
                </div>
              </button>

              {/* Request Changes Option */}
              <button
                type="button"
                onClick={() => handleSelectDecision('ChangesRequested')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  selectedDecision === 'ChangesRequested'
                    ? 'bg-amber-950/40 border-amber-500 text-white shadow-lg shadow-amber-950/30'
                    : 'bg-[#0a0a0c] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <AlertTriangle className={`w-4 h-4 ${selectedDecision === 'ChangesRequested' ? 'text-amber-400' : 'text-slate-500'}`} />
                  {selectedDecision === 'ChangesRequested' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                </div>
                <div>
                  <span className="block text-xs font-bold text-amber-300">Request Changes</span>
                  <span className="text-[10px] text-slate-400 line-clamp-1">Require v{doc.versionNumber + 1}</span>
                </div>
              </button>

              {/* Reject Option */}
              <button
                type="button"
                onClick={() => handleSelectDecision('Rejected')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  selectedDecision === 'Rejected'
                    ? 'bg-rose-950/40 border-rose-500 text-white shadow-lg shadow-rose-950/30'
                    : 'bg-[#0a0a0c] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <XCircle className={`w-4 h-4 ${selectedDecision === 'Rejected' ? 'text-rose-400' : 'text-slate-500'}`} />
                  {selectedDecision === 'Rejected' && <span className="w-2 h-2 rounded-full bg-rose-400" />}
                </div>
                <div>
                  <span className="block text-xs font-bold text-rose-300">Reject</span>
                  <span className="text-[10px] text-slate-400 line-clamp-1">Decline submission</span>
                </div>
              </button>
            </div>
          </div>

          {/* Feedback & Justification Note */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="feedbackNote" className="block text-xs font-bold text-slate-300">
                Reviewer Remarks / Decision Note
                {(selectedDecision === 'ChangesRequested' || selectedDecision === 'Rejected') && (
                  <span className="text-rose-400 ml-1">*</span>
                )}
              </label>
              <span className="text-[11px] text-slate-500">
                {selectedDecision === 'Approved' ? 'Optional sign-off note' : 'Specify required updates'}
              </span>
            </div>
            <textarea
              id="feedbackNote"
              rows={4}
              value={feedbackNote}
              onChange={e => setFeedbackNote(e.target.value)}
              placeholder="Provide architectural feedback or compliance justification..."
              className="w-full px-3.5 py-2.5 text-xs bg-[#0a0a0c] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                selectedDecision === 'Approved'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : selectedDecision === 'ChangesRequested'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>
                  Confirm {selectedDecision === 'Approved' ? 'Approval' : selectedDecision === 'ChangesRequested' ? 'Change Request' : 'Rejection'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
