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
    <div className=" bg-linear-to-br from-[#0025B8] to-[#0F9DE4] px-4 py-16 text-center text-white relative overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 mt-12">Explore Opportunities:</h1>
        <p className="mb-6 text-white max-w-2xl mx-auto">
          Browse through 150+ <br />active vacancies and find the role that perfectly aligns with your career path.
        </p>
        
        <div className="bg-white p-1 rounded-full shadow-2xl flex flex-wrap md:flex-nowrap items-center gap-2 max-w-2xl mx-auto">
          <div className="flex items-center flex-1 px-4 border-r border-gray-100">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <Input
              placeholder="Job Title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-none text-gray-900 focus-visible:ring-0 placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center flex-1 px-4">
            <MapPin className="w-5 h-5 text-gray-400 mr-2" />
            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border-none text-gray-900 focus-visible:ring-0 placeholder:text-gray-400"
            />
          </div>
          <Button onClick={handleSearch} className=" text-white px-10 rounded-full h-10">
            Search
          </Button>
        </div>
      </div>
    </div>
  );
}