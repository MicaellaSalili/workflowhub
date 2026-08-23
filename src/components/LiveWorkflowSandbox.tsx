import React, { useState } from 'react';
import { 
  WorkflowDocument, 
  UserPersona, 
  DocumentStatus, 
  StorageMode, 
  CommentItem, 
  SignalREventLog 
} from '../types/workflow';
import { INITIAL_DOCUMENTS, INITIAL_PERSONAS } from '../data/mockDocuments';
import { DocumentModal } from './DocumentModal';
import { 
  Upload, 
  Cloud, 
  HardDrive, 
  Radio, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  MessageSquare, 
  History, 
  Download, 
  Send, 
  Users, 
  Search, 
  Filter, 
  Check, 
  Zap, 
  ArrowUpRight, 
  Shield, 
  UserCheck,
  ChevronRight,
  Layers,
  Sparkles,
  Info,
  CheckCircle,
  Eye
} from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface LiveWorkflowSandboxProps {
  documents?: WorkflowDocument[];
  onUpdateDocuments?: (docs: WorkflowDocument[]) => void;
  currentUser?: UserPersona;
  onSwitchUser?: (user: UserPersona) => void;
  users?: UserPersona[];
  wsLogs?: SignalREventLog[];
  onAddWsLog?: (event: SignalREventLog['event'], summary: string, payload: any) => void;
  onShowToast?: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  storageMode?: StorageMode;
  onSetStorageMode?: (mode: StorageMode) => void;
  onNavigateToAdmin?: () => void;
  onNavigateToActivity?: () => void;
}

export const LiveWorkflowSandbox: React.FC<LiveWorkflowSandboxProps> = ({
  documents: externalDocs,
  onUpdateDocuments,
  currentUser: externalUser,
  onSwitchUser,
  users: externalUsers,
  wsLogs: externalWsLogs,
  onAddWsLog: externalAddWsLog,
  onShowToast: externalShowToast,
  storageMode: externalStorageMode,
  onSetStorageMode,
  onNavigateToAdmin,
  onNavigateToActivity
}) => {
  const [internalDocs, setInternalDocs] = useState<WorkflowDocument[]>(INITIAL_DOCUMENTS);
  const [internalUser, setInternalUser] = useState<UserPersona>(INITIAL_PERSONAS[0]);
  const [internalStorageMode, setInternalStorageMode] = useState<StorageMode>('AwsS3');
  const [internalWsLogs, setInternalWsLogs] = useState<SignalREventLog[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const documents = externalDocs || internalDocs;
  const setDocuments = onUpdateDocuments || setInternalDocs;
  const currentUser = externalUser || internalUser;
  const setCurrentUser = onSwitchUser || setInternalUser;
  const users = externalUsers || INITIAL_PERSONAS;
  const storageMode = externalStorageMode || internalStorageMode;
  const setStorageMode = onSetStorageMode || setInternalStorageMode;
  const wsLogs = externalWsLogs || internalWsLogs;

  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || INITIAL_DOCUMENTS[0].id);
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'pending' | 'approved' | 'changes'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isInternalNote, setIsInternalNote] = useState<boolean>(false);
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'discussion' | 'audit'>('overview');

  // Review modal state
  const [reviewAction, setReviewAction] = useState<DocumentStatus | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState<string>('');

  const selectedDoc = documents.find(d => d.id === selectedDocId) || documents[0] || INITIAL_DOCUMENTS[0];

  const showToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (externalShowToast) {
      externalShowToast(title, message, type);
      return;
    }
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const addWsLog = (event: SignalREventLog['event'], summary: string, payload: any) => {
    if (externalAddWsLog) {
      externalAddWsLog(event, summary, payload);
      return;
    }
    const log: SignalREventLog = {
      id: Math.random().toString(36).substring(2, 9),
      event,
      timestamp: new Date().toLocaleTimeString(),
      summary,
      payload
    };
    setInternalWsLogs(prev => [log, ...prev.slice(0, 15)]);
  };

  // Stats calculation
  const totalDocs = documents.length;
  const myDocs = documents.filter(d => d.submitterId === currentUser.id).length;
  const pendingDocs = documents.filter(d => d.status === 'Submitted' || d.status === 'UnderReview').length;
  const approvedDocs = documents.filter(d => d.status === 'Approved').length;
  const changesDocs = documents.filter(d => d.status === 'ChangesRequested').length;

  // Filtered documents
  const filteredDocuments = documents.filter(doc => {
    let matchesTab = true;
    if (activeTab === 'my') matchesTab = doc.submitterId === currentUser.id;
    else if (activeTab === 'pending') matchesTab = doc.status === 'Submitted' || doc.status === 'UnderReview';
    else if (activeTab === 'approved') matchesTab = doc.status === 'Approved';
    else if (activeTab === 'changes') matchesTab = doc.status === 'ChangesRequested';

    const matchesCat = selectedCategory === 'All' || doc.category.toLowerCase() === selectedCategory.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      doc.title.toLowerCase().includes(query) ||
      doc.description.toLowerCase().includes(query) ||
      doc.originalFileName.toLowerCase().includes(query) ||
      doc.submitterName.toLowerCase().includes(query);

    return matchesTab && matchesCat && matchesSearch;
  });

  const handleCreateDocument = (newDocData: Partial<WorkflowDocument>) => {
    const fullDoc: WorkflowDocument = {
      id: 'doc-' + Math.random().toString(36).substring(2, 9),
      title: newDocData.title || 'Untitled Document',
      description: newDocData.description || '',
      category: newDocData.category || 'Architecture',
      originalFileName: newDocData.originalFileName || 'document.pdf',
      storedFileKey: newDocData.storedFileKey || `documents/${newDocData.originalFileName}`,
      fileSizeBytes: newDocData.fileSizeBytes || 3100000,
      contentType: newDocData.contentType || 'application/pdf',
      storageProvider: storageMode,
      status: 'Submitted',
      versionNumber: 1,
      submitterId: currentUser.id,
      submitterName: currentUser.name,
      createdAt: new Date().toISOString(),
      comments: [],
      auditLogs: newDocData.auditLogs || [
        {
          id: 'audit-' + Math.random().toString(36).substring(2, 9),
          action: 'Document Submitted',
          performedBy: currentUser.name,
          details: `Direct binary upload via ${storageMode === 'AwsS3' ? 'AWS S3 Pre-signed URL' : 'Local Filesystem'}.`,
          timestamp: new Date().toISOString()
        }
      ]
    };

    setDocuments([fullDoc, ...documents]);
    setSelectedDocId(fullDoc.id);

    // Simulate SignalR WebSocket Push
    addWsLog('DocumentCreated', `New Submission: "${fullDoc.title}" by ${currentUser.name}`, {
      documentId: fullDoc.id,
      title: fullDoc.title,
      submitter: currentUser.name,
      storageProvider: storageMode,
      timestamp: new Date().toISOString()
    });

    showToast(
      'Document Submitted Successfully',
      `"${fullDoc.title}" is now active in the review queue.`,
      'success'
    );
  };

  const handleStatusChange = (newStatus: DocumentStatus, reviewNote?: string) => {
    if (!selectedDoc) return;

    if (currentUser.role === 'Submitter') {
      showToast(
        'RBAC Authorization Notice',
        `Role "${currentUser.role}" cannot execute approvals or rejections. Please switch to a Reviewer or Admin persona using the top role switcher.`,
        'warning'
      );
      return;
    }

    const previousStatus = selectedDoc.status;
    const reviewerName = currentUser.name;

    const updatedDoc: WorkflowDocument = {
      ...selectedDoc,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      assignedReviewerName: reviewerName,
      reviewedAt: newStatus === 'Approved' || newStatus === 'Rejected' ? new Date().toISOString() : selectedDoc.reviewedAt,
      auditLogs: [
        {
          id: 'audit-' + Math.random().toString(36).substring(2, 9),
          action: `Status Transition: ${previousStatus} -> ${newStatus}`,
          performedBy: reviewerName,
          details: reviewNote || `Status updated to ${newStatus}.`,
          timestamp: new Date().toISOString()
        },
        ...selectedDoc.auditLogs
      ]
    };

    if (reviewNote) {
      updatedDoc.comments = [
        ...selectedDoc.comments,
        {
          id: 'c-' + Math.random().toString(36).substring(2, 9),
          authorId: currentUser.id,
          authorName: reviewerName,
          authorRole: currentUser.role,
          content: `[Decision: ${newStatus}] ${reviewNote}`,
          isInternalNote: false,
          createdAt: new Date().toISOString()
        }
      ];
    }

    setDocuments(documents.map(d => d.id === selectedDoc.id ? updatedDoc : d));
    setReviewAction(null);
    setReviewRemarks('');

    // SignalR broadcast
    addWsLog('DocumentStatusChanged', `Status Updated: "${selectedDoc.title}" -> ${newStatus}`, {
      documentId: selectedDoc.id,
      previousStatus,
      newStatus,
      reviewerName,
      remarks: reviewNote
    });

    showToast(
      `Decision Recorded: ${newStatus}`,
      `"${selectedDoc.title}" has been updated by ${reviewerName}.`,
      newStatus === 'Approved' ? 'success' : newStatus === 'Rejected' ? 'error' : 'warning'
    );
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedDoc) return;

    const newComment: CommentItem = {
      id: 'c-' + Math.random().toString(36).substring(2, 9),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      content: newCommentText.trim(),
      isInternalNote,
      createdAt: new Date().toISOString()
    };

    const updatedDoc: WorkflowDocument = {
      ...selectedDoc,
      comments: [...selectedDoc.comments, newComment]
    };

    setDocuments(documents.map(d => d.id === selectedDoc.id ? updatedDoc : d));
    setNewCommentText('');

    addWsLog('DocumentCommentAdded', `New comment on "${selectedDoc.title}" by ${currentUser.name}`, newComment);
    showToast('Comment Dispatched', `${currentUser.name} posted a comment in the review thread.`, 'info');
  };

  const handleDownload = (doc: WorkflowDocument) => {
    showToast(
      'Pre-Signed File Access Granted',
      doc.storageProvider === 'AwsS3'
        ? `Generating temporary AWS S3 SigV4 Pre-signed GET URL for "${doc.originalFileName}" (Direct Cloud Transfer)...`
        : `Streaming file binary directly from Local Filesystem storage for "${doc.originalFileName}"...`,
      'success'
    );
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'Approved':
        return {
          label: 'Approved',
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />
        };
      case 'UnderReview':
        return {
          label: 'Under Review',
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: <Clock className="w-3.5 h-3.5" />
        };
      case 'ChangesRequested':
        return {
          label: 'Changes Requested',
          color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
          icon: <AlertTriangle className="w-3.5 h-3.5" />
        };
      case 'Rejected':
        return {
          label: 'Rejected',
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: <XCircle className="w-3.5 h-3.5" />
        };
      default:
        return {
          label: 'Submitted',
          color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          icon: <Clock className="w-3.5 h-3.5" />
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Role-Aware Executive Header Banner */}
      <div className="bg-[#121216] rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
              currentUser.role === 'Submitter'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : currentUser.role === 'Reviewer'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            }`}>
              {currentUser.role} View
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Signed in as <strong className="text-slate-200">{currentUser.name}</strong> &bull; {currentUser.department}
            </span>
          </div>

          <h2 className="text-xl font-bold text-white mt-1.5">
            {currentUser.role === 'Submitter' && 'My Submissions & Document Lifecycle Workspace'}
            {currentUser.role === 'Reviewer' && 'Review Queue & Architectural Approval Desk'}
            {currentUser.role === 'Admin' && 'Enterprise Document Management & Governance Desk'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {currentUser.role === 'Submitter' && 'Upload engineering RFCs, track compliance status across stages in real-time, and collaborate with reviewers.'}
            {currentUser.role === 'Reviewer' && 'Audit submitted architecture specs, verify regulatory requirements, and issue formal approvals or revision requests.'}
            {currentUser.role === 'Admin' && 'Oversee organization-wide document flows, manage storage infrastructure, and audit security compliance.'}
          </p>
        </div>

        {/* Global Action Deck */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Storage Mode Toggle */}
          <div className="flex items-center bg-[#0a0a0c] p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                setStorageMode('AwsS3');
                showToast('Storage Provider', 'Using AWS S3 Direct Pre-Signed URLs', 'info');
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                storageMode === 'AwsS3'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              AWS S3
            </button>
            <button
              onClick={() => {
                setStorageMode('LocalFilesystem');
                showToast('Storage Provider', 'Using Local Disk Volume Fallback', 'info');
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                storageMode === 'LocalFilesystem'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              Local Disk
            </button>
          </div>

          {/* New Document Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-[#121216] rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {currentUser.role === 'Submitter' ? 'My Submissions' : 'Total Documents'}
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {currentUser.role === 'Submitter' ? myDocs : totalDocs}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-[#121216] rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pending Review</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{pendingDocs}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-[#121216] rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Approved</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{approvedDocs}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-[#121216] rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Revisions Needed</div>
            <div className="text-2xl font-bold text-orange-400 mt-1">{changesDocs}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content: Left Document Explorer (col-span-7) + Right Inspector (col-span-5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Document Repository & Filters */}
        <div className="lg:col-span-7 bg-[#121216] rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by title, author, file name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0a0a0c] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-[#0a0a0c] border border-slate-800 rounded-xl text-xs text-slate-300 font-medium focus:border-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="All">All Categories</option>
                <option value="Architecture">Architecture</option>
                <option value="Engineering">Engineering</option>
                <option value="Security">Security</option>
                <option value="Operations">Operations</option>
                <option value="Legal">Legal</option>
              </select>
            </div>

            {/* Submitter/Reviewer Tabs */}
            <div className="flex items-center gap-1.5 py-3 overflow-x-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                All Documents ({documents.length})
              </button>

              {currentUser.role === 'Submitter' && (
                <button
                  onClick={() => setActiveTab('my')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'my'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  My Submissions ({myDocs})
                </button>
              )}

              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                Pending Review ({pendingDocs})
              </button>

              <button
                onClick={() => setActiveTab('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                Approved ({approvedDocs})
              </button>

              <button
                onClick={() => setActiveTab('changes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'changes'
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                Changes Requested ({changesDocs})
              </button>
            </div>

            {/* Document Card List */}
            <div className="space-y-3 mt-1 max-h-[580px] overflow-y-auto pr-1">
              {filteredDocuments.map(doc => {
                const isSelected = selectedDoc.id === doc.id;
                const statusBadge = getStatusBadge(doc.status);

                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-950/30 border-indigo-500/60 shadow-lg shadow-indigo-950/20'
                        : 'bg-[#0a0a0c] border-slate-800/80 hover:bg-[#0e0e12] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white truncate max-w-xs">{doc.title}</h4>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            v{doc.versionNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                            {doc.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {doc.description || 'No description provided.'}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                          <span>By <strong className="text-slate-300">{doc.submitterName}</strong></span>
                          <span>&bull;</span>
                          <span>{(doc.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                          <span>&bull;</span>
                          <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border flex items-center gap-1.5 ${statusBadge.color}`}>
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredDocuments.length === 0 && (
                <div className="p-12 text-center text-slate-500 text-xs bg-[#0a0a0c] rounded-xl border border-slate-800">
                  No documents found matching your filter criteria.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Document Inspector & Decision Center */}
        <div className="lg:col-span-5 bg-[#121216] rounded-2xl p-6 border border-slate-800 flex flex-col justify-between space-y-5">
          <div>
            {/* Inspector Top Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                    {selectedDoc.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">v{selectedDoc.versionNumber}.0</span>
                </div>
                <h3 className="text-base font-bold text-white mt-1.5 line-clamp-2">{selectedDoc.title}</h3>
                <div className="text-xs text-slate-400 mt-1">
                  Submitted by <strong className="text-slate-200">{selectedDoc.submitterName}</strong> on {new Date(selectedDoc.createdAt).toLocaleDateString()}
                </div>
              </div>

              <button
                onClick={() => handleDownload(selectedDoc)}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                title="Download file payload via pre-signed URL"
              >
                <Download className="w-4 h-4 text-indigo-400" />
              </button>
            </div>

            {/* Real-time Status Stepper */}
            <div className="mt-4 p-4 bg-[#0a0a0c] rounded-xl border border-slate-800">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Lifecycle Status Progression
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-[11px]">
                    ✓
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium">Submitted</span>
                </div>

                <div className="flex-1 h-0.5 bg-slate-800 mx-2">
                  <div className={`h-full ${selectedDoc.status !== 'Submitted' ? 'bg-indigo-500' : 'bg-transparent'}`} />
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] border ${
                    selectedDoc.status === 'UnderReview' || selectedDoc.status === 'ChangesRequested' || selectedDoc.status === 'Approved'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}>
                    2
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium">Review</span>
                </div>

                <div className="flex-1 h-0.5 bg-slate-800 mx-2">
                  <div className={`h-full ${selectedDoc.status === 'Approved' || selectedDoc.status === 'Rejected' || selectedDoc.status === 'ChangesRequested' ? 'bg-indigo-500' : 'bg-transparent'}`} />
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] border ${
                    selectedDoc.status === 'Approved'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : selectedDoc.status === 'ChangesRequested'
                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                      : selectedDoc.status === 'Rejected'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}>
                    {selectedDoc.status === 'Approved' ? '✓' : selectedDoc.status === 'Rejected' ? '✕' : '3'}
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium">
                    {selectedDoc.status === 'Approved' ? 'Approved' : selectedDoc.status === 'Rejected' ? 'Rejected' : selectedDoc.status === 'ChangesRequested' ? 'Revisions' : 'Decision'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reviewer Action Bar (RBAC Enforced) */}
            <div className="mt-4 p-4 rounded-xl border border-slate-800 bg-[#0a0a0c] space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Review Decision Center</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  currentUser.role === 'Reviewer' || currentUser.role === 'Admin'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {currentUser.role === 'Reviewer' || currentUser.role === 'Admin' ? 'Authorized Reviewer' : 'Read Only'}
                </span>
              </div>

              {currentUser.role === 'Reviewer' || currentUser.role === 'Admin' ? (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setReviewAction('Approved')}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => setReviewAction('ChangesRequested')}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Revisions
                  </button>
                  <button
                    onClick={() => setReviewAction('Rejected')}
                    className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    Your submission is awaiting review from the architecture board. Switch to <strong>Alex Rivera (Reviewer)</strong> in the top role selector to test approval workflows.
                  </span>
                </div>
              )}
            </div>

            {/* Tabbed Inspector: Overview, Discussion, Audit Trail */}
            <div className="mt-4">
              <div className="flex items-center gap-1 border-b border-slate-800 pb-2 text-xs">
                <button
                  onClick={() => setInspectorTab('overview')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    inspectorTab === 'overview' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  File Specs
                </button>
                <button
                  onClick={() => setInspectorTab('discussion')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    inspectorTab === 'discussion' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Discussion ({selectedDoc.comments.length})
                </button>
                <button
                  onClick={() => setInspectorTab('audit')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    inspectorTab === 'audit' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Audit Trail ({selectedDoc.auditLogs.length})
                </button>
              </div>

              {/* Tab 1: File Specs & Storage */}
              {inspectorTab === 'overview' && (
                <div className="mt-3 space-y-3 text-xs">
                  <div className="p-3 bg-[#0a0a0c] rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>File Name:</span>
                      <span className="font-semibold text-slate-200 font-mono">{selectedDoc.originalFileName}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Storage Provider:</span>
                      <span className="font-semibold text-indigo-400 flex items-center gap-1">
                        {selectedDoc.storageProvider === 'AwsS3' ? <Cloud className="w-3.5 h-3.5" /> : <HardDrive className="w-3.5 h-3.5" />}
                        {selectedDoc.storageProvider === 'AwsS3' ? 'AWS S3 Cloud Bucket' : 'Local Filesystem Volume'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Object Size:</span>
                      <span className="font-mono font-semibold text-emerald-400">
                        {(selectedDoc.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Storage Key:</span>
                      <span className="font-mono text-[11px] text-slate-400 truncate max-w-[200px]">
                        {selectedDoc.storedFileKey}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0a0a0c] rounded-xl border border-slate-800">
                    <div className="text-slate-400 font-semibold mb-1">Executive Summary</div>
                    <p className="text-slate-300 leading-relaxed text-xs">
                      {selectedDoc.description || 'Production architectural RFC and system design documentation.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Discussion Thread */}
              {inspectorTab === 'discussion' && (
                <div className="mt-3 space-y-3">
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {selectedDoc.comments.map(comment => (
                      <div key={comment.id} className="p-3 rounded-xl bg-[#0a0a0c] border border-slate-800 text-xs">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span className="font-bold text-slate-200">{comment.authorName}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {comment.authorRole}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{comment.content}</p>
                      </div>
                    ))}
                    {selectedDoc.comments.length === 0 && (
                      <div className="text-xs text-slate-500 text-center py-6">
                        No review comments yet. Post feedback below.
                      </div>
                    )}
                  </div>

                  {/* Comment Input */}
                  <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-slate-800">
                    <input
                      type="text"
                      placeholder={`Post comment as ${currentUser.name}...`}
                      value={newCommentText}
                      onChange={e => setNewCommentText(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#0a0a0c] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 3: Immutable Audit Trail */}
              {inspectorTab === 'audit' && (
                <div className="mt-3 space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedDoc.auditLogs.map(log => (
                    <div key={log.id} className="p-2.5 bg-[#0a0a0c] rounded-xl border border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{log.action}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-indigo-400 mt-0.5">By {log.performedBy}</div>
                      <div className="text-slate-400 text-[11px] mt-1 leading-relaxed">{log.details}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Review Decision Modal Prompt */}
      {reviewAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121216] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-150 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                Confirm Review Decision: <span className="text-indigo-300">{reviewAction}</span>
              </h3>
              <button onClick={() => setReviewAction(null)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-300">
                You are executing a workflow state transition for <strong>{selectedDoc.title}</strong> as <strong>{currentUser.name}</strong> ({currentUser.role}).
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Review Remarks / Audit Note {reviewAction === 'ChangesRequested' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={reviewRemarks}
                  onChange={e => setReviewRemarks(e.target.value)}
                  placeholder="Provide architectural feedback or compliance justification..."
                  className="w-full px-3.5 py-2 text-xs bg-[#0a0a0c] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewAction(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(reviewAction, reviewRemarks)}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer ${
                    reviewAction === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' :
                    reviewAction === 'ChangesRequested' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30' :
                    'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  Confirm & Broadcast Decision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      <DocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUser={currentUser}
        activeStorageMode={storageMode}
        onSubmit={handleCreateDocument}
      />
    </div>
  );
};
