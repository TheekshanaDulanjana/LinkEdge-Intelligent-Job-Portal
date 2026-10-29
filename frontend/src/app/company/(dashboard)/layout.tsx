'use client';

import { assetUrl } from '@/lib/assetUrl';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/enterprise/Sidebar';
import TopHeader from '@/components/enterprise/TopHeader';
import api from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';

export default function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<{ companyName: string; logoUrl?: string } | null>(null);

  useEffect(() => {
    api.get('/auth/me').then(res => {
      const profile = res.data?.data?.profile;
      if (profile) setCompany({ ...profile, logoUrl: assetUrl(profile.logoUrl) });
    }).catch(() => {});
  }, []);

  return (
    <AuthGuard requiredRole="COMPANY">
    <div className="flex min-h-screen bg-[#F5F8FC]">
      <Sidebar companyName={company?.companyName ?? 'Company'} logoUrl={company?.logoUrl} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader userName={company?.companyName ?? 'Loading…'} userAvatar={company?.logoUrl} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1680px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
    </AuthGuard>
  );
}
