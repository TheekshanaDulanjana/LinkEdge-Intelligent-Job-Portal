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
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatSize(bytes: number): string {
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
  if (mimeType?.includes('pdf')  || name.endsWith('.pdf'))  return 'PDF';
  if (mimeType?.includes('word') || name.endsWith('.docx')) return 'DOCX';
  if (name.endsWith('.doc'))  return 'DOC';
  if (name.endsWith('.txt'))  return 'TXT';
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
      console.error('Resume fetch failed:', e?.message);
      setResume(null);   // treat as no resume — don't block the profile page
    } finally {
      setPageLoading(false);
    }
  }, []);

  // On mount: always load from backend, not just local state
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
      // Re-fetch from DB so the displayed info comes from the source of truth
      await fetchResume();
      flash('ok', 'Resume uploaded successfully. Skills are being extracted…');
    } catch (e: any) {
      flash('err', e?.response?.data?.message ?? 'Upload failed. Please try again.');
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
      flash('ok', 'Resume deleted.');
    } catch (e: any) {
      flash('err', e?.response?.data?.message ?? 'Delete failed. Please try again.');
    } finally {
      setDeleting(false);
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

  // ── Hidden file input shared by both upload zones ────────────────────────
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
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-lg text-sm border mb-3 ${
      success
        ? 'bg-green-50 border-green-200 text-green-700'
        : 'bg-red-50   border-red-200   text-red-600'
    }`}>
      <span className="mt-px font-bold">{success ? '✓' : '!'}</span>
      <span>{success || error}</span>
    </div>
  );

  // ── LOADING skeleton ─────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="border border-gray-200 rounded-xl p-5 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-40" />
            <div className="h-3 bg-gray-100 rounded w-28" />
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded w-full" />
      </div>
    );
  }

  // ── UPLOADING state (shown while file is transferring) ───────────────────
  if (uploading) {
    return (
      <div className="border border-purple-200 bg-purple-50 rounded-xl p-5">
        {toast}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-800">Uploading resume…</p>
            <p className="text-xs text-purple-500 mt-0.5">{uploadProgress}% complete</p>
          </div>
        </div>
        <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-200"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      </div>
    );
  }

  // ── HAS RESUME ───────────────────────────────────────────────────────────
  if (resume) {
    return (
      <>
        {fileInput}
        {toast}

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Status header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                Resume Uploaded
              </span>
            </div>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
              resume.isParsed
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {resume.isParsed
                ? `${resume.skillCount} skill${resume.skillCount === 1 ? '' : 's'} extracted`
                : '⏳ Parsing…'}
            </span>
          </div>

          {/* File detail */}
          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* File type badge */}
              <div className="w-12 h-14 rounded-lg border border-red-100 bg-red-50 flex flex-col items-center justify-center flex-shrink-0 gap-0.5">
                <span className="text-[9px] font-bold text-red-600 uppercase">
                  {fileTypeLabel(resume.mimeType, resume.originalName)}
                </span>
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>

              {/* File metadata */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate" title={resume.originalName}>
                  {resume.originalName}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-gray-400">
                  <span>{formatSize(resume.fileSize)}</span>
                  <span>·</span>
                  <span>Uploaded {formatDate(resume.uploadedDate)}</span>
                  {resume.experienceYears && resume.experienceYears > 0 && (
                    <>
                      <span>·</span>
                      <span>{resume.experienceYears}y experience detected</span>
                    </>
                  )}
                </div>

                {/* Parse status */}
                {resume.isParsed && resume.skillCount > 0 && (
                  <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                    Ready for ATS matching
                  </p>
                )}
                {!resume.isParsed && !resume.parseError && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin inline-block flex-shrink-0" />
                    Extracting skills from your CV…
                  </p>
                )}
                {resume.parseError && (
                  <p className="text-xs text-orange-500 mt-1.5">
                    Parsing completed with warnings — some data may be limited.
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                Change Resume
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in duration-150">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Delete Resume?</h3>
                  <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                Deleting your resume will remove all extracted skills, experience data, and ATS match scores. You will need to re-upload a CV to apply for jobs.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={doDelete}
                  disabled={deleting}
                  className="flex-1 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting…
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
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none ${
          isDragOver
            ? 'border-purple-400 bg-purple-50'
            : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
        }`}
      >
        <div className={`w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center ${
          isDragOver ? 'bg-purple-100' : 'bg-gray-100'
        }`}>
          <svg className={`w-7 h-7 ${isDragOver ? 'text-purple-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
        </div>

        <p className="text-sm font-semibold text-gray-700">
          {isDragOver ? 'Drop your resume here' : 'Upload your Resume'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Drag & drop or click to browse</p>
        <p className="text-xs text-gray-300 mt-2">PDF · DOC · DOCX · TXT — max 10 MB</p>

        <button
          type="button"
          className="mt-4 px-5 py-2 text-xs font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors pointer-events-none"
        >
          Choose File
        </button>
      </div>
    </>
  );
}