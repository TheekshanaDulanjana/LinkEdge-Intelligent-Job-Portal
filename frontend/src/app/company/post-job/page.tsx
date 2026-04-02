'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { jobApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

const schema = z.object({
  title: z.string().min(3, 'Title required'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  requirements: z.string().min(10, 'Requirements required'),
  location: z.string().min(2, 'Location required'),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE']),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  deadline: z.string().min(1, 'Deadline required'),
});

type FormData = z.infer<typeof schema>;

export default function PostJobPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setServerError('');
    try {
      await jobApi.post('/jobs', {
        ...data,
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

  // Get tomorrow's date as the minimum selectable deadline
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/company/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</Link>
          <h1 className="text-xl font-semibold">Post a new job</h1>
        </div>

        <div className="bg-white rounded-xl border p-8">
          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">{serverError}</div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label>Job title</Label>
              <Input placeholder="e.g. Senior Software Engineer" {...register('title')} />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location</Label>
                <Input placeholder="e.g. Colombo" {...register('location')} />
                {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location.message}</p>}
              </div>
              <div>
                <Label>Job type</Label>
                <select {...register('jobType')} className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERNSHIP">Internship</option>
                  <option value="REMOTE">Remote</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Min salary (LKR)</Label>
                <Input type="number" placeholder="e.g. 80000" {...register('salaryMin')} />
              </div>
              <div>
                <Label>Max salary (LKR)</Label>
                <Input type="number" placeholder="e.g. 150000" {...register('salaryMax')} />
              </div>
              <div>
                <Label>Application deadline</Label>
                <Input type="date" min={minDate} {...register('deadline')} />
                {errors.deadline && <p className="text-xs text-red-500 mt-1">{errors.deadline.message}</p>}
              </div>
            </div>

            <div>
              <Label>Job description</Label>
              <textarea
                rows={5}
                placeholder="Describe the role, responsibilities, and what the candidate will be doing..."
                {...register('description')}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
            </div>

            <div>
              <Label>Requirements</Label>
              <textarea
                rows={4}
                placeholder="List the required skills, qualifications, and experience..."
                {...register('requirements')}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.requirements && <p className="text-xs text-red-500 mt-1">{errors.requirements.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Publishing...' : 'Publish job'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}