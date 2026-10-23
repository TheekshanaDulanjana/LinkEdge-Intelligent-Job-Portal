'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';

export default function NavigationHandler() {
  const pathname = usePathname();
  const isCompanyRoute = pathname.startsWith('/company');

  if (isCompanyRoute) return null; 

  return <Header />;
}