'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, RotateCcw, Save } from 'lucide-react';
import { adminGet, adminSend, errMsg } from '@/lib/admin';
import { Btn, ErrorBox, Modal, Spinner, useToast } from '@/components/admin/ui';
import { EDITORS, PUBLIC_PATH } from '@/components/admin/editors';

interface Block { key: string; label: string; value: unknown; defaults: unknown }

export default function ContentEditorPage() {
  const { key } = useParams<{ key: string }>();
  const toast = useToast();
  const [block, setBlock] = useState<Block | null>(null);
  const [draft, setDraft] = useState<unknown>(null);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const b = await adminGet<Block>(`/content/${key}`);
      setBlock(b); setDraft(b.value); setSaved(JSON.stringify(b.value));
    } catch (e) { setError(errMsg(e)); }
  }, [key]);
  useEffect(() => { void load(); }, [load]);

  const dirty = useMemo(() => draft !== null && JSON.stringify(draft) !== saved, [draft, saved]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  async function save() {
    setBusy(true); setSaveError('');
    try {
      const r = await adminSend<{ value: unknown }>('put', `/content/${key}`, { value: draft });
      setDraft(r.value); setSaved(JSON.stringify(r.value));
      toast('ok', 'Saved. The change is live.');
    } catch (e) { setSaveError(errMsg(e)); }
    finally { setBusy(false); }
  }
  async function reset() {
    setBusy(true);
    try {
      const r = await adminSend<{ value: unknown }>('post', `/content/${key}/reset`);
      setDraft(r.value); setSaved(JSON.stringify(r.value)); setConfirmReset(false); setSaveError('');
      toast('ok', 'Restored the default content.');
    } catch (e) { toast('error', errMsg(e)); }
    finally { setBusy(false); }
  }

  if (error) return <div className="space-y-4"><Link href="/admin/content" className="text-sm text-brand-600 inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" />Site content</Link><ErrorBox message={error} onRetry={load} /></div>;
  if (!block || draft === null) return <Spinner />;
  const Editor = EDITORS[key];
  if (!Editor) return <ErrorBox message="This content block has no editor." />;

  return (
    <div>
      <Link href="/admin/content" className="text-sm text-brand-600 inline-flex items-center gap-1 mb-3 hover:underline"><ArrowLeft className="w-4 h-4" />Site content</Link>
      <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-slate-50/95 backdrop-blur border-b border-slate-200 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-lg font-semibold text-slate-900">{block.label}</h1>
          <p className="text-xs text-slate-500">{dirty ? 'Unsaved changes' : 'All changes saved'}</p>
        </div>
        <Link href={PUBLIC_PATH[key] ?? '/'} target="_blank" className="text-xs text-slate-500 hover:text-brand-600 inline-flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" />View live page</Link>
        <Btn onClick={() => setConfirmReset(true)} disabled={busy}><RotateCcw className="w-4 h-4" />Reset to default</Btn>
        <Btn onClick={() => { setDraft(JSON.parse(saved)); setSaveError(''); }} disabled={!dirty || busy}>Discard changes</Btn>
        <Btn variant="primary" onClick={save} busy={busy} disabled={!dirty}><Save className="w-4 h-4" />Save changes</Btn>
      </div>

      {saveError && <div className="mb-4"><ErrorBox message={saveError} /></div>}
      <div className="space-y-4 max-w-4xl"><Editor value={draft} onChange={setDraft} /></div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset to default?"
        footer={<><Btn onClick={() => setConfirmReset(false)}>Cancel</Btn><Btn variant="danger" busy={busy} onClick={reset}>Reset</Btn></>}>
        <p className="text-sm text-slate-600">This replaces everything in “{block.label}” with the original content. Your edits to this block are lost.</p>
      </Modal>
    </div>
  );
}
