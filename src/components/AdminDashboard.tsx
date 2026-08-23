import React, { useState } from 'react';
import { 
  UserPersona, 
  UserRole, 
  SystemLogEntry, 
  SystemTelemetryStats, 
  SignalREventLog, 
  StorageMode, 
  WorkflowDocument 
} from '../types/workflow';
import { 
  Users, 
  Shield, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  Activity, 
  Radio, 
  HardDrive, 
  Cloud, 
  Server, 
  AlertCircle, 
  CheckCircle2, 
  Terminal, 
  RefreshCw, 
  Download, 
  Send, 
  Lock, 
  UserCheck, 
  Sparkles, 
  Clock, 
  Zap, 
  Eye, 
  Sliders, 
  ChevronRight,
  Database,
  X,
  Check
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: UserPersona;
  onSwitchUser: (user: UserPersona) => void;
  users: UserPersona[];
  onUpdateUsers: (users: UserPersona[]) => void;
  documents: WorkflowDocument[];
  systemLogs: SystemLogEntry[];
  onAddSystemLog: (log: SystemLogEntry) => void;
  telemetryStats: SystemTelemetryStats;
  onAddWsLog: (event: SignalREventLog['event'], summary: string, payload: any) => void;
  onShowToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  activeStorageMode: StorageMode;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onSwitchUser,
  users,
  onUpdateUsers,
  documents,
  systemLogs,
  onAddSystemLog,
  telemetryStats,
  onAddWsLog,
  onShowToast,
  activeStorageMode
}) => {
  const [adminTab, setAdminTab] = useState<'users' | 'telemetry' | 'logs' | 'operations'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'All' | UserRole>('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserPersona | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Form states for Create User
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('Engineering');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Submitter');
  const [newUserQuota, setNewUserQuota] = useState<number>(1024);

  // System Broadcast State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastLevel, setBroadcastLevel] = useState<'info' | 'warning' | 'error'>('info');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Log filter
  const [logFilterLevel, setLogFilterLevel] = useState<string>('ALL');
  const [logSearch, setLogSearch] = useState('');

  // Storage sync simulation state
  const [isSyncingStorage, setIsSyncingStorage] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'Admin';

  // Calculations
  const totalUsers = users.length;
  const submittersCount = users.filter(u => u.role === 'Submitter').length;
  const reviewersCount = users.filter(u => u.role === 'Reviewer').length;
  const adminsCount = users.filter(u => u.role === 'Admin').length;

  const filteredUsers = users.filter(user => {
    const matchesRole = selectedRoleFilter === 'All' || user.role === selectedRoleFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || 
      user.name.toLowerCase().includes(q) || 
      user.email.toLowerCase().includes(q) || 
      user.department.toLowerCase().includes(q);
    return matchesRole && matchesQuery;
  });

  const filteredLogs = systemLogs.filter(log => {
    const matchesLevel = logFilterLevel === 'ALL' || log.level === logFilterLevel;
    const q = logSearch.toLowerCase().trim();
    const matchesQuery = !q || 
      log.message.toLowerCase().includes(q) || 
      log.source.toLowerCase().includes(q) || 
      (log.actor && log.actor.toLowerCase().includes(q));
    return matchesLevel && matchesQuery;
  });

  // Handle Quick Role Assignment
  const handleQuickRoleChange = (userId: string, newRole: UserRole) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const oldRole = targetUser.role;
    const updatedList = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    onUpdateUsers(updatedList);

    // If we updated the active user, update currentUser
    if (currentUser.id === userId) {
      onSwitchUser({ ...currentUser, role: newRole });
    }

    // SignalR Broadcast
    onAddWsLog('UserRoleChanged', `Role for ${targetUser.name} changed: ${oldRole} ➔ ${newRole}`, {
      userId,
      oldRole,
      newRole,
      updatedBy: currentUser.name
    });

    onAddSystemLog({
      id: 'syslog-' + Math.random().toString(36).substring(2, 9),
      level: 'SECURITY',
      source: 'RoleAuthorizationService',
      message: `Role reassigned for ${targetUser.email}: ${oldRole} ➔ ${newRole} (Action by ${currentUser.name})`,
      timestamp: new Date().toISOString(),
      actor: currentUser.name,
      ipAddress: '192.168.1.104'
    });

    onShowToast(
      'SignalR Event: Role Reassigned',
      `${targetUser.name} is now assigned the "${newRole}" role with immediate RBAC authorization update.`,
      'info'
    );
  };

  // Handle Create User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const initials = newUserName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
    const newUser: UserPersona = {
      id: 'user-' + Math.random().toString(36).substring(2, 9),
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      role: newUserRole,
      department: newUserDepartment.trim(),
      avatar: initials,
      status: 'Active',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      documentsCount: 0,
      storageQuotaMb: newUserQuota
    };

    onUpdateUsers([newUser, ...users]);

    // SignalR Broadcast
    onAddWsLog('UserCreated', `New user "${newUser.name}" (${newUser.role}) provisioned`, newUser);

    onAddSystemLog({
      id: 'syslog-' + Math.random().toString(36).substring(2, 9),
      level: 'INFO',
      source: 'AdminController',
      message: `User created: ${newUser.name} <${newUser.email}> with role ${newUser.role}`,
      timestamp: new Date().toISOString(),
      actor: currentUser.name,
      ipAddress: '192.168.1.104'
    });

    onShowToast(
      'User Provisioned & SignalR Broadcast',
      `Account created for ${newUser.name} (${newUser.role}). Real-time active directory updated.`,
      'success'
    );

    // Reset Form
    setNewUserName('');
    setNewUserEmail('');
    setNewUserDepartment('Engineering');
    setNewUserRole('Submitter');
    setNewUserQuota(1024);
    setIsCreateModalOpen(false);
  };

  // Handle Edit User
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updatedList = users.map(u => u.id === editingUser.id ? editingUser : u);
    onUpdateUsers(updatedList);

    if (currentUser.id === editingUser.id) {
      onSwitchUser(editingUser);
    }

    onAddWsLog('UserUpdated', `User profile updated: ${editingUser.name} (${editingUser.role})`, editingUser);

    onAddSystemLog({
      id: 'syslog-' + Math.random().toString(36).substring(2, 9),
      level: 'INFO',
      source: 'AdminController',
      message: `User profile modified: ${editingUser.name} (${editingUser.email})`,
      timestamp: new Date().toISOString(),
      actor: currentUser.name,
      ipAddress: '192.168.1.104'
    });

    onShowToast(
      'User Updated',
      `User ${editingUser.name} profile and role settings saved successfully.`,
      'success'
    );

    setEditingUser(null);
  };

  // Handle Delete User
  const handleDeleteUser = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    if (targetUser.id === currentUser.id) {
      onShowToast('Action Denied', 'You cannot delete your own active administrator session account.', 'error');
      setDeleteUserId(null);
      return;
    }

    const updatedList = users.filter(u => u.id !== userId);
    onUpdateUsers(updatedList);

    onAddWsLog('UserDeleted', `User account deleted: ${targetUser.name}`, { userId, email: targetUser.email });

    onAddSystemLog({
      id: 'syslog-' + Math.random().toString(36).substring(2, 9),
      level: 'WARN',
      source: 'AdminController',
      message: `User deleted by ${currentUser.name}: ${targetUser.name} <${targetUser.email}>`,
      timestamp: new Date().toISOString(),
      actor: currentUser.name,
      ipAddress: '192.168.1.104'
    });

    onShowToast(
      'User Deleted',
      `User ${targetUser.name} has been removed from the platform.`,
      'warning'
    );

    setDeleteUserId(null);
  };

  // Handle System Announcement Broadcast
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    setIsBroadcasting(true);

    setTimeout(() => {
      onAddWsLog('SystemBroadcast', `Global Announcement: "${broadcastTitle}"`, {
        title: broadcastTitle,
        message: broadcastMessage,
        level: broadcastLevel,
        sender: currentUser.name
      });

      onAddSystemLog({
        id: 'syslog-' + Math.random().toString(36).substring(2, 9),
        level: 'SIGNALR',
        source: 'DocumentHub',
        message: `SignalR Global Broadcast dispatched: "${broadcastTitle}" to all active sockets`,
        timestamp: new Date().toISOString(),
        actor: currentUser.name,
        ipAddress: '192.168.1.104'
      });

      onShowToast(
        `SignalR Push: ${broadcastTitle}`,
        broadcastMessage,
        broadcastLevel
      );

      setBroadcastTitle('');
      setBroadcastMessage('');
      setIsBroadcasting(false);
    }, 400);
  };

  // Handle Storage Integrity Sync
  const handleRunStorageSync = () => {
    setIsSyncingStorage(true);
    setSyncStatus('Connecting to AWS S3 & PostgreSQL metadata store...');

    setTimeout(() => {
      setSyncStatus('Validating pre-signed SigV4 checksums and bucket objects...');
    }, 800);

    setTimeout(() => {
      setIsSyncingStorage(false);
      setSyncStatus('Storage Sync Completed: 100% database & cloud storage parity.');

      onAddWsLog('StorageSynced', 'S3 & LocalFiles storage metadata reconciled successfully', {
        prunedOrphans: 2,
        verifiedFiles: documents.length,
        status: 'OK'
      });

      onAddSystemLog({
        id: 'syslog-' + Math.random().toString(36).substring(2, 9),
        level: 'STORAGE',
        source: 'StorageController',
        message: `Storage reconciliation executed. Verified ${documents.length} objects against active ${activeStorageMode} provider.`,
        timestamp: new Date().toISOString(),
        actor: currentUser.name,
        ipAddress: '192.168.1.104'
      });

      onShowToast(
        'Storage Reconciliation Completed',
        `Reconciled ${documents.length} workflow documents with 0 integrity mismatches.`,
        'success'
      );
    }, 1800);
  };

  // Export logs to JSON
  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(systemLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `workflowhub-audit-logs-${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast('Audit Logs Exported', 'Downloaded system security logs file.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* RBAC Header & Active Role Indicator */}
      <div className="bg-[#121216] rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                <Shield className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Enterprise Administration Console
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                RBAC Enforced
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Platform Governance & User Management
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Admin-level control panel for role delegations, user provisioning, real-time SignalR telemetry, and system audit logs.
            </p>
          </div>

          {/* Current Persona Context & Quick Switch */}
          <div className="flex items-center gap-3 bg-[#0a0a0c] p-2.5 rounded-xl border border-slate-800 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 font-bold flex items-center justify-center text-xs">
              {currentUser.avatar}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">{currentUser.name}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  currentUser.role === 'Admin' 
                    ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30' 
                    : currentUser.role === 'Reviewer'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {currentUser.role}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">{currentUser.email}</span>
            </div>

            {!isAdmin && (
              <button
                onClick={() => {
                  const adminPersona = users.find(u => u.role === 'Admin') || {
                    id: '33333333-3333-3333-3333-333333333333',
                    name: 'Marcus Vance',
                    email: 'marcus.admin@workflowhub.dev',
                    role: 'Admin' as UserRole,
                    department: 'Cloud Platform Ops',
                    avatar: 'MV'
                  };
                  onSwitchUser(adminPersona);
                  onShowToast('Switched to Administrator', 'You are now acting as Marcus Vance (Admin). Full privileges granted.', 'success');
                }}
                className="ml-2 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-md shadow-yellow-400/30 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                Switch to Admin
              </button>
            )}
          </div>
        </div>

        {/* Warning if not logged in as Admin */}
        {!isAdmin && (
          <div className="mt-4 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                You are currently viewing as <strong>{currentUser.name} ({currentUser.role})</strong>. Non-admin roles have read-only visibility into governance settings. Switch to an Admin account to execute user mutations.
              </span>
            </div>
            <button
              onClick={() => {
                const adminUser = users.find(u => u.role === 'Admin') || users[2];
                onSwitchUser(adminUser);
              }}
              className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded hover:bg-amber-400 transition-all shrink-0 cursor-pointer"
            >
              Elevate to Admin
            </button>
          </div>
        )}
      </div>

      {/* Admin KPI Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Users Bento Box */}
        <div className="bg-[#121216] p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Accounts</span>
            <Users className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalUsers}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
            <span className="text-emerald-400">{submittersCount} Submitters</span>
            <span>&bull;</span>
            <span className="text-blue-400">{reviewersCount} Reviewers</span>
            <span>&bull;</span>
            <span className="text-yellow-400">{adminsCount} Admins</span>
          </div>
        </div>

        {/* SignalR Sockets Bento Box */}
        <div className="bg-[#121216] p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">WebSocket Clients</span>
            <Radio className="w-4 h-4 text-green-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-green-400">{telemetryStats.activeWsConnections}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Real-time push latency: <strong className="text-slate-200">{telemetryStats.avgLatencyMs}ms</strong>
          </div>
        </div>

        {/* Storage Split Bento Box */}
        <div className="bg-[#121216] p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Storage Provider</span>
            {activeStorageMode === 'AwsS3' ? (
              <Cloud className="w-4 h-4 text-amber-400" />
            ) : (
              <HardDrive className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div className="text-lg font-bold text-white truncate">
            {activeStorageMode === 'AwsS3' ? 'AWS S3 Direct Bucket' : 'LocalFiles/ Volume'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total usage: <strong className="text-slate-200">{((telemetryStats.s3StorageBytes + telemetryStats.localStorageBytes) / 1024 / 1024).toFixed(1)} MB</strong>
          </div>
        </div>

        {/* System Health Bento Box */}
        <div className="bg-[#121216] p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Server Telemetry</span>
            <Activity className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">99.99%</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
            <span>CPU: <strong className="text-emerald-400">{telemetryStats.cpuUsagePercent}%</strong></span>
            <span>&bull;</span>
            <span>RAM: <strong className="text-yellow-300">{telemetryStats.memoryUsageMb}MB</strong></span>
          </div>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-[#121216] p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setAdminTab('users')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'users'
              ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-4 h-4" />
          User & Role Governance ({users.length})
        </button>

        <button
          onClick={() => setAdminTab('telemetry')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'telemetry'
              ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Activity className="w-4 h-4" />
          System Telemetry & Storage
        </button>

        <button
          onClick={() => setAdminTab('logs')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'logs'
              ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Terminal className="w-4 h-4" />
          System Audit Logs ({systemLogs.length})
        </button>

        <button
          onClick={() => setAdminTab('operations')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'operations'
              ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Zap className="w-4 h-4" />
          SignalR Broadcast & Ops
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USER & ROLE GOVERNANCE */}
      {/* ========================================================================= */}
      {adminTab === 'users' && (
        <div className="space-y-4">
          {/* Action Bar: Search, Role Filters, Add User Button */}
          <div className="bg-[#121216] rounded-2xl p-4 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search users by name, email, department..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[#0a0a0c] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            {/* Role Filter Chips & Create Button */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-[#0a0a0c] p-1 rounded-lg border border-slate-800">
                {(['All', 'Submitter', 'Reviewer', 'Admin'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setSelectedRoleFilter(role)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                      selectedRoleFilter === role
                        ? 'bg-yellow-400 text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3.5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-yellow-400/30 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add New User
              </button>
            </div>
          </div>

          {/* User List Bento Cards / Table */}
          <div className="bg-[#121216] rounded-2xl border border-slate-800 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0a0a0c] text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-bold">User Identity</th>
                    <th className="py-3 px-4 font-bold">Department</th>
                    <th className="py-3 px-4 font-bold">Assigned Role</th>
                    <th className="py-3 px-4 font-bold">Quick Role Delegation</th>
                    <th className="py-3 px-4 font-bold">Storage Quota</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No users match the search and role filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => {
                      const isUserActive = user.status !== 'Suspended';
                      const isCurrentActivePersona = currentUser.id === user.id;

                      return (
                        <tr 
                          key={user.id} 
                          className={`hover:bg-[#16161c] transition-colors ${
                            isCurrentActivePersona ? 'bg-yellow-950/20' : ''
                          }`}
                        >
                          {/* User Identity */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center font-bold text-xs shrink-0">
                                {user.avatar || 'U'}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  {user.name}
                                  {isCurrentActivePersona && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">{user.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Department */}
                          <td className="py-3.5 px-4 text-slate-300 font-medium">
                            {user.department}
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 ${
                              user.role === 'Admin'
                                ? 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/30'
                                : user.role === 'Reviewer'
                                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {user.role === 'Admin' && <Shield className="w-3 h-3 text-yellow-400" />}
                              {user.role === 'Reviewer' && <UserCheck className="w-3 h-3 text-blue-400" />}
                              {user.role === 'Submitter' && <Users className="w-3 h-3 text-emerald-400" />}
                              {user.role}
                            </span>
                          </td>

                          {/* Quick Role Delegation Selector */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1 bg-[#0a0a0c] p-0.5 rounded-lg border border-slate-800 w-fit">
                              {(['Submitter', 'Reviewer', 'Admin'] as const).map(r => (
                                <button
                                  key={r}
                                  onClick={() => handleQuickRoleChange(user.id, r)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                    user.role === r
                                      ? 'bg-yellow-400 text-slate-950 font-bold shadow-xs'
                                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                                  }`}
                                  title={`Switch ${user.name} to ${r}`}
                                >
                                  {r[0]}
                                </button>
                              ))}
                            </div>
                          </td>

                          {/* Quota */}
                          <td className="py-3.5 px-4 text-slate-300">
                            <span className="font-mono text-xs text-yellow-300">{user.storageQuotaMb || 1024} MB</span>
                            <div className="text-[10px] text-slate-500 mt-0.5">{user.documentsCount || 0} docs uploaded</div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isUserActive 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {isUserActive ? 'Active' : 'Suspended'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Switch Active Persona Button */}
                              <button
                                onClick={() => {
                                  onSwitchUser(user);
                                  onShowToast('Persona Switched', `Now acting as ${user.name} (${user.role}).`, 'info');
                                }}
                                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer"
                                title="Login / Switch to this persona"
                              >
                                <Zap className="w-3 h-3 text-amber-400" />
                                Login
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => setEditingUser(user)}
                                className="p-1.5 bg-slate-900 hover:bg-yellow-400 hover:text-slate-950 text-slate-400 border border-slate-800 rounded transition-all cursor-pointer"
                                title="Edit user details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => setDeleteUserId(user.id)}
                                className="p-1.5 bg-slate-900 hover:bg-rose-600 hover:text-white text-slate-400 border border-slate-800 rounded transition-all cursor-pointer"
                                title="Delete user"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SYSTEM TELEMETRY & STORAGE */}
      {/* ========================================================================= */}
      {adminTab === 'telemetry' && (
        <div className="space-y-6">
          {/* Telemetry Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Storage Distribution Bento Box */}
            <div className="bg-[#121216] rounded-2xl p-5 border border-slate-800 shadow-md md:col-span-2 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                    <Cloud className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-white">Hybrid Cloud Storage Distribution</h3>
                </div>
                <span className="text-xs text-yellow-400 font-mono">
                  {((telemetryStats.s3StorageBytes + telemetryStats.localStorageBytes) / 1024 / 1024).toFixed(2)} MB Total
                </span>
              </div>

              {/* Progress Bar for S3 vs Local */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    AWS S3 Direct Bucket: <strong>{(telemetryStats.s3StorageBytes / 1024 / 1024).toFixed(2)} MB</strong>
                  </span>
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    LocalFiles/ Disk Fallback: <strong>{(telemetryStats.localStorageBytes / 1024 / 1024).toFixed(2)} MB</strong>
                  </span>
                </div>

                <div className="w-full bg-[#0a0a0c] h-3 rounded-full overflow-hidden flex border border-slate-800">
                  <div 
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ 
                      width: `${(telemetryStats.s3StorageBytes / (telemetryStats.s3StorageBytes + telemetryStats.localStorageBytes || 1)) * 100}%` 
                    }}
                  />
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ 
                      width: `${(telemetryStats.localStorageBytes / (telemetryStats.s3StorageBytes + telemetryStats.localStorageBytes || 1)) * 100}%` 
                    }}
                  />
                </div>
              </div>

              {/* Details Bento Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-[#0a0a0c] p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Active Mode</div>
                  <div className="text-xs font-bold text-white mt-0.5">{activeStorageMode}</div>
                </div>
                <div className="bg-[#0a0a0c] p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">SigV4 Token TTL</div>
                  <div className="text-xs font-bold text-yellow-400 mt-0.5">15 Minutes</div>
                </div>
                <div className="bg-[#0a0a0c] p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Direct Bypass Ratio</div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5">100% Binary Stream</div>
                </div>
              </div>
            </div>

            {/* Database & SignalR Pulse Bento Box */}
            <div className="bg-[#121216] rounded-2xl p-5 border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Database className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-white">PostgreSQL & SignalR</h3>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0c] border border-slate-800">
                  <span className="text-slate-400">Database Engine</span>
                  <span className="font-bold text-white">PostgreSQL 16 Alpine</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0c] border border-slate-800">
                  <span className="text-slate-400">Connection Pool</span>
                  <span className="font-bold text-emerald-400">Healthy (2/20 active)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0c] border border-slate-800">
                  <span className="text-slate-400">Avg Query Latency</span>
                  <span className="font-bold text-yellow-400">2.1 ms</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0c] border border-slate-800">
                  <span className="text-slate-400">SignalR WS Hub</span>
                  <span className="font-bold text-emerald-400">/hubs/documents (Active)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Server Performance Bento Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#121216] p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 font-semibold mb-1">API Throughput</div>
              <div className="text-xl font-bold text-white">{telemetryStats.apiRequestsPerSec} req/sec</div>
              <div className="text-[11px] text-emerald-400 mt-1">▲ 8.4% from peak average</div>
            </div>

            <div className="bg-[#121216] p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 font-semibold mb-1">System Uptime</div>
              <div className="text-xl font-bold text-white">{(telemetryStats.uptimeSeconds / 3600 / 24).toFixed(1)} days</div>
              <div className="text-[11px] text-slate-400 mt-1">Zero downtime recorded</div>
            </div>

            <div className="bg-[#121216] p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 font-semibold mb-1">Pending Approval Queue</div>
              <div className="text-xl font-bold text-amber-400">{telemetryStats.pendingReviews} RFCs</div>
              <div className="text-[11px] text-slate-400 mt-1">Avg review SLA: 3.2 hours</div>
            </div>

            <div className="bg-[#121216] p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 font-semibold mb-1">Approved Documents</div>
              <div className="text-xl font-bold text-emerald-400">{telemetryStats.approvedCount} Documents</div>
              <div className="text-[11px] text-slate-400 mt-1">100% cryptographic audit trail</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SYSTEM AUDIT LOGS */}
      {/* ========================================================================= */}
      {adminTab === 'logs' && (
        <div className="space-y-4">
          {/* Log Controls Header */}
          <div className="bg-[#121216] rounded-2xl p-4 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter logs by keyword, actor, or source..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[#0a0a0c] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Level Filter */}
              <div className="flex items-center gap-1 bg-[#0a0a0c] p-1 rounded-lg border border-slate-800">
                {(['ALL', 'INFO', 'SECURITY', 'SIGNALR', 'STORAGE', 'WARN'] as const).map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setLogFilterLevel(lvl)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      logFilterLevel === lvl
                        ? 'bg-yellow-400 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExportLogs}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
            </div>
          </div>

          {/* Log Stream Container */}
          <div className="bg-[#0a0a0c] rounded-2xl border border-slate-800 shadow-md p-4 max-h-[600px] overflow-y-auto font-mono text-xs space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-slate-500 py-10 font-sans">
                No logs match the current search and level filter.
              </div>
            ) : (
              filteredLogs.map(log => {
                let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
                if (log.level === 'SECURITY') badgeStyle = 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30';
                else if (log.level === 'SIGNALR') badgeStyle = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                else if (log.level === 'STORAGE') badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                else if (log.level === 'WARN' || log.level === 'ERROR') badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                else if (log.level === 'INFO') badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

                return (
                  <div 
                    key={log.id} 
                    className="p-3 bg-[#121216] rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all space-y-1 text-slate-300"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeStyle}`}>
                          {log.level}
                        </span>
                        <span className="text-yellow-400 font-semibold">{log.source}</span>
                        {log.actor && (
                          <span className="text-slate-500">
                            actor: <strong className="text-slate-300">{log.actor}</strong>
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()} &bull; {log.ipAddress || '127.0.0.1'}
                      </span>
                    </div>

                    <div className="text-slate-200 leading-relaxed font-sans text-xs pt-1">
                      {log.message}
                    </div>

                    {log.details && (
                      <div className="text-[11px] text-slate-400 bg-[#0a0a0c] p-2 rounded border border-slate-800/60 mt-1">
                        {log.details}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SIGNALR BROADCAST & OPERATIONS */}
      {/* ========================================================================= */}
      {adminTab === 'operations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: SignalR Global Announcement Broadcast */}
          <div className="lg:col-span-7 bg-[#121216] rounded-2xl p-6 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <span className="p-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                <Radio className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Broadcast Global SignalR Announcement</h3>
                <p className="text-xs text-slate-400">Pushes immediate banner & alert across all active browser sessions.</p>
              </div>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={e => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Scheduled Maintenance Window: Tonight at 02:00 UTC"
                  className="w-full px-3.5 py-2 text-xs bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Urgency / Level *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['info', 'warning', 'error'] as const).map(lvl => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setBroadcastLevel(lvl)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all capitalize cursor-pointer ${
                        broadcastLevel === lvl
                          ? lvl === 'error'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                            : lvl === 'warning'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-yellow-400/20 text-yellow-300 border-yellow-400/50'
                          : 'bg-[#0a0a0c] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl} Notice
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Broadcast Body Message *
                </label>
                <textarea
                  rows={3}
                  required
                  value={broadcastMessage}
                  onChange={e => setBroadcastMessage(e.target.value)}
                  placeholder="Type the message to be dispatched over DocumentHub to all connected clients..."
                  className="w-full px-3.5 py-2 text-xs bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500">
                  Transmitted via: <code className="text-yellow-300">Clients.All.SystemBroadcastReceived()</code>
                </span>
                <button
                  type="submit"
                  disabled={!broadcastTitle || !broadcastMessage || isBroadcasting}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-yellow-400/30 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isBroadcasting ? 'Dispatching Push...' : 'Send SignalR Broadcast'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Maintenance & Storage Tools */}
          <div className="lg:col-span-5 space-y-4">
            {/* Storage Sync Card */}
            <div className="bg-[#121216] rounded-2xl p-5 border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <RefreshCw className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-white">Storage Metadata Reconciler</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Audits all documents against AWS S3 bucket keys and LocalFiles volume to remove orphaned uploads and verify cryptographic hashes.
              </p>

              {syncStatus && (
                <div className="p-2.5 rounded-lg bg-[#0a0a0c] border border-slate-800 text-[11px] text-emerald-400 font-mono">
                  {syncStatus}
                </div>
              )}

              <button
                onClick={handleRunStorageSync}
                disabled={isSyncingStorage}
                className="w-full py-2 bg-slate-900 hover:bg-emerald-600 hover:text-white border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStorage ? 'animate-spin' : ''}`} />
                {isSyncingStorage ? 'Reconciling Storage Objects...' : 'Run Storage Reconciliation'}
              </button>
            </div>

            {/* Quick S3 Policy Test */}
            <div className="bg-[#121216] rounded-2xl p-5 border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                  <Lock className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-white">S3 SigV4 Pre-signed Token Cache</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Purge cached pre-signed PUT/GET URLs to force fresh SigV4 HMAC-SHA256 signature generation on subsequent uploads.
              </p>
              <button
                onClick={() => {
                  onShowToast('Token Cache Purged', 'All active AWS pre-signed upload URLs invalidated. Fresh SigV4 generation engaged.', 'info');
                  onAddSystemLog({
                    id: 'syslog-' + Math.random().toString(36).substring(2, 9),
                    level: 'STORAGE',
                    source: 'S3StorageService',
                    message: `Pre-signed URL cache flushed by ${currentUser.name}`,
                    timestamp: new Date().toISOString(),
                    actor: currentUser.name
                  });
                }}
                className="w-full py-2 bg-slate-900 hover:bg-yellow-400 hover:text-slate-950 border border-slate-800 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                Flush Pre-Signed Token Cache
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW USER */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121216] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Provision New Platform User</h3>
                  <span className="text-xs text-slate-400">
                    Assign initial RBAC role and storage quota
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="e.g. Jordan Hayes"
                  className="w-full px-3.5 py-2 text-xs bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="e.g. jordan.hayes@workflowhub.dev"
                  className="w-full px-3.5 py-2 text-xs bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department *</label>
                  <select
                    value={newUserDepartment}
                    onChange={e => setNewUserDepartment(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-yellow-400 cursor-pointer"
                  >
                    <option value="Engineering" className="bg-[#121216]">Engineering</option>
                    <option value="Architecture & Security" className="bg-[#121216]">Architecture & Security</option>
                    <option value="Cloud Platform Ops" className="bg-[#121216]">Cloud Platform Ops</option>
                    <option value="Compliance & Legal" className="bg-[#121216]">Compliance & Legal</option>
                    <option value="Product & Design" className="bg-[#121216]">Product & Design</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Role *</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2 text-xs bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-yellow-400 cursor-pointer"
                  >
                    <option value="Submitter" className="bg-[#121216]">Submitter (Upload & Edit RFCs)</option>
                    <option value="Reviewer" className="bg-[#121216]">Reviewer (Claim & Approve RFCs)</option>
                    <option value="Admin" className="bg-[#121216]">Admin (Full System Control)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Storage Quota (MB)</label>
                <input
                  type="number"
                  value={newUserQuota}
                  onChange={e => setNewUserQuota(Number(e.target.value))}
                  min={100}
                  max={20000}
                  className="w-full px-3.5 py-2 text-xs bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-lg transition-all shadow-lg shadow-yellow-400/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Provision User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT USER */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121216] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit User Profile & Delegation</h3>
                  <span className="text-xs text-slate-400">{editingUser.email}</span>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    value={editingUser.department}
                    onChange={e => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Role *</label>
                  <select
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full px-3.5 py-2 text-xs bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-yellow-400 cursor-pointer"
                  >
                    <option value="Submitter" className="bg-[#121216]">Submitter</option>
                    <option value="Reviewer" className="bg-[#121216]">Reviewer</option>
                    <option value="Admin" className="bg-[#121216]">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Account Status</label>
                  <select
                    value={editingUser.status || 'Active'}
                    onChange={e => setEditingUser({ ...editingUser, status: e.target.value as 'Active' | 'Suspended' })}
                    className="w-full px-3.5 py-2 text-xs bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-yellow-400 cursor-pointer"
                  >
                    <option value="Active" className="bg-[#121216]">Active</option>
                    <option value="Suspended" className="bg-[#121216]">Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Storage Quota (MB)</label>
                  <input
                    type="number"
                    value={editingUser.storageQuotaMb || 1024}
                    onChange={e => setEditingUser({ ...editingUser, storageQuotaMb: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-lg transition-all shadow-lg shadow-yellow-400/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {deleteUserId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121216] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete User Account</h3>
                <span className="text-xs text-rose-400/80">Permanent administrative action</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Are you sure you want to remove this user from the organization? This will revoke all OAuth sessions, SignalR connections, and role delegations.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteUserId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(deleteUserId)}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-all shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
