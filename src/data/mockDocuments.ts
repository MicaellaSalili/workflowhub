import { UserPersona, WorkflowDocument, SystemLogEntry, SystemTelemetryStats } from '../types/workflow';

export const INITIAL_PERSONAS: UserPersona[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Sarah Jenkins',
    email: 'sarah.submitter@workflowhub.dev',
    role: 'Submitter',
    department: 'Product Engineering',
    avatar: 'SJ',
    status: 'Active',
    createdAt: '2026-06-15T08:00:00Z',
    lastActiveAt: '2026-08-23T01:10:00Z',
    documentsCount: 5,
    storageQuotaMb: 500
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Alex Rivera',
    email: 'alex.reviewer@workflowhub.dev',
    role: 'Reviewer',
    department: 'Architecture & Security',
    avatar: 'AR',
    status: 'Active',
    createdAt: '2026-05-10T09:30:00Z',
    lastActiveAt: '2026-08-23T01:25:00Z',
    documentsCount: 8,
    storageQuotaMb: 1024
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Marcus Vance',
    email: 'marcus.admin@workflowhub.dev',
    role: 'Admin',
    department: 'Cloud Platform Ops',
    avatar: 'MV',
    status: 'Active',
    createdAt: '2026-01-01T00:00:00Z',
    lastActiveAt: '2026-08-23T01:32:00Z',
    documentsCount: 14,
    storageQuotaMb: 5000
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Elena Rostova',
    email: 'elena.rostova@workflowhub.dev',
    role: 'Reviewer',
    department: 'Compliance & Legal',
    avatar: 'ER',
    status: 'Active',
    createdAt: '2026-07-01T11:00:00Z',
    lastActiveAt: '2026-08-22T19:40:00Z',
    documentsCount: 4,
    storageQuotaMb: 1000
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'David Chen',
    email: 'david.chen@workflowhub.dev',
    role: 'Submitter',
    department: 'Infrastructure & SRE',
    avatar: 'DC',
    status: 'Active',
    createdAt: '2026-07-20T14:20:00Z',
    lastActiveAt: '2026-08-23T00:45:00Z',
    documentsCount: 3,
    storageQuotaMb: 750
  }
];

export const INITIAL_SYSTEM_LOGS: SystemLogEntry[] = [
  {
    id: 'syslog-101',
    level: 'INFO',
    source: 'AuthMiddleware',
    message: 'User authentication verified: Marcus Vance (Admin). JWT role claims validated.',
    timestamp: '2026-08-23T01:32:10Z',
    ipAddress: '192.168.1.104',
    actor: 'Marcus Vance'
  },
  {
    id: 'syslog-102',
    level: 'SIGNALR',
    source: 'DocumentHub',
    message: 'Client connected: connection_id_ws_8921. Active connection count: 18.',
    timestamp: '2026-08-23T01:30:45Z',
    ipAddress: '10.0.4.12',
    actor: 'System'
  },
  {
    id: 'syslog-103',
    level: 'STORAGE',
    source: 'S3StorageService',
    message: 'Generated SigV4 Pre-signed PUT URL for Payment_Event_Architecture_v2.pdf. Expires in 900s.',
    timestamp: '2026-08-23T01:28:12Z',
    ipAddress: '192.168.1.55',
    actor: 'Sarah Jenkins'
  },
  {
    id: 'syslog-104',
    level: 'SECURITY',
    source: 'RoleAuthorizationHandler',
    message: 'Role transition executed: Sarah Jenkins updated to Submitter by Marcus Vance.',
    timestamp: '2026-08-23T01:25:00Z',
    ipAddress: '192.168.1.104',
    actor: 'Marcus Vance'
  },
  {
    id: 'syslog-105',
    level: 'INFO',
    source: 'AppDbContext',
    message: 'PostgreSQL connection pool healthy. Active transactions: 2, Query latency: 2.4ms.',
    timestamp: '2026-08-23T01:20:00Z',
    ipAddress: '127.0.0.1',
    actor: 'System'
  },
  {
    id: 'syslog-106',
    level: 'WARN',
    source: 'LocalStorageService',
    message: 'Direct S3 credentials absent for local cluster; fallback disk volume engaged seamlessly.',
    timestamp: '2026-08-23T01:15:30Z',
    ipAddress: '127.0.0.1',
    actor: 'System'
  }
];

export const INITIAL_TELEMETRY_STATS: SystemTelemetryStats = {
  totalUsers: 5,
  activeWsConnections: 18,
  totalDocuments: 3,
  s3StorageBytes: 23279220, // ~22.2 MB
  localStorageBytes: 2194000, // ~2.1 MB
  cpuUsagePercent: 14.8,
  memoryUsageMb: 248.5,
  uptimeSeconds: 384920,
  apiRequestsPerSec: 42.6,
  avgLatencyMs: 4.2,
  pendingReviews: 1,
  approvedCount: 1
};


export const INITIAL_DOCUMENTS: WorkflowDocument[] = [
  {
    id: 'doc-001-microservices',
    title: 'Q3 Payment Microservices Event-Driven Architecture Spec',
    description: 'Detailed RFC outlining RabbitMQ to Apache Kafka migration, idempotent message handling, and outbox pattern implementation for multi-region checkout resilience.',
    category: 'Architecture',
    originalFileName: 'Payment_Event_Architecture_v2.pdf',
    storedFileKey: 'documents/2026/08/948fbc21_Payment_Event_Architecture_v2.pdf',
    fileSizeBytes: 4829100, // ~4.6 MB
    contentType: 'application/pdf',
    storageProvider: 'AwsS3',
    status: 'UnderReview',
    versionNumber: 2,
    submitterId: '11111111-1111-1111-1111-111111111111',
    submitterName: 'Sarah Jenkins',
    assignedReviewerId: '22222222-2222-2222-2222-222222222222',
    assignedReviewerName: 'Alex Rivera',
    createdAt: '2026-08-22T14:30:00Z',
    updatedAt: '2026-08-22T18:15:00Z',
    comments: [
      {
        id: 'c-101',
        authorId: '22222222-2222-2222-2222-222222222222',
        authorName: 'Alex Rivera',
        authorRole: 'Reviewer',
        content: 'The schema registry contract looks solid. Please verify dead-letter queue backpressure thresholds before final approval.',
        isInternalNote: false,
        createdAt: '2026-08-22T18:20:00Z'
      }
    ],
    auditLogs: [
      {
        id: 'a-101',
        action: 'Status Changed: Submitted -> UnderReview',
        performedBy: 'Alex Rivera',
        details: 'Reviewer claimed ticket from priority queue.',
        timestamp: '2026-08-22T18:15:00Z'
      },
      {
        id: 'a-102',
        action: 'Document Submitted',
        performedBy: 'Sarah Jenkins',
        details: 'Direct S3 upload completed via pre-signed URL (4.6 MB bypassed Web API).',
        timestamp: '2026-08-22T14:30:00Z'
      }
    ]
  },
  {
    id: 'doc-002-soc2',
    title: 'Annual SOC 2 Type II Security Compliance & Audit Evidence',
    description: 'Cryptographic key rotation logs, role-based access review matrices, and automated vulnerability scanning reports for Q2.',
    category: 'Security',
    originalFileName: 'SOC2_Type2_Evidence_Q2.zip',
    storedFileKey: 'documents/2026/08/38a7c819_SOC2_Type2_Evidence_Q2.zip',
    fileSizeBytes: 18450120, // ~17.6 MB
    contentType: 'application/zip',
    storageProvider: 'AwsS3',
    status: 'Approved',
    versionNumber: 1,
    submitterId: '11111111-1111-1111-1111-111111111111',
    submitterName: 'Sarah Jenkins',
    assignedReviewerId: '22222222-2222-2222-2222-222222222222',
    assignedReviewerName: 'Alex Rivera',
    createdAt: '2026-08-20T09:15:00Z',
    reviewedAt: '2026-08-21T11:00:00Z',
    comments: [
      {
        id: 'c-201',
        authorId: '22222222-2222-2222-2222-222222222222',
        authorName: 'Alex Rivera',
        authorRole: 'Reviewer',
        content: 'Approved. All evidence matches external auditor verification criteria.',
        isInternalNote: false,
        createdAt: '2026-08-21T11:00:00Z'
      }
    ],
    auditLogs: [
      {
        id: 'a-201',
        action: 'Status Changed: UnderReview -> Approved',
        performedBy: 'Alex Rivera',
        details: 'Approved with zero non-conformances.',
        timestamp: '2026-08-21T11:00:00Z'
      },
      {
        id: 'a-202',
        action: 'Document Submitted',
        performedBy: 'Sarah Jenkins',
        details: 'Direct S3 pre-signed upload completed.',
        timestamp: '2026-08-20T09:15:00Z'
      }
    ]
  },
  {
    id: 'doc-003-k8s',
    title: 'Kubernetes Multi-Cluster Ingress & Service Mesh Migration',
    description: 'Istio service mesh rollout strategy across EKS and on-premises fallback clusters with mutual TLS (mTLS) enforcement.',
    category: 'Operations',
    originalFileName: 'K8s_Istio_ServiceMesh_Plan.docx',
    storedFileKey: 'documents/2026/08/78fe120c_K8s_Istio_ServiceMesh_Plan.docx',
    fileSizeBytes: 2194000,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    storageProvider: 'LocalFilesystem',
    status: 'ChangesRequested',
    versionNumber: 1,
    submitterId: '11111111-1111-1111-1111-111111111111',
    submitterName: 'Sarah Jenkins',
    assignedReviewerId: '22222222-2222-2222-2222-222222222222',
    assignedReviewerName: 'Alex Rivera',
    createdAt: '2026-08-21T16:00:00Z',
    comments: [
      {
        id: 'c-301',
        authorId: '22222222-2222-2222-2222-222222222222',
        authorName: 'Alex Rivera',
        authorRole: 'Reviewer',
        content: 'Please add rollback playbook metrics for canary traffic split < 5%.',
        isInternalNote: false,
        createdAt: '2026-08-21T17:40:00Z'
      }
    ],
    auditLogs: [
      {
        id: 'a-301',
        action: 'Status Changed: UnderReview -> ChangesRequested',
        performedBy: 'Alex Rivera',
        details: 'Requested rollback playbook enhancements.',
        timestamp: '2026-08-21T17:40:00Z'
      },
      {
        id: 'a-302',
        action: 'Document Submitted',
        performedBy: 'Sarah Jenkins',
        details: 'Saved via Local Filesystem Fallback (LocalFiles/ disk store).',
        timestamp: '2026-08-21T16:00:00Z'
      }
    ]
  }
];
