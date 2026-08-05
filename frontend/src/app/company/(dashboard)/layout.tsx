'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/enterprise/Sidebar';
import TopHeader from '@/components/enterprise/TopHeader';
import api from '@/lib/api';

export default function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<{ companyName: string; logoUrl?: string } | null>(null);

  useEffect(() => {
    api.get('/auth/me').then(res => {
      const profile = res.data?.data?.profile;
      if (profile) setCompany(profile);
    }).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar companyName={company?.companyName ?? 'Company'} logoUrl={company?.logoUrl} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader userName={company?.companyName ?? 'Loading...'} />
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}