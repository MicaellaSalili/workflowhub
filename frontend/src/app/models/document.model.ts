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

export interface DocumentItem {
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
