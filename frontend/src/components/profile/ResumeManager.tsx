'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';

interface ResumeData {
  id:              string;
  originalName:    string;
  fileSize:        number;
  mimeType:        string;
  uploadedDate:    string;
  isParsed:        boolean;
  parseError:      string | null;
  skillCount:      number;
  experienceYears: number | null;
  jobTitle:        string | null;
  lastUpdated:     string;
  fileUrl?:        string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fileTypeLabel(mimeType: string, name: string): string {
  if (mimeType?.includes('pdf')  || name?.endsWith('.pdf'))  return 'PDF';
  if (mimeType?.includes('word') || name?.endsWith('.docx')) return 'DOCX';
  if (name?.endsWith('.doc'))  return 'DOC';
  if (name?.endsWith('.txt'))  return 'TXT';
  return 'DOC';
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ResumeManager() {
  const [resume,            setResume]            = useState<ResumeData | null>(null);
  const [pageLoading,       setPageLoading]       = useState(true);
  const [uploading,         setUploading]         = useState(false);
  const [uploadProgress,    setUploadProgress]    = useState(0);
  const [deleting,          setDeleting]          = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPreview,       setShowPreview]       = useState(false);
  const [previewBlobUrl,    setPreviewBlobUrl]    = useState<string | null>(null);
  const [loadingPreview,    setLoadingPreview]    = useState(false);
  const [isDragOver,        setIsDragOver]        = useState(false);
  const [error,             setError]             = useState('');
  const [success,           setSuccess]           = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Auto-clear toasts ────────────────────────────────────────────────────
  const flash = (type: 'ok' | 'err', msg: string) => {
    if (type === 'ok') { setSuccess(msg); setTimeout(() => setSuccess(''), 5000); }
    else               { setError(msg);   setTimeout(() => setError(''), 6000);   }
  };

  // ── Fetch current resume from backend ────────────────────────────────────
  const fetchResume = useCallback(async () => {
    try {
      const res = await api.get('/auth/resume/me');
      setResume(res.data.hasResume ? (res.data.data as ResumeData) : null);
    } catch (e: any) {
      console.error('Resume fetch status:', e?.statusCode, '| Message:', e?.message);
      setResume(null);
    } finally {
      setPageLoading(false);
    }
  }, []);

  // On mount: load resume profile data
  useEffect(() => { fetchResume(); }, [fetchResume]);

  // ── Validate and start upload ─────────────────────────────────────────────
  const handleFile = (file: File) => {
    setError('');
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    if (!['.pdf', '.doc', '.docx', '.txt'].includes(ext)) {
      flash('err', 'Please upload a PDF, Word (.doc/.docx), or TXT file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      flash('err', 'File size must be under 10 MB.');
      return;
    }
    doUpload(file);
  };

  const doUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');

    const form = new FormData();
    form.append('resume', file);

    try {
      await api.post('/auth/resume/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded / (e.total ?? e.loaded)) * 100));
        },
      });
      await fetchResume();
      flash('ok', 'Resume uploaded successfully. Skills are being extracted.');
    } catch (e: any) {
      flash('err', e?.message ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await api.delete('/auth/resume/me');
      setResume(null);
      setShowDeleteConfirm(false);
      handleClosePreview();
      flash('ok', 'Resume deleted.');
    } catch (e: any) {
      flash('err', e?.message ?? 'Delete failed. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Fetch file via /auth/resume/me/file (Working Download Logic) ─────────
  const handleOpenPreview = async () => {
    setShowPreview(true);
    setLoadingPreview(true);
    try {
      const response = await api.get('/auth/resume/me/file', {
        responseType: 'arraybuffer',
      });

      if (response?.data) {
        const blob = new Blob([response.data], {
          type: resume?.mimeType || 'application/pdf',
        });
        const url = URL.createObjectURL(blob);
        setPreviewBlobUrl(url);
      }
    } catch (e: any) {
      console.error('Failed to load PDF preview:', e);
      flash('err', e?.message ?? 'Could not fetch your profile CV file.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // ── Close Preview & Revoke URL ───────────────────────────────────────────
  const handleClosePreview = () => {
    setShowPreview(false);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
  };

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true);  };
  const onDragLeave = ()                   => setIsDragOver(false);
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // ── Hidden file input shared by upload zones ─────────────────────────────
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".pdf,.doc,.docx,.txt"
      className="hidden"
      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
    />
  );

  // ── Toast bar ────────────────────────────────────────────────────────────
  const toast = (success || error) && (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border shadow-sm mb-4 transition-all ${
      success
        ? 'bg-emerald-50 border-emerald-200/80 text-emerald-800'
        : 'bg-rose-50 border-rose-200/80 text-rose-800'
    }`}>
      {success ? (
        <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 0 0118 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-rose-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 0 0118 0z" />
        </svg>
      )}
      <span className="font-medium text-xs sm:text-sm">{success || error}</span>
    </div>
  );

  // ── LOADING skeleton ─────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-14 bg-slate-100 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-4 bg-slate-100 rounded-md w-48" />
            <div className="h-3 bg-slate-100 rounded-md w-32" />
          </div>
        </div>
        <div className="h-3 bg-slate-100 rounded-md w-full" />
      </div>
    );
  }

  // ── UPLOADING state ──────────────────────────────────────────────────────
  if (uploading) {
    return (
      <div className="bg-white border border-[#0084FF]/20 rounded-2xl p-6 shadow-sm">
        {toast}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-[#0084FF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-[#0084FF] animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Uploading resume...</p>
            <p className="text-xs text-slate-500 mt-0.5">{uploadProgress}% completed</p>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#0084FF] h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      </div>
    );
  }

  // ── HAS RESUME ───────────────────────────────────────────────────────────
  if (resume) {
    const isPdf = resume.mimeType?.includes('pdf') || resume.originalName?.endsWith('.pdf');

    return (
      <>
        {fileInput}
        {toast}

        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden transition-all hover:border-slate-300">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Resume Uploaded
              </span>
            </div>
            
            <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${
              resume.isParsed
                ? 'bg-[#0084FF]/10 text-[#0084FF]'
                : 'bg-amber-50 text-amber-700 border border-amber-200/60'
            }`}>
              {resume.isParsed ? (
                <>
                  <svg className="w-3.5 h-3.5 text-[#0084FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{resume.skillCount} {resume.skillCount === 1 ? 'skill' : 'skills'} extracted</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-amber-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Parsing...</span>
                </>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-14 rounded-xl border border-[#0084FF]/20 bg-[#0084FF]/5 flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-[#0084FF] uppercase tracking-wider">
                  {fileTypeLabel(resume.mimeType, resume.originalName)}
                </span>
                <svg className="w-5 h-5 text-[#0084FF] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate" title={resume.originalName}>
                  {resume.originalName}
                </p>
                
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-slate-500">
                  <span>{formatSize(resume.fileSize)}</span>
                  <span className="text-slate-300">•</span>
                  <span>Uploaded {formatDate(resume.uploadedDate)}</span>
                  {resume.experienceYears && resume.experienceYears > 0 && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>{resume.experienceYears} yrs experience</span>
                    </>
                  )}
                </div>

                {resume.isParsed && resume.skillCount > 0 && (
                  <p className="text-xs text-[#0084FF] font-medium mt-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 0 0118 0z" />
                    </svg>
                    Ready for ATS matching
                  </p>
                )}
                
                {!resume.isParsed && !resume.parseError && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Extracting skills from your CV...
                  </p>
                )}
                
                {resume.parseError && (
                  <p className="text-xs text-amber-600 mt-2">
                    Parsing completed with warnings. Some data may be limited.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleOpenPreview}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0084FF]/10 text-[#0084FF] hover:bg-[#0084FF]/20 transition-all"
                title="Preview Resume"
              >
                <svg className="w-4 h-4 text-[#0084FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Change Resume
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-rose-100 bg-rose-50/50 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all"
              >
                <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* CV Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col border border-slate-100 overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#0084FF]/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#0084FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm truncate" title={resume.originalName}>
                      {resume.originalName}
                    </h3>
                    <p className="text-xs text-slate-500">{formatSize(resume.fileSize)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {previewBlobUrl && (
                    <a
                      href={previewBlobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open New Tab
                    </a>
                  )}
                  
                  <button
                    onClick={handleClosePreview}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body / Viewer */}
              <div className="flex-1 bg-slate-100/60 p-4 overflow-hidden relative">
                {loadingPreview ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500 bg-white rounded-xl border border-slate-200">
                    <span className="w-6 h-6 border-2 border-[#0084FF] border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-medium">Loading document preview...</p>
                  </div>
                ) : isPdf && previewBlobUrl ? (
                  <iframe
                    src={previewBlobUrl}
                    className="w-full h-full rounded-xl border border-slate-200/80 bg-white shadow-inner"
                    title="Resume Preview"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl border border-slate-200 bg-white p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-[#0084FF]/10 rounded-2xl flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-[#0084FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">Direct preview not supported for Word files</h4>
                    <p className="text-xs text-slate-500 max-w-sm mb-5">
                      Word documents (.doc, .docx) cannot be rendered directly in the browser preview. You can download the file directly.
                    </p>
                    {previewBlobUrl && (
                      <a
                        href={previewBlobUrl}
                        download={resume.originalName}
                        className="px-4 py-2 text-xs font-semibold bg-[#0084FF] text-white rounded-xl hover:bg-[#0073e6] transition-all shadow-sm inline-flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Document
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-slate-100">
              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Delete Resume?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Deleting your resume will remove all extracted skills, experience data, and ATS match scores. You will need to re-upload a CV to apply for jobs.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={doDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {deleting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : 'Delete Resume'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── NO RESUME — upload dropzone ──────────────────────────────────────────
  return (
    <>
      {fileInput}
      {toast}

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`bg-white border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all select-none shadow-sm ${
          isDragOver
            ? 'border-[#0084FF] bg-[#0084FF]/5 shadow-md scale-[1.005]'
            : 'border-slate-200 hover:border-[#0084FF]/50 hover:bg-slate-50/50'
        }`}
      >
        <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all ${
          isDragOver ? 'bg-[#0084FF] text-white shadow-md' : 'bg-[#0084FF]/10 text-[#0084FF]'
        }`}>
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <p className="text-base font-semibold text-slate-900">
          {isDragOver ? 'Drop your resume here' : 'Upload your Resume'}
        </p>
        <p className="text-xs text-slate-500 mt-1">Drag and drop or click to browse files</p>
        <p className="text-[11px] text-slate-400 mt-2 font-medium">PDF, DOC, DOCX, TXT up to 10 MB</p>

        <button
          type="button"
          className="mt-5 px-5 py-2.5 text-xs font-semibold bg-[#0084FF] text-white rounded-xl hover:bg-[#0073e6] transition-all shadow-sm pointer-events-none"
        >
          Choose File
        </button>
      </div>
    </>
  );
}