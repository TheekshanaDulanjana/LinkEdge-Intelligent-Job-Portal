'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    platform: [
      { name: 'Discover Jobs', href: '/jobs' },
      { name: 'Platform Overview', href: '/overview' },
      { name: 'For Job Seekers', href: '/seeker' },
      { name: 'For Companies', href: '/companies' },
    ],
    account: [
      { name: 'Sign In', href: '/login' },
      { name: 'Job Seeker Register', href: '/register?role=seeker' },
      { name: 'Company Register', href: '/register?role=company' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy-policy' },
      { name: 'Terms of Use', href: '/terms-of-use' },
    ],
  };

  const socialLinks = [
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com',
      svg: (
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2z" />
      ),
    },
    {
      name: 'Facebook',
      href: 'https://facebook.com',
      svg: (
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      ),
    },
    {
      name: 'Instagram',
      href: 'https://instagram.com',
      svg: (
        <>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </>
      ),
    },
  ];

  return (
    <footer className="w-full bg-transparent font-sans">
      <div className="relative w-full overflow-hidden shadow-2xl pt-16 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#0025B8] to-[#0F9DE4]">
        
        {/* Content Container constrained to max-w-7xl */}
        <div className="relative z-10 max-w-7xl mx-auto space-y-12">
          
          {/* Top Section: Logo, Categories & Legal Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 pb-12 border-b border-white/20">
            
            {/* Logo & Brief Description */}
            <div className="sm:col-span-2 space-y-4">
              <Link href="/" className="inline-block group">
                <Image 
                  src="/linkedgeColored.png" 
                  alt="SkillSync Logo" 
                  width={160} 
                  height={40}
                  className="h-12 w-auto object-contain transition-transform group-hover:scale-105 filter brightness-0 invert" 
                />
              </Link>
              {/* Podi line underneath logo */}
              <div className="w-12 h-1 bg-gradient-to-r from-cyan-300 to-white rounded-full" />
              
              <p className="text-white/80 text-sm max-w-sm leading-relaxed pt-2">
                Empowering careers and streamlining recruitment through intelligent AI matching, automated rankings, and verified skill growth.
              </p>

              {/* Social Media Icons */}
              <div className="flex items-center gap-3 pt-2">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-[#0025B8] transition-colors shadow-sm"
                    aria-label={social.name}
                  >
                    <svg
                      className="w-4 h-4 fill-none stroke-current stroke-2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      {social.svg}
                    </svg>
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Links Category 1: Platform */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold tracking-widest text-cyan-200 uppercase">
                Platform
              </h4>
              <ul className="space-y-2.5">
                {footerLinks.platform.map((link) => (
                  <li key={link.href}>
                    <Link 
                      href={link.href}
                      className="text-white/80 text-sm hover:text-white transition-colors inline-flex items-center gap-1 group font-medium"
                    >
                      <span>{link.name}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all text-cyan-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Links Category 2: Account */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold tracking-widest text-cyan-200 uppercase">
                Account
              </h4>
              <ul className="space-y-2.5">
                {footerLinks.account.map((link) => (
                  <li key={link.href}>
                    <Link 
                      href={link.href}
                      className="text-white/80 text-sm hover:text-white transition-colors inline-flex items-center gap-1 group font-medium"
                    >
                      <span>{link.name}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all text-cyan-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Links Category 3: Legal */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold tracking-widest text-cyan-200 uppercase">
                Legal
              </h4>
              <ul className="space-y-2.5">
                {footerLinks.legal.map((link) => (
                  <li key={link.href}>
                    <Link 
                      href={link.href}
                      className="text-white/80 text-sm hover:text-white transition-colors inline-flex items-center gap-1 group font-medium"
                    >
                      <span>{link.name}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all text-cyan-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Bottom Section: Centered Copyright */}
          <div className="flex flex-col items-center justify-center text-center text-xs text-white/70 font-medium pt-2">
            <p>
              Copyright © {currentYear} SkillSync. All rights reserved.
            </p>
          </div>

        </div>

      </div>
    </footer>
  );
}