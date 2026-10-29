'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Quote, Sparkles } from 'lucide-react';
import type { TestimonialsContent, Testimonial } from '@/lib/siteContent';

/** Repeat the list until it is long enough to fill a row twice over (the loop needs two identical halves). */
function fill(items: Testimonial[], min = 6): Testimonial[] {
  if (items.length === 0) return [];
  const out: Testimonial[] = [];
  while (out.length < min) out.push(...items);
  return out;
}

function Card({ item }: { item: Testimonial }) {
  return (
    <figure className="w-[300px] sm:w-[360px] h-[250px] shrink-0 rounded-2xl bg-white border border-sky-100 shadow-md p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-sky-50 text-[#0F9DE4] border border-sky-100 truncate">
          {item.category}
        </span>
        <Quote className="w-5 h-5 text-[#0F9DE4]/60 rotate-180 shrink-0" aria-hidden />
      </div>
      <blockquote className="text-slate-700 text-sm leading-relaxed line-clamp-4">&ldquo;{item.feedback}&rdquo;</blockquote>
      <figcaption className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-3">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-100" />
        ) : (
          <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {item.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-slate-900 font-semibold text-sm truncate">{item.name}</span>
          <span className="block text-slate-500 text-xs truncate">{item.designation}</span>
        </span>
      </figcaption>
    </figure>
  );
}

function Row({ items, direction, className = '' }: { items: Testimonial[]; direction: 'left' | 'right'; className?: string }) {
  // Speed stays the same no matter how many cards there are (about 6 seconds per card).
  const seconds = Math.max(30, items.length * 6);
  return (
    <div className={`testimonial-row ${className}`}>
      <div
        className={`testimonial-track ${direction === 'left' ? 'testimonial-left' : 'testimonial-right'}`}
        style={{ animationDuration: `${seconds}s` }}
      >
        {[...items, ...items].map((item, i) => (
          <div key={i} aria-hidden={i >= items.length ? true : undefined}>
            <Card item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TestimonialsSection({ content }: { content: TestimonialsContent }) {
  const all = content.items;
  // Two rows with different cards when there are enough, otherwise the same cards in opposite order.
  const rowA = fill(all.length >= 8 ? all.filter((_, i) => i % 2 === 0) : all);
  const rowB = fill(all.length >= 8 ? all.filter((_, i) => i % 2 === 1) : [...all].reverse());

  return (
    <section className="relative w-full py-20 lg:py-24 font-sans overflow-hidden bg-gradient-to-b from-white via-sky-50/40 to-white">
      <div className="absolute top-1/3 left-10 w-72 h-72 bg-sky-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-200/40 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center">
        {/* Left: heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-4 xl:col-span-3 space-y-4 text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest text-[#0F9DE4] uppercase bg-sky-50 px-3 py-1.5 rounded-full border border-sky-100 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{content.tag}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
            {content.titleLine1} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0025B8] to-[#0F9DE4]">{content.titleLine2}</span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{content.description}</p>
        </motion.div>

        {/* Right: two rows moving in opposite directions */}
        <div className="lg:col-span-8 xl:col-span-9 relative min-w-0">
          <div className="space-y-5 py-3">
            <Row items={rowA} direction="left" />
            <Row items={rowB} direction="right" />
          </div>
          {/* White-to-transparent edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-white via-white/80 to-transparent z-10" />
        </div>
      </div>
    </section>
  );
}
