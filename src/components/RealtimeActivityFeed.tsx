import React, { useState } from 'react';
import { 
  SignalREventLog, 
  WorkflowDocument, 
  UserPersona, 
  StorageMode, 
  DocumentStatus 
} from '../types/workflow';
import { 
  Radio, 
  Activity, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  MessageSquare, 
  Shield, 
  Zap, 
  Play, 
  Layers, 
  Code, 
  RefreshCw, 
  Filter, 
  ArrowUpRight,
  Bell,
  Cpu,
  Check,
  Send,
  Cloud,
  HardDrive
} from 'lucide-react';

interface RealtimeActivityFeedProps {
  wsLogs: SignalREventLog[];
  onAddWsLog: (event: SignalREventLog['event'], summary: string, payload: any) => void;
  documents: WorkflowDocument[];
  onUpdateDocuments: (docs: WorkflowDocument[]) => void;
  currentUser: UserPersona;
  users: UserPersona[];
  onShowToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  storageMode: StorageMode;
  onNavigateToDocument?: (docId: string) => void;
}

export const RealtimeActivityFeed: React.FC<RealtimeActivityFeedProps> = ({
  wsLogs,
  onAddWsLog,
  documents,
  onUpdateDocuments,
  currentUser,
  users,
  onShowToast,
  storageMode,
  onNavigateToDocument
}) => {
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<SignalREventLog | null>(wsLogs[0] || null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Filter logs
  const filteredLogs = wsLogs.filter(log => {
    if (selectedEventFilter === 'ALL') return true;
    if (selectedEventFilter === 'STATUS' && log.event === 'DocumentStatusChanged') return true;
    if (selectedEventFilter === 'DOCS' && log.event === 'DocumentCreated') return true;
    if (selectedEventFilter === 'COMMENTS' && log.event === 'DocumentCommentAdded') return true;
    if (selectedEventFilter === 'RBAC' && (log.event === 'UserRoleUpdated' || log.event === 'UserCreated')) return true;
    return true;
  });

  // Event simulation actions for demoing to recruiters / stakeholders
  const simulateNewSubmission = () => {
    setIsSimulating(true);
    const submitter = users.find(u => u.role === 'Submitter') || users[0];
    const categories: Array<'Architecture' | 'Engineering' | 'Security' | 'Legal' | 'Operations'> = ['Architecture', 'Engineering', 'Security', 'Legal', 'Operations'];
    const randomCat = categories[Math.floor(Math.random() * categories.length)];
    const titles = [
      'Microservices Event Schema Migration Spec',
      'PCI-DSS Compliance Tokenization Strategy',
      'High-Throughput Kafka Cluster Topology',
      'API Gateway Rate Limiting & Quota Policy',
      'Disaster Recovery Multi-AZ Failover Playbook'
    ];
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    const fileName = `${randomTitle.replace(/\s+/g, '_')}_v1.pdf`;
    const docId = 'doc-' + Math.random().toString(36).substring(2, 9);

    const newDoc: WorkflowDocument = {
      id: docId,
      title: randomTitle,
      category: randomCat,
      description: `Automated real-time architectural submission for enterprise review.`,
      originalFileName: fileName,
      storedFileKey: `documents/2026/08/${docId}_${fileName}`,
      fileSizeBytes: Math.floor(Math.random() * 4000000) + 1500000,
      contentType: 'application/pdf',
      storageProvider: storageMode,
      status: 'Submitted',
      versionNumber: 1,
      submitterId: submitter.id,
      submitterName: submitter.name,
      createdAt: new Date().toISOString(),
      comments: [],
      auditLogs: [
        {
          id: 'audit-' + Math.random().toString(36).substring(2, 9),
          action: 'Document Submitted',
          performedBy: submitter.name,
          details: `Direct binary upload via ${storageMode === 'AwsS3' ? 'AWS S3 SigV4 Pre-signed URL' : 'LocalFilesystem'}.`,
          timestamp: new Date().toISOString()
        }
      ]
    };

    setTimeout(() => {
      onUpdateDocuments([newDoc, ...documents]);
      const payload = {
        documentId: newDoc.id,
        title: newDoc.title,
        submitter: submitter.name,
        storageProvider: storageMode,
        timestamp: new Date().toISOString()
      };
      onAddWsLog('DocumentCreated', `New Submission: "${newDoc.title}" by ${submitter.name}`, payload);
      onShowToast(
        'SignalR: DocumentCreated',
        `"${newDoc.title}" uploaded by ${submitter.name} and added to the review queue.`,
        'info'
      );
      setIsSimulating(false);
    }, 600);
  };

  const simulateReviewerApproval = () => {
    if (documents.length === 0) return;
    setIsSimulating(true);
    const reviewer = users.find(u => u.role === 'Reviewer') || users[1] || users[0];
    const targetDoc = documents.find(d => d.status === 'Submitted' || d.status === 'UnderReview') || documents[0];

    setTimeout(() => {
      const updatedDocs = documents.map(d => {
        if (d.id === targetDoc.id) {
          return {
            ...d,
            status: 'Approved' as DocumentStatus,
            reviewerId: reviewer.id,
            reviewerName: reviewer.name,
            reviewNotes: 'Architecture standards verified. Production deployment authorized.',
            updatedAt: new Date().toISOString(),
            auditLogs: [
              ...d.auditLogs,
              {
                id: 'audit-' + Math.random().toString(36).substring(2, 9),
                action: 'Status -> Approved',
                performedBy: reviewer.name,
                details: 'Lead reviewer approved document for production implementation.',
                timestamp: new Date().toISOString()
              }
            ]
          };
        }
        return d;
      });

      onUpdateDocuments(updatedDocs);
      const payload = {
        documentId: targetDoc.id,
        previousStatus: targetDoc.status,
        newStatus: 'Approved',
        reviewer: reviewer.name,
        reviewNotes: 'Architecture standards verified.'
      };
      onAddWsLog('DocumentStatusChanged', `Status Updated: "${targetDoc.title}" -> Approved`, payload);
      onShowToast(
        'SignalR: DocumentStatusChanged',
        `"${targetDoc.title}" was approved by ${reviewer.name}.`,
        'success'
      );
      setIsSimulating(false);
    }, 600);
  };

  const simulateRevisionRequest = () => {
    if (documents.length === 0) return;
    setIsSimulating(true);
    const reviewer = users.find(u => u.role === 'Reviewer') || users[1] || users[0];
    const targetDoc = documents[0];

    setTimeout(() => {
      const updatedDocs = documents.map(d => {
        if (d.id === targetDoc.id) {
          return {
            ...d,
            status: 'ChangesRequested' as DocumentStatus,
            reviewerId: reviewer.id,
            reviewerName: reviewer.name,
            reviewNotes: 'Please expand on the failover recovery metrics in section 4.2.',
            updatedAt: new Date().toISOString(),
            auditLogs: [
              ...d.auditLogs,
              {
                id: 'audit-' + Math.random().toString(36).substring(2, 9),
                action: 'Status -> Changes Requested',
                performedBy: reviewer.name,
                details: 'Reviewer requested revisions on the failover section.',
                timestamp: new Date().toISOString()
              }
            ]
          };
        }
        return d;
      });

      onUpdateDocuments(updatedDocs);
      const payload = {
        documentId: targetDoc.id,
        previousStatus: targetDoc.status,
        newStatus: 'ChangesRequested',
        reviewer: reviewer.name,
        remarks: 'Please expand on failover recovery metrics in section 4.2'
      };
      onAddWsLog('DocumentStatusChanged', `Revisions Requested: "${targetDoc.title}" by ${reviewer.name}`, payload);
      onShowToast(
        'SignalR: ChangesRequested',
        `${reviewer.name} requested changes on "${targetDoc.title}".`,
        'warning'
      );
      setIsSimulating(false);
    }, 600);
  };

  const simulatePeerComment = () => {
    if (documents.length === 0) return;
    setIsSimulating(true);
    const author = users[Math.floor(Math.random() * users.length)];
    const targetDoc = documents[0];
    const sampleComments = [
      'Have we accounted for horizontal scaling during peak 99.9th percentile load spikes?',
      'Confirmed: Database migration script tested against staging replica successfully.',
      'Security review complete. TLS 1.3 encryption and cipher suites adhere to corporate standard.',
      'S3 direct pre-signed URL endpoint has been verified with 15-minute token expiry.'
    ];
    const randomComment = sampleComments[Math.floor(Math.random() * sampleComments.length)];

    setTimeout(() => {
      const newComment = {
        id: 'comment-' + Math.random().toString(36).substring(2, 9),
        documentId: targetDoc.id,
        authorId: author.id,
        authorName: author.name,
        authorRole: author.role,
        content: randomComment,
        isInternalNote: false,
        createdAt: new Date().toISOString()
      };

      const updatedDocs = documents.map(d => {
        if (d.id === targetDoc.id) {
          return {
            ...d,
            comments: [...d.comments, newComment]
          };
        }
        return d;
      });

      onUpdateDocuments(updatedDocs);
      onAddWsLog('DocumentCommentAdded', `New Comment on "${targetDoc.title}" by ${author.name}`, newComment);
      onShowToast(
        'SignalR: DocumentCommentAdded',
        `${author.name} commented on "${targetDoc.title}".`,
        'info'
      );
      setIsSimulating(false);
    }, 500);
  };

  const getEventBadge = (event: SignalREventLog['event']) => {
    switch (event) {
      case 'DocumentCreated':
        return {
          label: 'Upload Event',
          color: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
          icon: <FileText className="w-3.5 h-3.5" />
        };
      case 'DocumentStatusChanged':
        return {
          label: 'Status Transition',
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: <Activity className="w-3.5 h-3.5" />
        };
      case 'DocumentCommentAdded':
        return {
          label: 'Review Comment',
          color: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
          icon: <MessageSquare className="w-3.5 h-3.5" />
        };
      case 'UserRoleUpdated':
      case 'UserCreated':
        return {
          label: 'RBAC Event',
          color: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
          icon: <Shield className="w-3.5 h-3.5" />
        };
      default:
        return {
          label: 'System Event',
          color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          icon: <Radio className="w-3.5 h-3.5" />
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Simulation Control Deck */}
      <div className="bg-[#121216] rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              SignalR Real-Time WebSocket Channel
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Live Activity Stream & Event Hub</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Simulates real-time push events dispatched over ASP.NET Core SignalR WebSockets. When team members submit documents, approve reviews, or leave comments, all connected enterprise clients update instantaneously without polling.
          </p>
        </div>

        {/* Live Simulation Quick Trigger Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 bg-[#0a0a0c] p-2 rounded-xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Interactive Demo Triggers:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={simulateNewSubmission}
              disabled={isSimulating}
              className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-yellow-400/20"
              title="Simulate a team member uploading a new architectural document"
            >
              <FileText className="w-3.5 h-3.5" />
              + Sim Upload
            </button>
            <button
              onClick={simulateReviewerApproval}
              disabled={isSimulating || documents.length === 0}
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
              title="Simulate a lead reviewer approving a document"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              + Sim Approval
            </button>
            <button
              onClick={simulateRevisionRequest}
              disabled={isSimulating || documents.length === 0}
              className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
              title="Simulate a reviewer requesting revisions"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              + Sim Revisions
            </button>
            <button
              onClick={simulatePeerComment}
              disabled={isSimulating || documents.length === 0}
              className="px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
              title="Simulate a reviewer posting a comment"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              + Sim Comment
            </button>
          </div>
        </div>
      </div>

      {/* Main Activity View: Event List (Left) + WebSocket Packet Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Real-Time Event Timeline (col-span-7) */}
        <div className="lg:col-span-7 bg-[#121216] rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            {/* Header & Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Broadcast Stream</h3>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                  {wsLogs.length} events
                </span>
              </div>

              {/* Event Filter Pills */}
              <div className="flex items-center gap-1 bg-[#0a0a0c] p-1 rounded-xl border border-slate-800 overflow-x-auto">
                {['ALL', 'DOCS', 'STATUS', 'COMMENTS', 'RBAC'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedEventFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedEventFilter === cat
                        ? 'bg-yellow-400 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Event List */}
            <div className="mt-4 space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center bg-[#0a0a0c] rounded-xl border border-slate-800/80 text-slate-500 text-xs">
                  No real-time events match the selected filter. Click one of the simulation triggers above to generate live events.
                </div>
              ) : (
                filteredLogs.map(log => {
                  const badge = getEventBadge(log.event);
                  const isSelected = selectedLog?.id === log.id;

                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        isSelected
                          ? 'bg-yellow-950/30 border-yellow-400/50 shadow-md'
                          : 'bg-[#0a0a0c] border-slate-800/80 hover:border-slate-700 hover:bg-[#0e0e12]'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 border ${badge.color}`}>
                        {badge.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {log.timestamp}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-slate-200 mt-1 truncate">
                          {log.summary}
                        </div>

                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          Method: <strong className="text-yellow-400">{log.event}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: SignalR WebSocket Protocol & Payload Inspector (col-span-5) */}
        <div className="lg:col-span-5 bg-[#121216] rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">WebSocket Payload Inspector</h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                JSON Protocol v1
              </span>
            </div>

            {selectedLog ? (
              <div className="mt-4 space-y-4">
                <div className="p-3 bg-[#0a0a0c] rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">RPC Event Name:</span>
                    <span className="font-mono font-bold text-yellow-400">{selectedLog.event}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Dispatched At:</span>
                    <span className="font-mono text-slate-300">{selectedLog.timestamp}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Broadcast Target:</span>
                    <span className="font-mono text-emerald-400">Clients.AllInGroup("workflow")</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Raw Event Payload:</span>
                    <span className="text-[10px] text-slate-500 font-mono">Strongly Typed DTO</span>
                  </div>
                  <pre className="p-4 bg-[#0a0a0c] rounded-xl border border-slate-800/90 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-[380px] leading-relaxed select-all">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                Select an event from the timeline to inspect its live SignalR WebSocket payload.
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-[#0a0a0c] rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Transport</div>
              <div className="text-slate-200 font-bold font-mono mt-0.5">WebSockets</div>
            </div>
            <div className="p-2 bg-[#0a0a0c] rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Frame Latency</div>
              <div className="text-emerald-400 font-bold font-mono mt-0.5">&lt; 1.2 ms</div>
            </div>
            <div className="p-2 bg-[#0a0a0c] rounded-lg border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Auto-Reconnect</div>
              <div className="text-yellow-400 font-bold font-mono mt-0.5">Enabled</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
