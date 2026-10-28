'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut } from 'lucide-react';

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Shared "Are you sure you want to log out?" dialog used by every logout trigger. */
export default function LogoutConfirmModal({ open, onConfirm, onCancel }: Props) {
  const [mounted, setMounted] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
          <motion.div
            role="alertdialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-desc"
            initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }} transition={{ duration: 0.18 }}
            className="relative bg-white rounded-[28px] border border-sky-100 shadow-2xl w-full max-w-sm p-7 text-center"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <LogOut className="w-6 h-6" />
            </div>
            <h2 id="logout-title" className="text-lg font-bold text-slate-900 tracking-tight">Log out?</h2>
            <p id="logout-desc" className="text-sm text-slate-500 font-medium mt-1.5 mb-6">
              Are you sure you want to log out of your account?
            </p>
            <div className="flex gap-3">
              <button
                ref={cancelRef} onClick={onCancel}
                className="flex-1 h-11 rounded-full border border-sky-200 text-[#0025B8] hover:bg-sky-50 font-semibold text-sm transition-colors cursor-pointer"
              >
                Stay signed in
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 h-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
              >
                Log out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
