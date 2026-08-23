export type UserRole = 'Submitter' | 'Reviewer' | 'Admin';

export type DocumentStatus = 
  | 'Submitted' 
  | 'UnderReview' 
  | 'ChangesRequested' 
  | 'Approved' 
  | 'Rejected';

export type StorageMode = 'AwsS3' | 'LocalFilesystem';

export interface UserPersona {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar: string;
  status?: 'Active' | 'Suspended';
  createdAt?: string;
  lastActiveAt?: string;
  documentsCount?: number;
  storageQuotaMb?: number;
}

export interface CommentItem {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  isInternalNote: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  performedBy: string;
  details: string;
  timestamp: string;
}

export interface WorkflowDocument {
  id: string;
  title: string;
  description: string;
  category: 'Engineering' | 'Architecture' | 'Security' | 'Legal' | 'Operations';
  originalFileName: string;
  storedFileKey: string;
  fileSizeBytes: number;
  contentType: string;
  storageProvider: StorageMode;
  status: DocumentStatus;
  versionNumber: number;
  submitterId: string;
  submitterName: string;
  assignedReviewerId?: string;
  assignedReviewerName?: string;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  comments: CommentItem[];
  auditLogs: AuditLogItem[];
  fileContentPreview?: string;
}

export type SystemLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY' | 'SIGNALR' | 'STORAGE';

export interface SystemLogEntry {
  id: string;
  level: SystemLogLevel;
  source: string;
  message: string;
  details?: string;
  timestamp: string;
  ipAddress?: string;
  actor?: string;
}

export interface SystemTelemetryStats {
  totalUsers: number;
  activeWsConnections: number;
  totalDocuments: number;
  s3StorageBytes: number;
  localStorageBytes: number;
  cpuUsagePercent: number;
  memoryUsageMb: number;
  uptimeSeconds: number;
  apiRequestsPerSec: number;
  avgLatencyMs: number;
  pendingReviews: number;
  approvedCount: number;
}

export interface SignalREventLog {
  id: string;
  event: 
    | 'NewDocumentSubmitted' 
    | 'DocumentCreated'
    | 'DocumentStatusChanged' 
    | 'DocumentCommentAdded' 
    | 'ActiveUsersUpdated'
    | 'UserCreated'
    | 'UserUpdated'
    | 'UserDeleted'
    | 'UserRoleChanged'
    | 'UserRoleUpdated'
    | 'SystemBroadcast'
    | 'StorageSynced';
  timestamp: string;
  summary: string;
  payload: any;
}

