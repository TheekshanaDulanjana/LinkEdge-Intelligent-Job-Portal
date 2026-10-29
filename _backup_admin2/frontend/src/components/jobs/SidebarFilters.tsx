'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export interface JobFilterValues {
  jobType: string;
  department: string;
  experienceLevel: string;
  locationType: string;
}

interface SidebarFiltersProps {
  filters: JobFilterValues;
  onChange: (filters: JobFilterValues) => void;
}

const SECTIONS: { key: keyof JobFilterValues; title: string; options: { label: string; value: string }[] }[] = [
  {
    key: 'jobType',
    title: 'Employment Type',
    options: [
      { label: 'Full Time',  value: 'FULL_TIME' },
      { label: 'Part Time',  value: 'PART_TIME' },
      { label: 'Contract',   value: 'CONTRACT' },
      { label: 'Internship', value: 'INTERNSHIP' },
      { label: 'Remote',     value: 'REMOTE' },
    ],
  },
  {
    key: 'department',
    title: 'Department',
    options: [
      { label: 'Engineering', value: 'Engineering' },
      { label: 'Design',      value: 'Design' },
      { label: 'Marketing',   value: 'Marketing' },
      { label: 'Sales',       value: 'Sales' },
    ],
  },
  {
    key: 'experienceLevel',
    title: 'Experience Level',
    options: [
      { label: 'Entry Level',  value: 'Entry Level' },
      { label: 'Mid Level',    value: 'Mid Level' },
      { label: 'Senior Level', value: 'Senior Level' },
    ],
  },
  {
    key: 'locationType',
    title: 'Work Environment',
    options: [
      { label: 'Remote',  value: 'REMOTE' },
      { label: 'On-site', value: 'ON_SITE' },
      { label: 'Hybrid',  value: 'HYBRID' },
    ],
  },
];

export default function SidebarFilters({ filters, onChange }: SidebarFiltersProps) {

  function toggleOption(key: keyof JobFilterValues, value: string) {
    // Clicking the already-selected option clears that filter (acts like a single-select toggle)
    const nextValue = filters[key] === value ? '' : value;
    onChange({ ...filters, [key]: nextValue });
  }

  function clearAll() {
    onChange({ jobType: '', department: '', experienceLevel: '', locationType: '' });
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-white/80 backdrop-blur-xl p-6 rounded-[24px] border border-sky-100 shadow-xl"
    >
      <h3 className="font-bold text-slate-900 mb-6 pb-3 border-b border-sky-100 tracking-tight text-base flex items-center justify-between">
        <span>Refine Your Search</span>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] font-semibold text-[#0025B8] hover:underline"
          >
            Clear all
          </button>
        ) : (
          <span className="w-2 h-2 rounded-full bg-[#0F9DE4] animate-pulse" />
        )}
      </h3>

      {SECTIONS.map((sec, idx) => (
        <motion.div
          key={sec.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: idx * 0.1 }}
          className="mb-6 last:mb-0"
        >
          <p className="text-xs font-bold text-[#0025B8] mb-3 uppercase tracking-wider">
            {sec.title}
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {sec.options.map((opt) => {
              const checked = filters[sec.key] === opt.value;
              return (
                <motion.div
                  key={opt.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-sky-50/60 transition-colors cursor-pointer"
                  onClick={() => toggleOption(sec.key, opt.value)}
                >
                  <Checkbox
                    id={`${sec.key}-${opt.value}`}
                    checked={checked}
                    onChange={() => toggleOption(sec.key, opt.value)}
                    className="border-slate-300 rounded-md data-[state=checked]:bg-[#0025B8] data-[state=checked]:border-[#0025B8]"
                  />
                  <Label
                    htmlFor={`${sec.key}-${opt.value}`}
                    className="text-xs text-slate-700 font-medium cursor-pointer leading-none"
                  >
                    {opt.label}
                  </Label>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}