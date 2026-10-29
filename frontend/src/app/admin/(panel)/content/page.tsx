'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Pencil } from 'lucide-react';
import { adminGet, errMsg, timeAgo } from '@/lib/admin';
import { Card, ErrorBox, PageHeader, Pill, Spinner } from '@/components/admin/ui';
import { PUBLIC_PATH } from '@/components/admin/editors';

interface Block { key: string; label: string; description: string; isDefault: boolean; updatedAt: string | null; updatedBy: string | null }

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Landing page', keys: ['hero', 'whySeekers', 'whyRecruiters', 'careerPaths', 'testimonials', 'faq'] },
  { title: 'Other pages', keys: ['pageOverview', 'pageSeeker', 'pageCompanies'] },
];

export default function ContentListPage() {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try { setBlocks(await adminGet<Block[]>('/content')); } catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!blocks) return <Spinner />;

  return (
    <div>
      <PageHeader title="Site content" description="Edit the text, lists and images shown on the public pages. Changes go live as soon as you save. “Reset to default” restores the original wording." />
      <div className="space-y-6">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h2 className="text-sm font-semibold text-slate-700 mb-2">{g.title}</h2>
            <Card className="divide-y divide-slate-100">
              {g.keys.map((k) => blocks.find((b) => b.key === k)).filter((b): b is Block => !!b).map((b) => (
                <div key={b.key} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-sm font-medium text-slate-900">{b.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{b.description}</p>
                  </div>
                  {b.isDefault ? <Pill>Default</Pill> : <Pill tone="blue">Edited {timeAgo(b.updatedAt)}</Pill>}
                  <Link href={PUBLIC_PATH[b.key] ?? '/'} target="_blank" className="text-xs text-slate-500 hover:text-brand-600 inline-flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" />Preview</Link>
                  <Link href={`/admin/content/${b.key}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="w-3.5 h-3.5" />Edit</Link>
                </div>
              ))}
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
