import BenefitsPage from '@/components/landing/BenefitsPage';
import { getSiteContent } from '@/lib/siteContent';

// Text is edited in the admin back-office, so it is read on every visit.
export const dynamic = 'force-dynamic';

export default async function Page() {
  const c = await getSiteContent();
  return <BenefitsPage content={c.pageSeeker} />;
}
