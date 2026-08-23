import React, { useState } from 'react';
import { CODEBASE_FILES, CodeFile } from '../data/codebaseFiles';
import { 
  FolderTree, 
  FileCode, 
  Copy, 
  Check, 
  Search, 
  Download, 
  ExternalLink,
  Code2,
  FileText,
  Layers,
  Terminal
} from 'lucide-react';

export const CodebaseExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(CODEBASE_FILES[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const categories = ['All', 'Backend .NET 10', 'Frontend Angular', 'DevOps & Docker', 'Database & EF'];

  const filteredFiles = CODEBASE_FILES.filter(f => {
    const matchesCategory = activeCategory === 'All' || f.category === activeCategory;
    const matchesSearch = f.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const copyCurrentFile = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadAllAsBundle = () => {
    const content = CODEBASE_FILES.map(f => `// ==========================================\n// FILE: ${f.path}\n// CATEGORY: ${f.category}\n// ==========================================\n\n${f.content}\n\n`).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'WorkflowHub_Full_Source_Bundle.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar Bento Header */}
      <div className="bg-[#121216] rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FolderTree className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Production Codebase Inspector</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-0.5">
            Full-Stack Project Files (100% Production Ready)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search file path or keyword..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#0a0a0c] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 w-56 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={downloadAllAsBundle}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Code Bundle
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-[#121216] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Code Browser Split Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: File Tree Bento Card */}
        <div className="lg:col-span-4 bg-[#121216] rounded-xl border border-slate-800 shadow-md p-3 max-h-[700px] overflow-y-auto space-y-1">
          <div className="text-[11px] font-bold uppercase text-slate-500 px-2 py-1 tracking-wider">
            Source Files ({filteredFiles.length})
          </div>
          {filteredFiles.map(file => {
            const isSelected = selectedFile.path === file.path;
            return (
              <div
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/30'
                    : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span className="font-mono text-xs truncate flex-1">{file.path}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 line-clamp-1 font-normal">
                  {file.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Code Viewer Bento Card */}
        <div className="lg:col-span-8 bg-[#0a0a0c] rounded-xl border border-slate-800 shadow-md overflow-hidden flex flex-col">
          {/* File Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#121216] border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-200">{selectedFile.path}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {selectedFile.language}
              </span>
            </div>

            <button
              onClick={copyCurrentFile}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {isCopied ? 'Copied File!' : 'Copy Code'}
            </button>
          </div>

          <div className="px-4 py-2 bg-[#0d0d10] border-b border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>{selectedFile.description}</span>
            <span className="text-[11px] font-mono text-slate-500">
              {selectedFile.content.split('\n').length} lines
            </span>
          </div>

          {/* Code Content */}
          <div className="p-4 overflow-x-auto max-h-[600px] overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed bg-[#0a0a0c]">
            <pre>
              {selectedFile.content.split('\n').map((line, i) => (
                <div key={i} className="flex">
                  <span className="w-10 select-none text-slate-600 text-right pr-4 shrink-0 font-mono">
                    {i + 1}
                  </span>
                  <span className="flex-1 whitespace-pre">{line}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
