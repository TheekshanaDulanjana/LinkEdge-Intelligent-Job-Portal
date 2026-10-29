import React from 'react';
import { BarChart3, ShieldCheck, Users } from 'lucide-react';

/** Shared frame for the admin sign-in, forgot-password and reset-password pages. */
export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-[#F5F8FC]">
      <aside className="hidden lg:flex flex-col justify-between p-12 text-white bg-gradient-to-br from-[#0025B8] via-[#0063CE] to-[#0084DA] relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 -left-16 w-80 h-80 rounded-full bg-sky-300/20 blur-3xl" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/linkedge.png" alt="SkillSync" className="relative w-40 h-auto object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <div className="relative space-y-6 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">Run the whole platform from one place.</h2>
          <ul className="space-y-4 text-sm text-white/90">
            <li className="flex gap-3"><Users className="w-5 h-5 shrink-0 mt-0.5" /><span>Manage job seekers, companies and job posts, with every action explained to the person it affects.</span></li>
            <li className="flex gap-3"><BarChart3 className="w-5 h-5 shrink-0 mt-0.5" /><span>Track growth, hiring, AI screening and platform health with live analytics.</span></li>
            <li className="flex gap-3"><ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" /><span>Every sign-in and change is recorded in a tamper-evident audit log.</span></li>
          </ul>
        </div>
        <p className="relative text-xs text-white/70">Authorised administrators only.</p>
      </aside>
      <main className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/linkedgeColored.png" alt="SkillSync" className="w-36 h-auto object-contain" />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#0063CE]">Admin console</p>
            <h1 className="text-xl font-semibold text-slate-900 mt-1">{title}</h1>
            {subtitle && <p className="text-xs text-slate-600 mt-1">{subtitle}</p>}
            <div className="mt-5">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
