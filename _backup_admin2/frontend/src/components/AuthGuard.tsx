'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'SEEKER' | 'COMPANY' | 'ADMIN';
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isHydrated, user, loadFromStorage } = useAuthStore();

  useEffect(() => {
    // Restore the saved session once, when the page first opens
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    // Wait until the saved session has been read. Without this the guard sees
    // "not signed in" on the first render and sends a signed-in user to /login.
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.replace(requiredRole === 'ADMIN' ? '/admin/login' : '/login');
      return;
    }

    if (requiredRole && user?.role !== requiredRole) {
      // Wrong role: send to their correct dashboard
      router.replace(
        user?.role === 'ADMIN' ? '/admin' : user?.role === 'SEEKER' ? '/seeker/dashboard' : '/company/dashboard'
      );
    }
  }, [isHydrated, isAuthenticated, user, requiredRole, router]);

  if (!isHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
