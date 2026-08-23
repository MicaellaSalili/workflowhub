import React, { useState } from 'react';
import { StorageMode, UserPersona, WorkflowDocument } from '../types/workflow';
import { Cloud, HardDrive, Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserPersona;
  activeStorageMode: StorageMode;
  onSubmit: (doc: Partial<WorkflowDocument>) => void;
}

export const DocumentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  activeStorageMode,
  onSubmit
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Engineering' | 'Architecture' | 'Security' | 'Legal' | 'Operations'>('Architecture');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<string>('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileName(file.name);
      setFileSize(file.size || 3450000); // default to ~3.4MB if simulated
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
    }
  };

  const handlePresetSelect = (presetTitle: string, presetCategory: any, presetFile: string, presetSize: number) => {
    setTitle(presetTitle);
    setCategory(presetCategory);
    setFileName(presetFile);
    setFileSize(presetSize);
    setDescription(`Production technical RFC and architectural documentation for ${presetTitle}.`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !fileName) return;

    setIsSimulatingUpload(true);
    setUploadProgress(10);
    setUploadStage(
      activeStorageMode === 'AwsS3'
        ? 'Step 1/3: Requesting AWS S3 SigV4 Pre-signed Upload URL (POST /api/storage/presigned-upload-url)...'
        : 'Step 1/3: Requesting LocalFiles/ Fallback Streaming Target...'
    );

    setTimeout(() => {
      setUploadProgress(50);
      setUploadStage(
        activeStorageMode === 'AwsS3'
          ? 'Step 2/3: Direct HTTP PUT binary transfer to S3 bucket (Bypassing API server bandwidth)...'
          : 'Step 2/3: Direct HTTP PUT streaming to /app/LocalFiles disk volume...'
      );
    }, 700);

    setTimeout(() => {
      setUploadProgress(85);
      setUploadStage('Step 3/3: Registering metadata in PostgreSQL & dispatching SignalR broadcast...');
    }, 1400);

    setTimeout(() => {
      setUploadProgress(100);
      setIsSimulatingUpload(false);

      const newDoc: Partial<WorkflowDocument> = {
        title,
        category,
        description,
        originalFileName: fileName,
        storedFileKey: `documents/2026/08/${Math.random().toString(36).substring(2, 9)}_${fileName}`,
        fileSizeBytes: fileSize || 2840000,
        contentType: fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
        storageProvider: activeStorageMode,
        status: 'Submitted',
        versionNumber: 1,
        submitterId: currentUser.id,
        submitterName: currentUser.name,
        createdAt: new Date().toISOString(),
        comments: [],
        auditLogs: [
          {
            id: 'audit-' + Math.random().toString(36).substr(2, 9),
            action: 'Document Submitted',
            performedBy: currentUser.name,
            details: `Uploaded '${fileName}' via ${activeStorageMode === 'AwsS3' ? 'Direct S3 Pre-Signed URL' : 'LocalFiles/ Fallback'}.`,
            timestamp: new Date().toISOString()
          }
        ]
      };

      onSubmit(newDoc);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121216] rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-150 text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Submit New Workflow Document</h3>
              <span className="text-xs text-slate-400">
                Active Storage: <strong className="text-indigo-300">{activeStorageMode === 'AwsS3' ? 'AWS S3 Direct Cloud Bucket' : 'LocalFiles/ Disk Fallback'}</strong>
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Sample Presets */}
        <div className="mt-4 p-3 bg-[#0a0a0c] rounded-xl border border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            One-Click Realistic Presets
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handlePresetSelect('Zero-Trust Network Perimeter RFC', 'Security', 'ZeroTrust_Perimeter_Architecture_v1.pdf', 3840000)}
              className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-indigo-600 hover:text-white border border-slate-800 rounded-md font-medium text-slate-300 transition-all cursor-pointer"
            >
              + Zero-Trust Security RFC
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('PostgreSQL Multi-Region Sharding Design', 'Architecture', 'PostgreSQL_Sharding_Plan_2026.docx', 5120000)}
              className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-indigo-600 hover:text-white border border-slate-800 rounded-md font-medium text-slate-300 transition-all cursor-pointer"
            >
              + DB Sharding Architecture
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('Enterprise GraphQL Federation Gateway RFC', 'Engineering', 'GraphQL_Federation_Gateway.pdf', 2900000)}
              className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-indigo-600 hover:text-white border border-slate-800 rounded-md font-medium text-slate-300 transition-all cursor-pointer"
            >
              + GraphQL Gateway RFC
            </button>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Document Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Q3 Microservices Event Architecture Spec"
              className="w-full px-3.5 py-2 text-sm bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2 text-sm bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="Architecture" className="bg-[#121216]">Architecture</option>
                <option value="Engineering" className="bg-[#121216]">Engineering</option>
                <option value="Security" className="bg-[#121216]">Security</option>
                <option value="Legal" className="bg-[#121216]">Legal</option>
                <option value="Operations" className="bg-[#121216]">Operations</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Submitter Persona</label>
              <div className="px-3 py-2 bg-[#0a0a0c] border border-slate-800 rounded-lg text-xs font-medium text-slate-300 truncate">
                {currentUser.name} ({currentUser.role})
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Summary / Review Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief abstract or review notes for architects..."
              className="w-full px-3.5 py-2 text-sm bg-[#0a0a0c] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Document File (PDF, DOCX, ZIP, XLSX - Max 25MB) *
            </label>
            <div className="border-2 border-dashed border-slate-800 rounded-xl p-4 text-center hover:border-indigo-500 transition-all bg-[#0a0a0c]">
              <input
                type="file"
                id="doc-upload"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center gap-1">
                <FileText className="w-8 h-8 text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-400 hover:underline">
                  {fileName ? `Change file: ${fileName}` : 'Click to select file or drag here'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)} MB payload` : 'Simulates direct pre-signed URL binary stream'}
                </span>
              </label>
            </div>
          </div>

          {/* Active Uploading Stage Bar */}
          {isSimulatingUpload && (
            <div className="p-3.5 bg-indigo-950/80 border border-indigo-500/30 text-white rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-indigo-200">{uploadStage}</span>
                <span className="text-indigo-300">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSimulatingUpload}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title || !fileName || isSimulatingUpload}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              {isSimulatingUpload ? 'Uploading Stream...' : 'Submit Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
