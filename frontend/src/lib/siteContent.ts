import defaults from './contentDefaults.json';

/**
 * Editable landing-page content. The admin back-office saves these blocks in the database;
 * `contentDefaults.json` is the built-in copy (identical to what the database is seeded with)
 * and is used whenever the content service cannot be reached.
 */

export interface LinkButton { label: string; href: string }
export interface Feature { icon: string; title: string; description: string }

export interface HeroContent {
  badge: string; titleLine1: string; titleLine2: string; description: string;
  primaryButton: LinkButton; secondaryButton: LinkButton;
  pathsTitle: string; pathsSubtitle: string; paths: string[];
}
export interface WhyContent { tag: string; title: string; learnMoreUrl: string; registerUrl: string; features: Feature[] }
export interface CareerPathsContent { tag: string; title: string; description: string; paths: string[] }
export interface Testimonial { category: string; name: string; designation: string; feedback: string; image: string }
export interface TestimonialsContent { tag: string; titleLine1: string; titleLine2: string; description: string; items: Testimonial[] }
export interface FaqContent { tag: string; title: string; description: string; items: { question: string; answer: string }[] }
export interface BenefitPageContent {
  heroTag: string; heroTitle: string; heroDescription: string;
  sections: { tag: string; title: string; description: string; points: string[] }[];
}
export interface OverviewContent {
  hero: { badge: string; title: string; description: string };
  about: { tag: string; title: string; body: string; stats: { stat: string; label: string }[] };
  partners: { label: string; names: string[] };
  capabilities: { tag: string; title: string; description: string; items: { tag: string; title: string; description: string }[] };
  workflow: { tag: string; title: string; description: string };
  impact: { tag: string; title: string };
}

export interface SiteContent {
  hero: HeroContent;
  whySeekers: WhyContent;
  whyRecruiters: WhyContent;
  careerPaths: CareerPathsContent;
  testimonials: TestimonialsContent;
  faq: FaqContent;
  pageSeeker: BenefitPageContent;
  pageCompanies: BenefitPageContent;
  pageOverview: OverviewContent;
}

export const DEFAULT_CONTENT = defaults as unknown as SiteContent;

const BASE =
  process.env.AUTH_SERVICE_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ||
  'http://localhost:3001/api/v1';

/** Server-side: current content from the database, per block falling back to the built-in default. */
export async function getSiteContent(): Promise<SiteContent> {
  try {
    const res = await fetch(`${BASE}/content`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    const data = json?.data ?? {};
    return { ...DEFAULT_CONTENT, ...Object.fromEntries(Object.entries(data).filter(([k, v]) => k in DEFAULT_CONTENT && v)) } as SiteContent;
  } catch {
    return DEFAULT_CONTENT;
  }
}
