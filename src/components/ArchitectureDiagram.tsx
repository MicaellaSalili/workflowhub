import React, { useState } from 'react';
import { 
  Cloud, 
  Server, 
  Database, 
  Radio, 
  HardDrive, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Sparkles,
  Lock,
  Layers
} from 'lucide-react';

export const ArchitectureDiagram: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [storageMode, setStorageMode] = useState<'s3' | 'local'>('s3');

  const steps = [
    {
      step: 1,
      title: '1. Pre-Signed URL Request',
      subtitle: 'Client -> ASP.NET Core Web API',
      description: 'The Angular client requests a time-limited AWS SigV4 upload URL with metadata (FileName, ContentType, FileSizeBytes). ASP.NET Core validates permissions and signs a 15-minute token.',
      badge: 'POST /api/storage/presigned-upload-url'
    },
    {
      step: 2,
      title: '2. Direct Binary Cloud PUT',
      subtitle: 'Client -> Amazon AWS S3 (or LocalFiles/)',
      description: storageMode === 's3' 
        ? 'The browser executes a direct HTTP PUT to the Amazon S3 bucket. Multi-megabyte binary streams bypass the Web API instance, eliminating server CPU/RAM bottlenecks and cutting bandwidth egress in half.'
        : 'In Local Fallback mode, the client streams binary data to /api/storage/local-upload which writes directly to the /app/LocalFiles disk volume.',
      badge: storageMode === 's3' ? 'HTTP PUT https://workflowhub-bucket.s3.amazonaws.com/...' : 'HTTP PUT /api/storage/local-upload/...'
    },
    {
      step: 3,
      title: '3. Metadata Persistence',
      subtitle: 'ASP.NET Core -> PostgreSQL 16',
      description: 'Once the binary transfer succeeds, the client posts document metadata to the API. Entity Framework Core creates the Document record and initial immutable Audit Log entry.',
      badge: 'EF Core Insert -> PostgreSQL'
    },
    {
      step: 4,
      title: '4. SignalR WebSocket Broadcast',
      subtitle: 'ASP.NET Core -> All Connected Reviewers & Clients',
      description: 'DocumentHub broadcasts NewDocumentSubmitted or DocumentStatusChanged to all subscribed Angular clients in sub-50ms over active WebSockets.',
      badge: 'Clients.Group("role_reviewers").NewDocumentSubmitted()'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Architecture Bento Card */}
      <div className="bg-[#121216] rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                Interactive Architecture Engine
              </span>
              <span className="text-xs text-slate-400 font-medium">AWS S3 Pre-Signed + SignalR Hub</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Direct-to-Cloud Hybrid Storage & WebSocket Pipeline
            </h2>
          </div>

          <div className="flex items-center gap-2 bg-[#0a0a0c] p-1.5 rounded-xl border border-slate-800 self-start">
            <button
              onClick={() => setStorageMode('s3')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                storageMode === 's3'
                  ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              AWS S3 Pre-Signed Mode
            </button>
            <button
              onClick={() => setStorageMode('local')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                storageMode === 'local'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              LocalFiles/ Fallback Mode
            </button>
          </div>
        </div>

        {/* Visual Flow Topology Bento Row */}
        <div className="py-8 grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* Node 1: Angular Client */}
          <div className={`p-4 rounded-xl border transition-all ${
            activeStep === 1 || activeStep === 2
              ? 'border-yellow-400 bg-yellow-950/30 shadow-lg shadow-yellow-950/40 ring-1 ring-yellow-400'
              : 'border-slate-800 bg-[#0a0a0c]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center font-bold text-xs">
                NG
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Frontend</span>
            </div>
            <h4 className="font-bold text-white text-sm">Angular 19 Client</h4>
            <p className="text-xs text-slate-400 mt-1">Standalone components, Signals, RxJS & SignalR Client</p>
          </div>

          {/* Node 2: S3 Cloud or LocalFiles */}
          <div className={`p-4 rounded-xl border transition-all ${
            activeStep === 2
              ? 'border-amber-500 bg-amber-950/30 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500'
              : 'border-slate-800 bg-[#0a0a0c]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                storageMode === 's3' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {storageMode === 's3' ? <Cloud className="w-4 h-4" /> : <HardDrive className="w-4 h-4" />}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {storageMode === 's3' ? 'Direct S3 Storage' : 'Local Disk'}
              </span>
            </div>
            <h4 className="font-bold text-white text-sm">
              {storageMode === 's3' ? 'AWS S3 Bucket' : 'LocalFiles/ Volume'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {storageMode === 's3' ? 'Bypasses API server; encrypted AES256' : 'Persistent Docker volume fallback'}
            </p>
          </div>

          {/* Node 3: ASP.NET Core API */}
          <div className={`p-4 rounded-xl border transition-all ${
            activeStep === 1 || activeStep === 3 || activeStep === 4
              ? 'border-yellow-400 bg-yellow-950/30 shadow-lg shadow-yellow-950/40 ring-1 ring-yellow-400'
              : 'border-slate-800 bg-[#0a0a0c]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center justify-center font-bold text-xs">
                .NET
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">API Server</span>
            </div>
            <h4 className="font-bold text-white text-sm">ASP.NET Core Web API</h4>
            <p className="text-xs text-slate-400 mt-1">StorageController, DocumentController & DocumentHub</p>
          </div>

          {/* Node 4: PostgreSQL & SignalR */}
          <div className={`p-4 rounded-xl border transition-all ${
            activeStep === 3 || activeStep === 4
              ? 'border-blue-500 bg-blue-950/30 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500'
              : 'border-slate-800 bg-[#0a0a0c]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs">
                <Database className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Database & WS</span>
            </div>
            <h4 className="font-bold text-white text-sm">PostgreSQL + SignalR</h4>
            <p className="text-xs text-slate-400 mt-1">Code-First EF Core migrations & WebSocket hub</p>
          </div>
        </div>

        {/* Step-by-Step Interactive Controller */}
        <div className="bg-[#0a0a0c] rounded-xl p-5 border border-slate-800 text-white">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Step-by-Step Lifecycle Walkthrough
            </span>
            <div className="flex gap-1.5">
              {steps.map(s => (
                <button
                  key={s.step}
                  onClick={() => setActiveStep(s.step)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeStep === s.step
                      ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.step}
                </button>
              ))}
            </div>
          </div>

          {steps.map(s => {
            if (s.step !== activeStep) return null;
            return (
              <div key={s.step} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="text-yellow-400">{s.title}</span>
                    <span className="text-xs font-normal text-slate-400">({s.subtitle})</span>
                  </h3>
                  <code className="text-xs bg-slate-900 border border-slate-800 text-yellow-300 px-2.5 py-1 rounded font-mono">
                    {s.badge}
                  </code>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {s.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Grid: S3 Direct vs Fallback vs Anti-pattern Bento Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#121216] rounded-xl p-5 border border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <Zap className="w-5 h-5" />
            <h4 className="font-bold text-white text-sm">Direct S3 Pre-Signed (Production)</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            API generates temporary SigV4 token. Angular client uploads directly to AWS. Zero API server load.
          </p>
          <ul className="text-xs space-y-1.5 text-slate-300">
            <li className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Zero API Memory / RAM Spike
            </li>
            <li className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> 50% Reduction in Egress Bandwidth
            </li>
            <li className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> 15-Minute Expiration Security
            </li>
          </ul>
        </div>

        <div className="bg-[#121216] rounded-xl p-5 border border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <HardDrive className="w-5 h-5" />
            <h4 className="font-bold text-white text-sm">LocalFiles/ Fallback (Dev/CI)</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            When AWS keys are absent, ASP.NET Core seamlessly falls back to streaming directly to disk in docker-compose.
          </p>
          <ul className="text-xs space-y-1.5 text-slate-300">
            <li className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Zero AWS Billing or Card Required
            </li>
            <li className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Same Polymorphic IStorageService Interface
            </li>
            <li className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Docker Volume Persistence
            </li>
          </ul>
        </div>

        <div className="bg-[#121216] rounded-xl p-5 border border-slate-800 shadow-sm opacity-80">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Lock className="w-5 h-5" />
            <h4 className="font-bold text-white text-sm">Traditional API Proxy (Anti-pattern)</h4>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Legacy approach where user uploads to backend, and backend proxies to cloud.
          </p>
          <ul className="text-xs space-y-1.5 text-rose-400">
            <li className="flex items-center gap-1.5">
              ✕ Server buffers large multipart in RAM
            </li>
            <li className="flex items-center gap-1.5">
              ✕ Thread-pool starvation under high concurrency
            </li>
            <li className="flex items-center gap-1.5">
              ✕ Double bandwidth bill
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
