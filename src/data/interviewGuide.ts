export interface InterviewTopic {
  id: string;
  category: 'Storage Architecture' | 'Real-time WebSockets' | 'Database & EF Core' | 'DevOps & Docker' | 'Behavioral / Leadership';
  question: string;
  shortPitch: string;
  deepTechnicalAnswer: string[];
  keyHighlights: string[];
  codeReference: string;
}

export const INTERVIEW_TOPICS: InterviewTopic[] = [
  {
    id: 's3-presigned-vs-local',
    category: 'Storage Architecture',
    question: 'How did you architect file storage, and why did you choose AWS S3 Pre-Signed URLs with a Local Fallback?',
    shortPitch: 'I architected a polymorphic, environment-aware storage layer where files upload directly to AWS S3 using pre-signed URLs to bypass the API server entirely, while engineering a zero-dependency LocalFiles/ fallback for cost-free local development and offline environments.',
    deepTechnicalAnswer: [
      '1. Direct-to-Cloud Uploads: Traditional file uploads proxy through the backend server (Client -> Web API -> S3). For heavy payloads (e.g. 25MB architectural bundles), this doubles bandwidth egress, locks thread-pool worker threads in I/O wait, and causes server memory spikes.',
      '2. Pre-Signed Security: With AWS S3 Pre-Signed URLs, the client calls POST /api/storage/presigned-upload-url. The server signs an AWS SigV4 URL with a strict 15-minute TTL, explicit Content-Type, and AES256 server-side encryption header. The browser executes a direct HTTP PUT to the Amazon S3 bucket.',
      '3. Resilient Local Fallback: Enterprise cloud credentials (AWS S3) require active IAM and billing, which is inconvenient for local dev onboarding or automated CI. I created LocalStorageService implementing the same IStorageService interface. The ASP.NET Core DI container detects whether AWS credentials exist; if absent, it gracefully falls back to streaming to /app/LocalFiles on disk with zero code alterations.'
    ],
    keyHighlights: [
      'Zero Web API CPU/RAM bottlenecks during multi-megabyte binary uploads',
      'Polymorphic IStorageService registered via dynamic DI factory in Program.cs',
      'AWS Signature Version 4 time-limited tokens (15-min expiration)',
      'Zero-credit-card frictionless onboarding for new developers via LocalFiles/'
    ],
    codeReference: 'backend/Controllers/StorageController.cs & backend/Services/S3StorageService.cs'
  },
  {
    id: 'signalr-realtime',
    category: 'Real-time WebSockets',
    question: 'How does real-time synchronization work when a document is submitted or reviewed?',
    shortPitch: 'We implemented strongly-typed ASP.NET Core SignalR hubs (DocumentHub) coupled with Angular RxJS event pipelines and Signals to deliver sub-50ms status synchronization across distributed submitters and reviewers without polling.',
    deepTechnicalAnswer: [
      '1. Strongly-Typed Hub: DocumentHub implements Hub<IDocumentClient> with strictly defined contract methods (DocumentStatusChanged, NewDocumentSubmitted, DocumentCommentAdded). This guarantees compile-time type safety on backend dispatch.',
      '2. Fine-Grained Rooms: Clients join individual document rooms (JoinDocumentRoom("doc_123")) when inspecting an RFC, ensuring comment broadcasts only send to active viewers, while global status changes broadcast to the reviewer queue group.',
      '3. Client Resilience: The Angular SignalRService manages auto-reconnect backoff intervals ([0, 2s, 5s, 10s, 30s]), websocket transport negotiation with long-polling fallback, and exposes reactive Angular Signals (public isConnected = signal(false)) for instantaneous UI feedback.'
    ],
    keyHighlights: [
      'Eliminated wasteful HTTP polling intervals and redundant database read load',
      'Strongly-typed SignalR IDocumentClient interface',
      'Automatic backoff reconnection with WebSocket / Long-Polling fallback',
      'Instant push updates across reviewers and submitters'
    ],
    codeReference: 'backend/Hubs/DocumentHub.cs & frontend/src/app/services/signalr.service.ts'
  },
  {
    id: 'ef-core-postgresql',
    category: 'Database & EF Core',
    question: 'How did you model the data and guarantee relational integrity and auditability?',
    shortPitch: 'We modeled documents, review comments, and immutable audit logs using PostgreSQL 16 and Entity Framework Core with Code-First Migrations, strict foreign keys, and automatic connection retry policies.',
    deepTechnicalAnswer: [
      '1. Immutable Audit Trail: Every state transition (Submitted -> UnderReview -> Approved) writes a dedicated DocumentAuditLog entity with author attribution, timestamp, and metadata diffs.',
      '2. Resilient Connection Retries: Configured npgsqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10)) to withstand transient cloud database hiccups during startup in containerized environments.',
      '3. Clean DTO Boundaries: Controllers never expose raw EF entities directly. We use modern C# record DTOs (DocumentResponse, PresignedUploadRequest) preventing circular reference serialization bugs.'
    ],
    keyHighlights: [
      'PostgreSQL 16 relational integrity with EF Core Code-First',
      'Automated schema generation on startup in containerized environments',
      'Structured audit log history for enterprise SOC2 compliance',
      'Strict C# record DTO mapping'
    ],
    codeReference: 'backend/Data/AppDbContext.cs & backend/Controllers/DocumentController.cs'
  },
  {
    id: 'docker-compose-devops',
    category: 'DevOps & Docker',
    question: 'How is the application containerized and orchestrated for one-command deployment?',
    shortPitch: 'Using multi-stage Dockerfiles and docker-compose, the entire distributed system (PostgreSQL 16, ASP.NET Core .NET 10 API, and Nginx-hosted Angular Frontend) runs with one command: docker-compose up --build.',
    deepTechnicalAnswer: [
      '1. Multi-Stage Builds: The backend Dockerfile uses mcr.microsoft.com/dotnet/sdk:10.0 for build/publish and strips the runtime container down to a lightweight, non-root alpine image (<120MB).',
      '2. Frontend Nginx Proxy: Angular is built with Node 20 and served via Nginx 1.27 with custom routing rules handling SPA client-side routing fallback (try_files $uri /index.html) and reverse-proxying /api and /hubs to the .NET API.',
      '3. Healthcheck Dependencies: In docker-compose.yml, backend_api depends on postgres_db with condition: service_healthy, preventing race-condition startup crashes.',
      '4. GitHub Actions CI: Automated .github/workflows/ci.yml verifies backend .NET builds/tests, Angular linter/compilation, and Docker image packaging on every pull request.'
    ],
    keyHighlights: [
      'Single-command deployment: docker-compose up -d --build',
      'Multi-stage Docker builds reducing image sizes by over 70%',
      'Non-root alpine container security hardening',
      'Automated GitHub Actions CI validation'
    ],
    codeReference: 'docker-compose.yml, backend/Dockerfile, frontend/Dockerfile, .github/workflows/ci.yml'
  }
];
