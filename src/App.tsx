import React, { useState } from 'react';
import { LiveWorkflowSandbox } from './components/LiveWorkflowSandbox';
import { RealtimeActivityFeed } from './components/RealtimeActivityFeed';
import { AdminDashboard } from './components/AdminDashboard';
import { 
  FileText, 
  Shield, 
  Radio, 
  Cloud, 
  HardDrive, 
  Users, 
  X, 
  CheckCircle2, 
  Sparkles,
  Layers
} from 'lucide-react';
import { 
  UserPersona, 
  WorkflowDocument, 
  StorageMode, 
  SignalREventLog, 
  SystemLogEntry, 
  SystemTelemetryStats 
} from './types/workflow';
import { 
  INITIAL_DOCUMENTS, 
  INITIAL_PERSONAS, 
  INITIAL_SYSTEM_LOGS, 
  INITIAL_TELEMETRY_STATS 
} from './data/mockDocuments';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'documents' | 'activity' | 'admin'>('documents');
  
  // Shared state across Workspace, Live Activity, and Admin Console
  const [users, setUsers] = useState<UserPersona[]>(INITIAL_PERSONAS);
  const [currentUser, setCurrentUser] = useState<UserPersona>(INITIAL_PERSONAS[0]); // Sarah Jenkins (Submitter)
  const [documents, setDocuments] = useState<WorkflowDocument[]>(INITIAL_DOCUMENTS);
  const [storageMode, setStorageMode] = useState<StorageMode>('AwsS3');
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>(INITIAL_SYSTEM_LOGS);
  const [telemetryStats, setTelemetryStats] = useState<SystemTelemetryStats>(INITIAL_TELEMETRY_STATS);
  const [wsLogs, setWsLogs] = useState<SignalREventLog[]>([
    {
      id: 'ws-init-1',
      event: 'DocumentStatusChanged',
      timestamp: '01:30:15',
      summary: 'Status: "Q3 Multi-Region Sharding Design" -> Approved',
      payload: {
        documentId: 'doc-1',
        newStatus: 'Approved',
        reviewer: 'Alex Rivera',
        department: 'Architecture Review Board'
      }
    },
    {
      id: 'ws-init-2',
      event: 'DocumentCreated',
      timestamp: '01:28:40',
      summary: 'New Submission: "Zero-Trust Network Perimeter RFC" by Sarah Jenkins',
      payload: {
        documentId: 'doc-2',
        title: 'Zero-Trust Network Perimeter RFC',
        submitter: 'Sarah Jenkins',
        storageProvider: 'AwsS3'
      }
    },
    {
      id: 'ws-init-3',
      event: 'DocumentCommentAdded',
      timestamp: '01:25:10',
      summary: 'New comment on "Enterprise GraphQL Gateway RFC" by Elena Rostova',
      payload: {
        author: 'Elena Rostova',
        role: 'Reviewer',
        content: 'Please verify schema federation gateway latency requirements.'
      }
    }
  ]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const addWsLog = (event: SignalREventLog['event'], summary: string, payload: any) => {
    const log: SignalREventLog = {
      id: Math.random().toString(36).substring(2, 9),
      event,
      timestamp: new Date().toLocaleTimeString(),
      summary,
      payload
    };
    setWsLogs(prev => [log, ...prev.slice(0, 20)]);
  };

  const handleAddSystemLog = (log: SystemLogEntry) => {
    setSystemLogs(prev => [log, ...prev.slice(0, 30)]);
  };

  const handleSwitchUser = (user: UserPersona) => {
    setCurrentUser(user);
    showToast(
      'Role Switched',
      `Active persona changed to ${user.name} (${user.role} - ${user.department}).`,
      'info'
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 flex flex-col font-sans antialiased selection:bg-yellow-400 selection:text-slate-950">
      {/* Enterprise Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Brand Mark & Title */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-yellow-400/30 tracking-wider text-sm">
                WH
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">WorkflowHub</h1>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 uppercase tracking-wider">
                    Enterprise
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Document Review & Lifecycle Approval Platform
                </p>
              </div>
            </div>

            {/* Main Application Tabs */}
            <nav className="flex items-center gap-1 bg-[#121216] p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'documents'
                    ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Documents</span>
              </button>

              <button
                onClick={() => setActiveTab('activity')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'activity'
                    ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Activity</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-yellow-400" />
                <span>Team & Governance</span>
              </button>
            </nav>

            {/* Right Controls: Real-Time Status & Persona Switcher */}
            <div className="flex items-center gap-3">
              {/* SignalR Pulse Pill */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full shrink-0">
                <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                <span className="text-[11px] font-semibold text-emerald-400">SignalR Online</span>
              </div>

              {/* Persona / Role Selector */}
              <div className="flex items-center gap-2 bg-[#121216] border border-slate-800 rounded-xl px-3 py-1.5 text-xs shadow-sm">
                <div className="w-6 h-6 rounded-full bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {currentUser.avatar}
                </div>
                <select
                  value={currentUser.id}
                  onChange={e => {
                    const u = users.find(user => user.id === e.target.value);
                    if (u) handleSwitchUser(u);
                  }}
                  className="bg-transparent font-semibold text-slate-200 focus:outline-none cursor-pointer text-xs"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id} className="bg-[#121216] text-slate-200">
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'documents' && (
          <LiveWorkflowSandbox 
            documents={documents}
            onUpdateDocuments={setDocuments}
            currentUser={currentUser}
            onSwitchUser={handleSwitchUser}
            users={users}
            wsLogs={wsLogs}
            onAddWsLog={addWsLog}
            onShowToast={showToast}
            storageMode={storageMode}
            onSetStorageMode={setStorageMode}
            onNavigateToAdmin={() => setActiveTab('admin')}
            onNavigateToActivity={() => setActiveTab('activity')}
          />
        )}

        {activeTab === 'activity' && (
          <RealtimeActivityFeed 
            wsLogs={wsLogs}
            onAddWsLog={addWsLog}
            documents={documents}
            onUpdateDocuments={setDocuments}
            currentUser={currentUser}
            users={users}
            onShowToast={showToast}
            storageMode={storageMode}
            onNavigateToDocument={(docId) => {
              setActiveTab('documents');
            }}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard 
            currentUser={currentUser}
            onSwitchUser={handleSwitchUser}
            users={users}
            onUpdateUsers={setUsers}
            documents={documents}
            systemLogs={systemLogs}
            onAddSystemLog={handleAddSystemLog}
            telemetryStats={telemetryStats}
            onAddWsLog={addWsLog}
            onShowToast={showToast}
            activeStorageMode={storageMode}
          />
        )}
      </main>

      {/* Global Real-Time Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-sm w-full pointer-events-none">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`p-4 rounded-xl shadow-2xl border backdrop-blur-md pointer-events-auto flex items-start gap-3 transition-all ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100'
                  : toast.type === 'error'
                  ? 'bg-rose-950/90 border-rose-500/40 text-rose-100'
                  : toast.type === 'warning'
                  ? 'bg-amber-950/90 border-amber-500/40 text-amber-100'
                  : 'bg-yellow-950/90 border-yellow-500/40 text-yellow-100'
              }`}
            >
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-current"></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold">{toast.title}</div>
                <div className="text-xs opacity-90 mt-0.5 leading-relaxed break-words">{toast.message}</div>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-white p-0.5 shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Minimal Enterprise Footer */}
      <footer className="bg-[#0a0a0c] border-t border-slate-800/80 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>WorkflowHub Document Review Platform</span>
            <span>&bull;</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              SOC2 & ISO-27001 Audit Ready
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500">End-to-End Encrypted &bull; Direct Cloud Storage</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
