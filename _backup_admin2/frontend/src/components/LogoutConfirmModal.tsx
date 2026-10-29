'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 font-sans"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onCancel} />
          <motion.div
            role="alertdialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-desc"
            initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }} transition={{ duration: 0.18 }}
            className="relative bg-white/95 backdrop-blur-2xl rounded-[16px] border border-sky-100 shadow-2xl w-full max-w-sm p-8 text-center space-y-4"
          >
            <div className="w-16 h-16 mx-auto rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-xs">
              <LogOut className="w-7 h-7" />
            </div>
            
            <div className="space-y-1">
              <h2 id="logout-title" className="text-xl font-extrabold text-slate-900 tracking-tight">Log out?</h2>
              <p id="logout-desc" className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                Are you sure you want to log out of your account?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                ref={cancelRef} 
                onClick={onCancel}
                variant="outline"
                className="flex-1 rounded-full h-11 border-sky-200 text-[#0025B8] hover:bg-sky-50 font-bold text-xs cursor-pointer shadow-xs"
              >
                Stay signed in
              </Button>
              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  onClick={onConfirm}
                  variant="gradient"
                  className="w-full rounded-full h-11 bg-rose-600 shadow-2xl hover:bg-rose-700 text-white font-bold text-xs  cursor-pointer border-0"
                >
                  Log out
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}