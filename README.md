# WorkflowHub

Enterprise document workflow platform. ASP.NET Core (.NET 10) API, Angular standalone-component frontend, PostgreSQL, SignalR for real-time updates, and a hybrid AWS S3 / local filesystem storage layer.

[![CI](https://img.shields.io/badge/CI-passing-brightgreen.svg)](https://github.com/your-username/workflowhub/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![.NET](https://img.shields.io/badge/.NET-10.0-purple.svg)](https://dotnet.microsoft.com/)
[![Angular](https://img.shields.io/badge/Angular-19.0-red.svg)](https://angular.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-blue.svg)](https://www.postgresql.org/)

---

## Overview

WorkflowHub is a document review system built around two core design decisions:

- **Direct-to-cloud uploads via AWS S3 pre-signed URLs**, so large file uploads never pass through (or block) the API server.
- **An environment-aware storage fallback** that switches to local disk storage automatically when AWS credentials aren't present — so the project runs fully offline for local dev, CI, and air-gapped testing.

Document status changes and reviewer comments are pushed to connected clients in real time over SignalR.

---

## Architecture

```
+-------------------------------+                     +-------------------------------+
|  Angular Standalone Client    |                     |  Angular Standalone Client     |
|      (Submitter View)         |                     |      (Reviewer View)           |
+---------------+---------------+                     +----------------+----------------+
                |                                                       ^
                | 1. Request pre-signed URL                             | 5. SignalR push
                |    POST /api/storage/presigned-upload-url             |    (status change,
                v                                                       |     new comment)
+---------------+-------------------------------------------------------+----------------+
|                                                                                          |
|                          ASP.NET Core Web API (.NET 10)                                 |
|   +-------------------+   +-----------------------+   +-----------------------+         |
|   | StorageController |   |   DocumentController   |   |     DocumentHub       |         |
|   | (S3 / local)       |   | (lifecycle + review)   |   |     (SignalR)         |         |
|   +---------+---------+   +-----------+-----------+   +-----------+-----------+         |
+-------------|--------------------------|-----------------------------|-------------------+
              |                          |                             |
   [AWS configured]             [EF Core / PostgreSQL]            [WebSockets]
              |                          |                             |
              v                          v                             |
   +----------+----------+     +---------+---------+                   |
   |     AWS S3 bucket    |     | PostgreSQL 16 DB  |                   |
   +----------+----------+     +--------------------+                   |
              ^                                                         |
              | 2. Direct binary PUT (bypasses API server)              |
              +----------------------------------------------------------+

   [AWS absent -> local fallback]
              |
              v
   +----------+----------+
   |  Local disk storage  |
   +-----------------------+
```

**Why pre-signed URLs:** files stream directly from the browser to S3, so the API server never buffers multi-megabyte payloads. It also cuts double-bandwidth cost (client → API → S3) and the URLs are time-limited (15 min) and scoped to a specific HTTP verb and content type.

**Why the local fallback:** it means the whole stack runs via `docker-compose up` with no AWS account needed, CI can run without network dependencies, and there's a fallback path for air-gapped environments. `IStorageService` is injected via DI, and the app resolves either `S3StorageService` or `LocalStorageService` at runtime depending on whether AWS credentials are configured.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Angular 19+, TypeScript, SCSS | Standalone components, signals, reactive forms, `@microsoft/signalr` |
| Backend | ASP.NET Core Web API (.NET 10) | Clean architecture, DI, policy-based RBAC |
| Database | PostgreSQL 16 + EF Core | Code-first migrations |
| Real-time | ASP.NET Core SignalR | Strongly-typed hubs, group broadcasting, auto-reconnect |
| Storage | AWS SDK for S3 + local disk | Pre-signed URLs, streaming I/O |
| DevOps | Docker, Compose, Nginx, GitHub Actions | Multi-stage builds, non-root containers |

---

## Quick Start (Docker)

```bash
git clone https://github.com/your-username/workflowhub.git
cd workflowhub

cp .env.example .env
# then set POSTGRES_PASSWORD and any AWS credentials in .env

docker-compose up -d --build
docker-compose ps
```

**Access points:**
- Angular frontend: http://localhost (or http://localhost:4200 when running standalone)
- Swagger API docs: http://localhost:5000/swagger
- SignalR WebSocket endpoint: `ws://localhost:5000/hubs/documents`
- PostgreSQL: `localhost:5432` (credentials from `.env`)

---

## Useful Docker & Development Commands

### Managing Docker Compose Stack
```bash
# Start all containers in the background (with build)
docker-compose up -d --build

# View live aggregate logs across all services
docker-compose logs -f

# View live logs for a specific service
docker-compose logs -f backend_api
docker-compose logs -f frontend_app
docker-compose logs -f postgres_db

# Check status and health of all containers
docker-compose ps

# Stop and remove containers and networks
docker-compose down

# Stop and remove containers, networks, AND persistent volumes (Fresh DB reset)
docker-compose down -v

# Restart a specific service (e.g. backend after configuration changes)
docker-compose restart backend_api
```

### Local Development Tips (Windows / macOS / Linux)

**Frontend Troubleshooting:**
```bash
cd frontend
# If Angular cache causes build anomalies
rm -rf .angular/cache
npm start
```

**Backend Troubleshooting:**
```bash
cd backend
# Database migrations are applied automatically at runtime on startup.
# To run backend independently with Docker Postgres:
docker-compose up -d postgres_db
dotnet run
```

---

## Manual Local Setup

**Backend (.NET 10 API)**
```bash
cd backend
dotnet restore
dotnet ef database update
dotnet run
```

**Frontend (Angular)**
```bash
cd frontend
npm install
npm start
# http://localhost:4200
```

---

## Role-Based Access Control

**Submitters**
- Upload documents (via S3 pre-signed URL or local fallback)
- Track submission status in real time
- View feedback and reply to reviewer comments

**Reviewers**
- View the pending queue across all org submissions
- Approve, reject, or request changes on documents
- Post timestamped comments to the audit thread

---

## Tests & CI

```bash
# backend
cd backend
dotnet test --verbosity normal

# frontend
cd frontend
npm run test:headless
```

`.github/workflows/ci.yml` runs on every PR: builds and tests the .NET 10 backend, builds and lints the Angular frontend, and builds the Docker images to catch drift.

---

## License

MIT