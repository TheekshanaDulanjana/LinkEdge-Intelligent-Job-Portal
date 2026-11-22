import OverviewClient from '@/components/landing/OverviewClient';
import { getSiteContent } from '@/lib/siteContent';

// Text is edited in the admin back-office, so it is read on every visit.
export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const c = await getSiteContent();
  return <OverviewClient content={c.pageOverview} />;
}
