'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { secureStorage } from '@/lib/secureStorage';

export default function NavigationHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const isCompanyRoute = pathname.startsWith('/company');

  // A signed-in company account never lands on the public home page:
  // its home is the company dashboard.
  useEffect(() => {
    if (pathname !== '/') return;
    try {
      const token = secureStorage.getAccessToken();
      const user = secureStorage.getUser<{ role?: string }>();
      if (token && user?.role === 'COMPANY') router.replace('/company/dashboard');
    } catch {
      /* storage unavailable: stay on the public page */
    }
  }, [pathname, router]);

  if (isCompanyRoute || pathname.startsWith('/admin')) return null;

  return <Header />;
}
