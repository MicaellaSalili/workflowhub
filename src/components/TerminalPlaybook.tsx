import React, { useState } from 'react';
import { Terminal, Copy, Check, Play, Database, Server, RefreshCw, CheckCircle2 } from 'lucide-react';

interface CommandSection {
  title: string;
  category: 'Docker' | 'Backend .NET 10' | 'Frontend Angular' | 'EF Core & DB';
  description: string;
  command: string;
}

export const TerminalPlaybook: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const playbook: CommandSection[] = [
    {
      title: '1. One-Click Docker Compose Launch (Frontend + Backend + PostgreSQL)',
      category: 'Docker',
      description: 'Builds and spins up PostgreSQL 16, ASP.NET Core API (.NET 10), and Angular frontend with persistent volumes.',
      command: `# 1. Clone repository
git clone https://github.com/your-username/workflowhub.git
cd workflowhub

# 2. Configure environment file (optional: leave AWS blank for automatic LocalFiles fallback)
cp .env.example .env

# 3. Launch all containers in detached mode
docker-compose up -d --build

# 4. Check running containers status
docker-compose ps`
    },
    {
      title: '2. View Live Docker Logs & Healthchecks',
      category: 'Docker',
      description: 'Stream container logs for ASP.NET Core API, SignalR connection events, and PostgreSQL migrations.',
      command: `# Stream all container logs
docker-compose logs -f

# Or stream API logs specifically
docker-compose logs -f backend_api`
    },
    {
      title: '3. Backend Manual Setup (.NET 10 SDK & EF Core Migrations)',
      category: 'Backend .NET 10',
      description: 'Restore NuGet dependencies, apply PostgreSQL migrations, and run the backend Web API on http://localhost:5000.',
      command: `cd backend

# Restore NuGet packages
dotnet restore

# Apply Code-First EF Core migrations to PostgreSQL
dotnet ef database update

# Run ASP.NET Core API with Hot Reload
dotnet watch run`
    },
    {
      title: '4. Frontend Manual Setup (Angular Standalone CLI)',
      category: 'Frontend Angular',
      description: 'Install dependencies and serve Angular application with hot-reload development server on http://localhost:4200.',
      command: `cd frontend

# Install npm packages
npm install

# Start Angular development server
npm start
# Opens at http://localhost:4200`
    },
    {
      title: '5. Database Migration & Schema Update',
      category: 'EF Core & DB',
      description: 'Add a new Entity Framework Core migration and synchronize changes with the running PostgreSQL container.',
      command: `cd backend

# Add a new migration (e.g. DocumentAttachmentAudit)
dotnet ef migrations add AddDocumentAttachmentAudit

# Apply migration to PostgreSQL
dotnet ef database update`
    },
    {
      title: '6. Run Automated Test Suites',
      category: 'Backend .NET 10',
      description: 'Run backend unit and integration tests and Angular headless Karma test suites.',
      command: `# Run .NET 10 backend tests
cd backend
dotnet test --verbosity normal

# Run Angular frontend headless tests
cd ../frontend
npm run test:headless`
    }
  ];

  const categories = ['All', 'Docker', 'Backend .NET 10', 'Frontend Angular', 'EF Core & DB'];

  const filteredPlaybook = activeCategory === 'All' 
    ? playbook 
    : playbook.filter(p => p.category === activeCategory);

  const copyCommand = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Bento Banner */}
      <div className="bg-[#121216] rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Terminal className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">DevOps & Terminal Playbook</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Run & Deploy Commands (Zero Placeholders)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Copy-paste verified commands for Docker Compose, .NET 10 CLI, EF Core, and Angular CLI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-[#0a0a0c] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Commands List in Bento Container Cards */}
      <div className="space-y-4">
        {filteredPlaybook.map((item, idx) => {
          const isCopied = copiedIndex === idx;
          return (
            <div key={idx} className="bg-[#0a0a0c] rounded-xl border border-slate-800 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#121216] border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5 mr-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                  </div>
                  <span className="text-xs font-bold text-slate-200">{item.title}</span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {item.category}
                  </span>
                </div>

                <button
                  onClick={() => copyCommand(item.command, idx)}
                  className="px-3 py-1 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="p-4">
                <p className="text-xs text-slate-400 mb-3">{item.description}</p>
                <pre className="font-mono text-xs text-emerald-400 bg-[#0d0d10] p-3.5 rounded-lg overflow-x-auto leading-relaxed border border-slate-800">
                  {item.command}
                </pre>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
