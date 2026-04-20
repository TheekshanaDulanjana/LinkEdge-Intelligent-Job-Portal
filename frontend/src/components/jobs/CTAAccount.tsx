import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CTAAccount() {
  return (
    <div className="mt-6 bg-[#d9f2ff] rounded-[16px] overflow-hidden border border-blue-100">
      
      {/* Image Section */}
      <div className="p-3">
        <img
          src="/CTAImage.png"
          alt="CTA Image"
          className="h-48 w-full object-cover rounded-[8px]"
        />
      </div>

      {/* Content Section */}
      <div className="p-6 text-center">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Get Started Today
        </h3>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          To apply to jobs with one-click and connect with founders and recruiters searching for your skills.
        </p>

        <Link href="/register">
          <Button className="w-full">
            Create Your Account
          </Button>
        </Link>
      </div>
    </div>
  );
}