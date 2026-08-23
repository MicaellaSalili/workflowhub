export enum UserRole {
  Submitter = 'Submitter',
  Reviewer = 'Reviewer',
  Admin = 'Admin'
}

export enum DocumentStatus {
  Draft = 'Draft',
  Submitted = 'Submitted',
  UnderReview = 'UnderReview',
  ChangesRequested = 'ChangesRequested',
  Approved = 'Approved',
  Rejected = 'Rejected'
}

export enum StorageProviderType {
  AwsS3 = 'AwsS3',
  LocalFilesystem = 'LocalFilesystem'
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  submittedCount?: number;
  reviewedCount?: number;
}

export interface DocumentComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  isInternalReviewerNote: boolean;
  createdAt: string;
}

export interface DocumentAuditLog {
  id: string;
  action: string;
  performedBy: string;
  details: string;
  timestamp: string;
}

export interface DocumentVersion {
  id?: string;
  versionNumber: number;
  originalFileName: string;
  storedFileKey: string;
  contentType?: string;
  fileSizeBytes: number;
  storageProvider?: StorageProviderType;
  notes?: string;
  authorName?: string;
  createdAt: string;
}

export type WorkflowDocumentVersion = DocumentVersion;

export interface WorkflowDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  originalFileName: string;
  storedFileKey: string;
  contentType: string;
  fileSizeBytes: number;
  storageProvider: StorageProviderType;
  status: DocumentStatus;
  versionNumber: number;
  versionHistory?: DocumentVersion[];
  submitterId: string;
  submitterName: string;
  assignedReviewerId?: string;
  assignedReviewerName?: string;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  comments: DocumentComment[];
  auditLogs: DocumentAuditLog[];
}

export type DocumentItem = WorkflowDocument;

export interface PresignedUploadResponse {
  uploadUrl: string;
  fileKey: string;
  provider: StorageProviderType;
  expiresInSeconds: number;
  requiredHeaders?: Record<string, string>;
  message: string;
}

export interface StorageInfo {
  provider: string;
  isAwsS3Configured: boolean;
  s3Bucket: string;
  s3Region: string;
  localFallbackPath: string;
  maxFileSizeMb: number;
  allowedExtensions: string[];
}

export interface DashboardStats {
  totalDocuments: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  changesRequested: number;
  totalStorageBytes: number;
  activeStorageMode: string;
}

export interface UserAdmin {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  status: string;
  createdAt: string;
  lastActive: string;
  submittedDocumentCount: number;
  storageQuotaMb: number;
}

export interface SystemStats {
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

export interface SystemLog {
  id: string;
  level: string;
  source: string;
  message: string;
  stackTrace?: string;
  timestamp: string;
  ipAddress?: string;
  user?: string;
}

export interface SyncStorageResponse {
  orphanedFilesPruned: number;
  synchronizedEntries: number;
  reclaimedBytes: number;
  status: string;
  completedAt: string;
}
