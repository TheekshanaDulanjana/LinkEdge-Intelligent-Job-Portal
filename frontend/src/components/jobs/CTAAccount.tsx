'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CTAAccount() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mt-6 bg-gradient-to-br from-sky-50 via-sky-100/60 to-blue-50 rounded-[24px] overflow-hidden border border-sky-100 shadow-xl"
    >
      
      {/* Image Section */}
      <div className="p-3">
        <div className="overflow-hidden rounded-[16px] shadow-sm">
          <img
            src="/CTAImage.png"
            alt="CTA Image"
            className="h-48 w-full object-cover transform hover:scale-105 transition-transform duration-500"
          />
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 text-center space-y-4">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
          Get Started Today
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
          To apply to jobs with one-click and connect with founders and recruiters searching for your skills.
        </p>

        <Link href="/register?role=seeker" className="block w-full pt-2">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button 
              variant="gradient"
              className="w-full text-white font-semibold h-12 rounded-full cursor-pointer shadow-md hover:shadow-lg transition-all"
            >
              Create Your Account
            </Button>
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}