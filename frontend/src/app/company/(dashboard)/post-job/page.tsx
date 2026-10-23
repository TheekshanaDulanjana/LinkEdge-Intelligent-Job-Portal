'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  Send 
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
  const [skills, setSkills] = useState<string[]>(['React', 'TypeScript', 'Node.js', 'Next.js']);
  const [skillInput, setSkillInput] = useState('');

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

    try {
      await jobApi.post('/jobs', {
        ...data,
        status,
        responsibilities: cleanResponsibilities,
        skills: skills,
        requirements: skills.join(', '),
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
    <div className="min-h-screen bg-[#f8fafc] p-8 text-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Post a New Position</h1>
            <p className="text-sm text-slate-500">Fill in the details to reach top-tier talent in our exclusive network.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleSubmit((d) => submitJob(d, 'DRAFT'))}
              className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
            >
              Save Draft
            </Button>
            <Button type="button" variant="outline" className="border-blue-500 text-blue-600 bg-blue-50 hover:bg-blue-100 gap-2">
              <Eye className="w-4 h-4" /> Preview
            </Button>
            <Button 
              onClick={handleSubmit(onSubmit)} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Send className="w-4 h-4" /> Post New Job
            </Button>
          </div>
        </div>

        {serverError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-8">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">SECTIONS</p>
              <nav className="space-y-1">
                <a href="#basic-info" className="block px-3 py-2 text-sm font-medium border-l-2 border-blue-600 text-blue-600 bg-blue-50/50 rounded-r-md">Basic Info</a>
                <a href="#location-salary" className="block px-3 py-2 text-sm font-medium border-l-2 border-transparent text-slate-600 hover:text-slate-900">Location & Salary</a>
                <a href="#job-description" className="block px-3 py-2 text-sm font-medium border-l-2 border-transparent text-slate-600 hover:text-slate-900">Job Description</a>
                <a href="#requirements" className="block px-3 py-2 text-sm font-medium border-l-2 border-transparent text-slate-600 hover:text-slate-900">Requirements</a>
              </nav>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div id="basic-info" className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <h2 className="text-base font-semibold border-b border-slate-100 pb-3">Basic Info</h2>
              
              <div>
                <Label className="text-xs font-semibold text-slate-600">Job Title</Label>
                <Input placeholder="Enter the job title" className="mt-1" {...register('title')} />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Department</Label>
                  <select {...register('department')} className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-600">Employment Type</Label>
                  <select {...register('jobType')} className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="REMOTE">Remote</option>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Experience Level</Label>
                  <select {...register('experienceLevel')} className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="Entry Level">Entry Level</option>
                    <option value="Mid Level">Mid Level</option>
                    <option value="Senior Level">Senior Level</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-600">Application Deadline</Label>
                  <Input type="date" min={minDate} className="mt-1" {...register('deadline')} />
                </div>
              </div>
            </div>

            <div id="location-salary" className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <h2 className="text-base font-semibold border-b border-slate-100 pb-3">Location & Salary</h2>

              <div>
                <Label className="text-xs font-semibold text-slate-600">Location Type</Label>
                <div className="flex items-center gap-6 mt-2">
                  {['Remote', 'On-Site', 'Hybrid'].map((type) => {
                    const value = type.toUpperCase().replace('-', '_');
                    return (
                      <label key={type} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          value={value}
                          {...register('locationType')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        {type}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600">Office Location</Label>
                <Input placeholder="Colombo, Sri Lanka" className="mt-1" {...register('location')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Min. Salary ( Monthly )</Label>
                  <Input placeholder="LKR 0.00" className="mt-1" {...register('salaryMin')} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Max. Salary ( Monthly )</Label>
                  <Input placeholder="LKR 0.00" className="mt-1" {...register('salaryMax')} />
                </div>
              </div>
            </div>

            <div id="job-description" className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-base font-semibold border-b border-slate-100 pb-3">Job Description</h2>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center gap-3 text-slate-600">
                  <button type="button" onClick={() => applyFormat('**', '**')} className="p-1 hover:bg-slate-200 rounded"><Bold className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => applyFormat('*', '*')} className="p-1 hover:bg-slate-200 rounded"><Italic className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => applyFormat('[', '](https://)')} className="p-1 hover:bg-slate-200 rounded"><LinkIcon className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => applyFormat('\n- ')} className="p-1 hover:bg-slate-200 rounded"><List className="w-3.5 h-3.5" /></button>
                </div>
                <textarea
                  id="job-description-textarea"
                  rows={6}
                  placeholder="Describe the role, impact, and who you're looking for..."
                  {...register('description')}
                  className="w-full p-3 text-sm focus:outline-none resize-none"
                />
              </div>
              {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
            </div>

            <div id="requirements" className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <h2 className="text-base font-semibold border-b border-slate-100 pb-3">Requirements & Skills</h2>

              <div>
                <Label className="text-xs font-semibold text-slate-600">Key Responsibilities</Label>
                <div className="space-y-2 mt-2">
                  {responsibilities.map((resp, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      <Input
                        value={resp}
                        onChange={(e) => handleResponsibilityChange(idx, e.target.value)}
                        placeholder="Add a Key responsibility..."
                        className="text-sm"
                      />
                      {responsibilities.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveResponsibility(idx)}
                          className="text-slate-400 hover:text-red-500"
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
                  className="mt-3 text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another
                </button>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600">Required Skills</Label>
                <div className="border border-slate-200 rounded-lg p-2 mt-2 flex flex-wrap gap-2 items-center bg-white min-h-[48px]">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-red-200 text-xs"
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
                    className="border-none outline-none text-xs flex-1 min-w-[150px] p-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-slate-400">Draft autosaved.</span>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" className="border-slate-300">
                  Cancel
                </Button>
                <Button onClick={handleSubmit(onSubmit)} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Post This Job
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide">Recruiter Pro-Tip</h3>
              <p className="text-xs text-blue-900 mt-2 leading-relaxed">
                "Job posts with explicit salary ranges and hybrid policies receive 3x more high-quality applications."
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">POST PREVIEW</p>
              
              <div className="border border-slate-200 rounded-lg p-4 shadow-sm bg-white space-y-3">
                <div className="flex items-center gap-2">
                  {companyLogo ? (
                    <img src={companyLogo} alt={companyName} className="w-7 h-7 rounded object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold">
                      {companyName?.[0]?.toUpperCase() || 'C'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{companyName || 'Company Name'}</h4>
                    <p className="text-[10px] text-slate-400">HIRING NOW</p>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{watchTitle || 'Senior Full-Stack Engineer'}</h3>

                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded">{watchJobType}</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{watchLocationType}</span>
                  <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Closing soon</span>
                </div>

                {watchDescription && (
                  <p className="text-xs text-slate-500 line-clamp-3 pt-1 border-t border-slate-100 whitespace-pre-wrap">
                    {watchDescription}
                  </p>
                )}

                <Button className="w-full text-xs bg-blue-600 text-white hover:bg-blue-700 h-8 mt-2">
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