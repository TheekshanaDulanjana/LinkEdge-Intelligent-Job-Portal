import React from 'react';
import PageHero from '@/components/landing/PageHero';

export interface LegalSection { heading: string; paragraphs?: string[]; list?: string[] }

/** Plain, readable layout for the Privacy Policy and Terms of Use. */
export default function LegalPage({
  tag, title, intro, updated, sections,
}: { tag: string; title: string; intro: string; updated: string; sections: LegalSection[] }) {
  return (
    <div className="bg-white text-slate-800">
      <PageHero tag={tag} title={title} description={intro} />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-14 sm:py-20">
        <p className="text-sm text-slate-500">Last updated: {updated}</p>

        <nav aria-label="Contents" className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">On this page</p>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 text-sm">
            {sections.map((s, i) => (
              <li key={i}><a href={`#s${i + 1}`} className="text-[#0063ce] hover:underline">{i + 1}. {s.heading}</a></li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((s, i) => (
            <section key={i} id={`s${i + 1}`} className="scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">{i + 1}. {s.heading}</h2>
              {s.paragraphs?.map((p, j) => (
                <p key={j} className="mt-3 text-[1rem] leading-[1.75] text-slate-600">{p}</p>
              ))}
              {s.list && (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-[1rem] leading-[1.7] text-slate-600 marker:text-slate-400">
                  {s.list.map((li, j) => <li key={j}>{li}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
