'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import api, { jobApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthGuard from '@/components/AuthGuard';
import { 
  Trash2, 
  Plus, 
  Bold, 
  Italic, 
  Link as LinkIcon, 
  List, 
  Eye, 
  Send,
  Sparkles,
  Briefcase
} from 'lucide-react';

const schema = z.object({
  title: z.string().min(3, 'Job title is required'),
  department: z.string().min(1, 'Department is required'),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE']),
  experienceLevel: z.string().min(1, 'Experience level is required'),
  locationType: z.enum(['REMOTE', 'ON_SITE', 'HYBRID']),
  location: z.string().min(2, 'Office location is required'),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  deadline: z.string().min(1, 'Deadline required'),
});

type FormData = z.infer<typeof schema>;

function PostJobPageContent() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [companyName, setCompanyName] = useState<string>('Company');
  const [companyLogo, setCompanyLogo] = useState<string>('');

  const [responsibilities, setResponsibilities] = useState<string[]>(['']);
  const [requirementsList, setRequirementsList] = useState<string[]>(['']);
  const [skills, setSkills] = useState<string[]>(['React', 'TypeScript', 'Node.js', 'Next.js']);
  const [skillInput, setSkillInput] = useState('');

  // Footer eka hide kirima me page ekedi
  useEffect(() => {
    const footerElement = document.querySelector('footer');
    if (footerElement) {
      footerElement.style.display = 'none';
    }
    return () => {
      if (footerElement) {
        footerElement.style.display = '';
      }
    };
  }, []);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      department: 'Engineering',
      jobType: 'REMOTE',
      experienceLevel: 'Entry Level',
      locationType: 'REMOTE',
      location: 'Colombo, Sri Lanka',
      description: '',
    }
  });

  useEffect(() => {
    async function loadCompanyProfile() {
      try {
        const res = await api.get('/auth/me');
        const p = res.data?.data?.profile || res.data?.company || res.data?.profile;
        if (p?.companyName) setCompanyName(p.companyName);
        if (p?.logoUrl) setCompanyLogo(p.logoUrl);
      } catch (err) {
        console.error('Failed to load company info', err);
      }
    }
    loadCompanyProfile();
  }, []);

  const watchTitle = watch('title', 'Senior Full-Stack Engineer');
  const watchJobType = watch('jobType', 'REMOTE');
  const watchLocationType = watch('locationType', 'REMOTE');
  const watchDescription = watch('description', '');

  const applyFormat = (syntaxPrefix: string, syntaxSuffix: string = syntaxPrefix) => {
    const textarea = document.getElementById('job-description-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const replacement = `${syntaxPrefix}${selectedText || 'text'}${syntaxSuffix}`;
    
    const newText = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    setValue('description', newText);
  };

  // ── Responsibilities list handlers ──────────────────────────────
  const handleAddResponsibility = () => {
    setResponsibilities([...responsibilities, '']);
  };

  const handleRemoveResponsibility = (index: number) => {
    setResponsibilities(responsibilities.filter((_, i) => i !== index));
  };

  const handleResponsibilityChange = (index: number, value: string) => {
    const updated = [...responsibilities];
    updated[index] = value;
    setResponsibilities(updated);
  };

  // ── Requirements list handlers (mirrors Responsibilities) ───────
  const handleAddRequirement = () => {
    setRequirementsList([...requirementsList, '']);
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirementsList(requirementsList.filter((_, i) => i !== index));
  };

  const handleRequirementChange = (index: number, value: string) => {
    const updated = [...requirementsList];
    updated[index] = value;
    setRequirementsList(updated);
  };

  // ── Required Skills (chip tags) handlers ────────────────────────
  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!skills.includes(skillInput.trim())) {
        setSkills([...skills, skillInput.trim()]);
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  async function submitJob(data: FormData, status: 'ACTIVE' | 'DRAFT') {
    setLoading(true);
    setServerError('');

    const cleanResponsibilities = responsibilities.filter((r) => r.trim() !== '');
    const cleanRequirements = requirementsList.filter((r) => r.trim() !== '');

    try {
      await jobApi.post('/jobs', {
        ...data,
        status,
        responsibilities: cleanResponsibilities,
        requirementsList: cleanRequirements,
        requirements: cleanRequirements.join('. '), // legacy flat string, backend also derives this itself
        skills: skills,
        salaryMin: data.salaryMin ? parseInt(data.salaryMin) : undefined,
        salaryMax: data.salaryMax ? parseInt(data.salaryMax) : undefined,
      });
      router.push('/company/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setServerError(error.response?.data?.message || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = (data: FormData) => submitJob(data, 'ACTIVE');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-8 text-slate-800 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/90 backdrop-blur-xl p-6 sm:p-8 rounded-[28px] border border-sky-100 shadow-xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Post a New Position</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Fill in the details to reach top-tier talent in our exclusive network.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleSubmit((d) => submitJob(d, 'DRAFT'))}
              className="rounded-full h-11 px-5 border-sky-200 text-[#0025B8] hover:bg-sky-50 font-bold text-xs cursor-pointer shadow-xs"
            >
              Save Draft
            </Button>
            <Button type="button" variant="outline" className="rounded-full h-11 px-5 border-sky-200 text-[#0025B8] bg-sky-50/50 hover:bg-sky-100 gap-2 font-bold text-xs cursor-pointer shadow-xs">
              <Eye className="w-4 h-4 text-[#0F9DE4]" /> Preview
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={handleSubmit(onSubmit)} 
                disabled={loading}
                variant="gradient"
                className="rounded-full h-11 px-6 text-white gap-2 font-bold text-xs shadow-md cursor-pointer"
              >
                <Send className="w-4 h-4" /> Post New Job
              </Button>
            </motion.div>
          </div>
        </div>

        {serverError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm font-semibold text-rose-800 shadow-sm">
            {serverError}
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sidebar Navigation Links */}
          <div className="lg:col-span-3 hidden lg:block sticky top-28">
            <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 shadow-xl space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Sections</p>
              <nav className="space-y-1.5">
                <a href="#basic-info" className="flex items-center px-4 py-2.5 text-xs font-bold border-l-4 border-[#0025B8] text-[#0025B8] bg-sky-50 rounded-r-2xl">Basic Info</a>
                <a href="#location-salary" className="flex items-center px-4 py-2.5 text-xs font-bold border-l-4 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-r-2xl transition-all">Location & Salary</a>
                <a href="#job-description" className="flex items-center px-4 py-2.5 text-xs font-bold border-l-4 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-r-2xl transition-all">Job Description</a>
                <a href="#requirements" className="flex items-center px-4 py-2.5 text-xs font-bold border-l-4 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-r-2xl transition-all">Requirements & Skills</a>
              </nav>
            </div>
          </div>

          {/* Center Form Section */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Basic Info */}
            <div id="basic-info" className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 sm:p-8 shadow-xl space-y-5">
              <h2 className="text-base font-bold text-slate-900 border-b border-sky-100 pb-3">Basic Info</h2>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Job Title</Label>
                <Input placeholder="Enter the job title" className="h-12 text-xs font-medium rounded-2xl border-sky-100 bg-slate-50/50" {...register('title')} />
                {errors.title && <p className="text-xs text-rose-600 font-semibold mt-1">{errors.title.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Department</Label>
                  <select {...register('department')} className="w-full h-12 border border-sky-100 rounded-2xl px-4 text-xs font-medium bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#0F9DE4]/20 cursor-pointer text-slate-800 shadow-xs">
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Employment Type</Label>
                  <select {...register('jobType')} className="w-full h-12 border border-sky-100 rounded-2xl px-4 text-xs font-medium bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#0F9DE4]/20 cursor-pointer text-slate-800 shadow-xs">
                    <option value="REMOTE">Remote</option>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Experience Level</Label>
                  <select {...register('experienceLevel')} className="w-full h-12 border border-sky-100 rounded-2xl px-4 text-xs font-medium bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#0F9DE4]/20 cursor-pointer text-slate-800 shadow-xs">
                    <option value="Entry Level">Entry Level</option>
                    <option value="Mid Level">Mid Level</option>
                    <option value="Senior Level">Senior Level</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Application Deadline</Label>
                  <Input type="date" min={minDate} className="h-12 text-xs font-medium rounded-2xl border-sky-100 bg-slate-50/50" {...register('deadline')} />
                </div>
              </div>
            </div>

            {/* Location & Salary */}
            <div id="location-salary" className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 sm:p-8 shadow-xl space-y-5">
              <h2 className="text-base font-bold text-slate-900 border-b border-sky-100 pb-3">Location & Salary</h2>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Location Type</Label>
                <div className="flex items-center gap-6 mt-2">
                  {['Remote', 'On-Site', 'Hybrid'].map((type) => {
                    const value = type.toUpperCase().replace('-', '_');
                    return (
                      <label key={type} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          value={value}
                          {...register('locationType')}
                          className="text-[#0025B8] focus:ring-[#0F9DE4]"
                        />
                        {type}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Office Location</Label>
                <Input placeholder="Colombo, Sri Lanka" className="h-12 text-xs font-medium rounded-2xl border-sky-100 bg-slate-50/50" {...register('location')} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Min. Salary ( Monthly )</Label>
                  <Input placeholder="LKR 0.00" className="h-12 text-xs font-medium rounded-2xl border-sky-100 bg-slate-50/50" {...register('salaryMin')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Max. Salary ( Monthly )</Label>
                  <Input placeholder="LKR 0.00" className="h-12 text-xs font-medium rounded-2xl border-sky-100 bg-slate-50/50" {...register('salaryMax')} />
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div id="job-description" className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 sm:p-8 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-slate-900 border-b border-sky-100 pb-3">Job Description</h2>

              <div className="border border-sky-100 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-sky-50/70 px-4 py-2.5 border-b border-sky-100 flex items-center gap-3 text-slate-600">
                  <button type="button" onClick={() => applyFormat('**', '**')} className="p-1.5 hover:bg-sky-100 rounded-xl transition-colors cursor-pointer"><Bold className="w-4 h-4 text-[#0025B8]" /></button>
                  <button type="button" onClick={() => applyFormat('*', '*')} className="p-1.5 hover:bg-sky-100 rounded-xl transition-colors cursor-pointer"><Italic className="w-4 h-4 text-[#0025B8]" /></button>
                  <button type="button" onClick={() => applyFormat('[', '](https://)')} className="p-1.5 hover:bg-sky-100 rounded-xl transition-colors cursor-pointer"><LinkIcon className="w-4 h-4 text-[#0025B8]" /></button>
                  <button type="button" onClick={() => applyFormat('\n- ')} className="p-1.5 hover:bg-sky-100 rounded-xl transition-colors cursor-pointer"><List className="w-4 h-4 text-[#0025B8]" /></button>
                </div>
                <textarea
                  id="job-description-textarea"
                  rows={6}
                  placeholder="Describe the role, impact, and who you're looking for..."
                  {...register('description')}
                  className="w-full p-4 text-xs sm:text-sm focus:outline-none resize-none bg-slate-50/30 text-slate-800 font-medium"
                />
              </div>
              {errors.description && <p className="text-xs text-rose-600 font-semibold">{errors.description.message}</p>}
            </div>

            {/* Requirements & Skills — now 3 clearly separated subsections */}
            <div id="requirements" className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 sm:p-8 shadow-xl space-y-8">
              <h2 className="text-base font-bold text-slate-900 border-b border-sky-100 pb-3">Requirements & Skills</h2>

              {/* 01. Responsibilities */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#0025B8] text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">01</span>
                  <Label className="text-xs font-bold text-slate-700">Responsibilities</Label>
                </div>
                <p className="text-[11px] text-slate-400 font-medium pl-8">Add one responsibility per line (e.g. &ldquo;Design intuitive UI/UX for websites and mobile applications.&rdquo;)</p>
                <div className="space-y-3 mt-2 pl-8">
                  {responsibilities.map((resp, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0F9DE4] shrink-0"></span>
                      <Input
                        value={resp}
                        onChange={(e) => handleResponsibilityChange(idx, e.target.value)}
                        placeholder="Add a key responsibility..."
                        className="h-11 text-xs font-medium rounded-2xl border-sky-100 bg-slate-50/50 flex-1"
                      />
                      {responsibilities.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveResponsibility(idx)}
                          className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddResponsibility}
                  className="mt-2 text-xs font-bold text-[#0025B8] hover:text-[#0F9DE4] hover:underline flex items-center gap-1.5 cursor-pointer pl-8"
                >
                  <Plus className="w-4 h-4" /> Add Another Responsibility
                </button>
              </div>

              {/* 02. Requirements */}
              <div className="space-y-2 pt-6 border-t border-sky-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#0025B8] text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">02</span>
                  <Label className="text-xs font-bold text-slate-700">Requirements</Label>
                </div>
                <p className="text-[11px] text-slate-400 font-medium pl-8">Add one requirement per line (e.g. &ldquo;3+ years of UI/UX design experience.&rdquo;)</p>
                <div className="space-y-3 mt-2 pl-8">
                  {requirementsList.map((req, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0F9DE4] shrink-0"></span>
                      <Input
                        value={req}
                        onChange={(e) => handleRequirementChange(idx, e.target.value)}
                        placeholder="Add a requirement..."
                        className="h-11 text-xs font-medium rounded-2xl border-sky-100 bg-slate-50/50 flex-1"
                      />
                      {requirementsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRequirement(idx)}
                          className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddRequirement}
                  className="mt-2 text-xs font-bold text-[#0025B8] hover:text-[#0F9DE4] hover:underline flex items-center gap-1.5 cursor-pointer pl-8"
                >
                  <Plus className="w-4 h-4" /> Add Another Requirement
                </button>
              </div>

              {/* 03. Required Skills */}
              <div className="space-y-2 pt-6 border-t border-sky-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#0025B8] text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">03</span>
                  <Label className="text-xs font-bold text-slate-700">Required Skills</Label>
                </div>
                <p className="text-[11px] text-slate-400 font-medium pl-8">Type a tool/technology and press Enter (e.g. React, Node, Python, Figma, PHP)</p>
                <div className="border border-sky-100 rounded-2xl p-3 mt-2 flex flex-wrap gap-2 items-center bg-slate-50/50 min-h-[52px] shadow-xs pl-8">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] text-white text-xs px-3 py-1.5 rounded-xl flex items-center gap-2 font-bold shadow-xs"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-cyan-200 text-xs font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    placeholder="Type and press enter..."
                    className="border-none outline-none text-xs font-medium flex-1 min-w-[150px] p-2 bg-transparent text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-slate-400 font-medium">Draft autosaved securely.</span>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" className="rounded-full h-11 px-6 border-sky-200 text-[#0025B8] hover:bg-sky-50 font-bold text-xs cursor-pointer shadow-xs">
                  Cancel
                </Button>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={handleSubmit(onSubmit)} disabled={loading} variant="gradient" className="rounded-full h-11 px-7 text-white font-bold text-xs shadow-md cursor-pointer">
                    Post This Job
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Right Preview Sidebar (3 Columns) */}
          <div className="lg:col-span-3 space-y-6 sticky top-28">
            <div className="bg-sky-50/80 border border-sky-200 rounded-[28px] p-5 shadow-sm space-y-2">
              <h3 className="text-xs font-extrabold text-[#0025B8] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#0F9DE4]" /> Recruiter Pro-Tip
              </h3>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                &ldquo;Job posts with explicit salary ranges and hybrid policies receive 3x more high-quality applications.&rdquo;
              </p>
            </div>

            <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 shadow-xl space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Post Preview</p>
              
              <div className="border border-sky-100 rounded-2xl p-4 shadow-sm bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2.5">
                  {companyLogo ? (
                    <img src={companyLogo} alt={companyName} className="w-8 h-8 rounded-xl object-cover shadow-xs border border-sky-100" />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0025B8] to-[#0F9DE4] flex items-center justify-center text-white text-xs font-black shadow-xs">
                      {companyName?.[0]?.toUpperCase() || 'C'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 truncate max-w-[130px]">{companyName || 'Company Name'}</h4>
                    <p className="text-[10px] font-bold text-[#0F9DE4] uppercase">HIRING NOW</p>
                  </div>
                </div>

                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">{watchTitle || 'Senior Full-Stack Engineer'}</h3>

                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold bg-[#0025B8] text-white px-2.5 py-1 rounded-full shadow-xs">{watchJobType}</span>
                  <span className="text-[10px] font-bold bg-sky-100 text-[#0025B8] px-2.5 py-1 rounded-full shadow-xs">{watchLocationType}</span>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full shadow-xs">Closing soon</span>
                </div>

                {watchDescription && (
                  <p className="text-xs text-slate-600 font-medium line-clamp-3 pt-2 border-t border-sky-100 whitespace-pre-wrap leading-relaxed">
                    {watchDescription}
                  </p>
                )}

                <Button className="w-full text-xs font-bold rounded-full h-9 bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] text-white hover:opacity-90 transition-all shadow-md mt-2 cursor-pointer">
                  APPLY NOW
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function PostJobPage() {
  return (
    <AuthGuard requiredRole="COMPANY">
      <PostJobPageContent />
    </AuthGuard>
  );
}