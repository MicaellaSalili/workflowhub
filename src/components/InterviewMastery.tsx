import React, { useState } from 'react';
import { INTERVIEW_TOPICS, InterviewTopic } from '../data/interviewGuide';
import { 
  MessageSquare, 
  Sparkles, 
  Copy, 
  Check, 
  Code, 
  ChevronRight, 
  Award,
  Lightbulb,
  FileCode,
  Bookmark
} from 'lucide-react';

export const InterviewMastery: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<InterviewTopic>(INTERVIEW_TOPICS[0]);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const categories = ['All', 'Storage Architecture', 'Real-time WebSockets', 'Database & EF Core', 'DevOps & Docker'];

  const filteredTopics = filterCategory === 'All' 
    ? INTERVIEW_TOPICS 
    : INTERVIEW_TOPICS.filter(t => t.category === filterCategory);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Hero Bento Banner for Interview Talking Points */}
      <div className="bg-[#121216] rounded-2xl p-6 text-white border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-yellow-400" /> HR & Technical Interview Script
              </span>
              <span className="text-xs text-slate-400">Ready to speak with confidence</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              The Exact Narrative to Pitch "WorkflowHub" in Tech Interviews
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Turn your architectural choices into persuasive engineering storytelling that proves senior design maturity, cost mindfulness, and modern full-stack mastery.
            </p>
          </div>

          <div className="bg-[#0a0a0c] p-3.5 rounded-xl border border-slate-800 shrink-0 self-start">
            <div className="text-[11px] uppercase tracking-wider text-yellow-400 font-semibold mb-1">
              Elevator Pitch (One Sentence)
            </div>
            <p className="text-xs text-slate-300 italic max-w-sm">
              "I architected WorkflowHub using AWS S3 for direct cloud storage via pre-signed URLs, but engineered a polymorphic local filesystem fallback to enable zero-cost local development and offline environments."
            </p>
          </div>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterCategory === cat
                ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/30'
                : 'bg-[#121216] text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Split: Topic List + Detailed Answer Bento Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Topics List Bento Cards */}
        <div className="lg:col-span-5 space-y-3">
          {filteredTopics.map(topic => {
            const isSelected = selectedTopic.id === topic.id;
            return (
              <div
                key={topic.id}
                onClick={() => setSelectedTopic(topic)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-yellow-400/10 border-yellow-400 shadow-md shadow-yellow-950/30 ring-1 ring-yellow-400'
                    : 'bg-[#121216] border-slate-800 hover:border-slate-700 hover:bg-[#16161b]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0a0a0c] text-yellow-300 border border-slate-800 uppercase">
                    {topic.category}
                  </span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-yellow-400 translate-x-0.5' : 'text-slate-500'}`} />
                </div>
                <h3 className="text-sm font-bold text-white leading-snug">
                  {topic.question}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {topic.shortPitch}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right Column: Deep Breakdown Bento Card */}
        <div className="lg:col-span-7 bg-[#121216] rounded-2xl p-6 border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                {selectedTopic.category}
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5">
                {selectedTopic.question}
              </h2>
            </div>
            <button
              onClick={() => copyToClipboard(selectedTopic.shortPitch)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-1.5 shrink-0 self-start cursor-pointer"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedScript ? 'Copied Pitch!' : 'Copy Pitch'}
            </button>
          </div>

          {/* Core Elevator Pitch */}
          <div className="bg-yellow-950/20 border border-yellow-400/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-300 font-bold text-xs mb-1.5">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              Quick Answer Pitch (Say this first):
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              "{selectedTopic.shortPitch}"
            </p>
          </div>

          {/* Deep Technical Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              Detailed Technical Explanation (When interviewer asks for depth):
            </h4>
            <div className="space-y-2.5">
              {selectedTopic.deepTechnicalAnswer.map((point, idx) => (
                <div key={idx} className="text-xs text-slate-300 leading-relaxed bg-[#0a0a0c] p-3 rounded-lg border border-slate-800">
                  {point}
                </div>
              ))}
            </div>
          </div>

          {/* Key Bullet Highlights */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Key Engineering Buzzwords & Concepts:
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedTopic.keyHighlights.map((hl, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#0a0a0c] text-yellow-300 border border-slate-800">
                  ✓ {hl}
                </span>
              ))}
            </div>
          </div>

          {/* Code Reference Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-yellow-400" />
              Inspected Code Reference:
            </span>
            <code className="bg-[#0a0a0c] text-yellow-300 border border-slate-800 px-2 py-0.5 rounded font-mono text-[11px]">
              {selectedTopic.codeReference}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
