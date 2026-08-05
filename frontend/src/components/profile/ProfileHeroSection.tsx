import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin } from 'lucide-react';

interface HeroSectionProps {
  search: string;
  setSearch: (val: string) => void;
  location: string;
  setLocation: (val: string) => void;
  handleSearch: () => void;
}

export default function HeroSection({ search, setSearch, location, setLocation, handleSearch }: HeroSectionProps) {
  return (
    <div className=" bg-linear-to-br from-[#0025B8] to-[#0F9DE4] px-4 py-24 text-center text-white relative overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 mt-12">User Profile</h1>
        <p className="mb-6 text-white max-w-2xl mx-auto">
          View and update your personal details, keep your professional information up to date, and track all your job applications in one place.
        </p>
      </div>
    </div>
  );
}