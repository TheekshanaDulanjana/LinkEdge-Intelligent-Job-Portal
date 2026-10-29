import { z } from 'zod';
import defaults from '../content/defaults.json';
import { prisma } from './db';

/**
 * Landing-page / marketing content that the admin can edit.
 * Every block has: a validation schema (what the admin may save), a built-in default
 * (seeded into the database on first start, and used by "Reset to default").
 */

// Icons the landing page knows how to draw (the frontend maps these names to lucide icons).
export const ICONS = [
  'Search', 'GraduationCap', 'Mic', 'BarChart3', 'ShieldCheck', 'ClipboardCheck', 'Sparkles', 'Target',
  'Users', 'Zap', 'FileText', 'Briefcase', 'Award', 'TrendingUp', 'Clock', 'Lock', 'Rocket', 'Heart',
  'Globe', 'MessageSquare',
] as const;

const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const text = (max: number, min = 0) =>
  z.string().transform((s) => s.replace(CTRL, '').trim()).pipe(
    z.string().min(min, min === 1 ? 'This field is required' : `Must be at least ${min} characters`).max(max, `Must be at most ${max} characters`)
  );
// Site-relative path or http(s) link only. Rules out javascript:, data: and protocol-relative URLs.
const link = z.string().transform((s) => s.replace(CTRL, '').trim()).pipe(
  z.string().min(1, 'Link is required').max(300, 'Link is too long').refine(
    (v) => (v.startsWith('/') && !v.startsWith('//') && !v.includes('\\')) || /^https?:\/\/[^\s]+$/i.test(v),
    'Use a site path like /jobs or a full http(s) link'
  )
);
const imageUrl = z.string().transform((s) => s.replace(CTRL, '').trim()).pipe(
  z.string().max(500).refine((v) => v === '' || /^https?:\/\/[^\s]+$/i.test(v), 'Image must be an uploaded image or an http(s) link')
);
const list = <T extends z.ZodTypeAny>(item: T, min: number, max: number) => z.array(item).min(min, `Add at least ${min}`).max(max, `At most ${max} items`);

const button = z.object({ label: text(30, 1), href: link });
const feature = z.object({ icon: z.enum(ICONS), title: text(60, 1), description: text(300, 1) });
const whySchema = z.object({
  tag: text(40, 1), title: text(80, 1), learnMoreUrl: link, registerUrl: link, features: list(feature, 1, 8),
});
const pageSchema = z.object({
  heroTag: text(60, 1), heroTitle: text(120, 1), heroDescription: text(300, 1),
  sections: list(z.object({
    tag: text(60, 1), title: text(160, 1), description: text(500, 1), points: list(text(160, 1), 1, 8),
  }), 1, 6),
});

export const CONTENT_BLOCKS = {
  hero: {
    label: 'Landing page - Hero',
    description: 'Badge, title, description, buttons and the career-path pills in the hero section.',
    schema: z.object({
      badge: text(80, 1), titleLine1: text(80, 1), titleLine2: text(80, 1), description: text(500, 1),
      primaryButton: button, secondaryButton: button,
      pathsTitle: text(40, 1), pathsSubtitle: text(40),
      paths: list(text(40, 1), 1, 30),
    }),
  },
  whySeekers: {
    label: 'Landing page - Why Job Seekers Love SkillSync',
    description: 'Tag, title and the feature points shown for job seekers.',
    schema: whySchema,
  },
  whyRecruiters: {
    label: 'Landing page - Why Recruiters Love SkillSync',
    description: 'Tag, title and the feature points shown for recruiters.',
    schema: whySchema,
  },
  careerPaths: {
    label: 'Landing page - Choose Your Career Path',
    description: 'Section heading and the list of career paths.',
    schema: z.object({ tag: text(40, 1), title: text(80, 1), description: text(300, 1), paths: list(text(50, 1), 1, 60) }),
  },
  testimonials: {
    label: 'Landing page - Careers found. Teams built.',
    description: 'Section heading and the feedback cards (category, feedback, name, designation, image).',
    schema: z.object({
      tag: text(50, 1), titleLine1: text(60, 1), titleLine2: text(60, 1), description: text(300, 1),
      items: list(z.object({
        category: text(30, 1), name: text(60, 1), designation: text(80, 1), feedback: text(500, 1), image: imageUrl,
      }), 1, 40),
    }),
  },
  faq: {
    label: 'Landing page - Frequently Asked Questions',
    description: 'Section heading and the questions with their answers.',
    schema: z.object({
      tag: text(40, 1), title: text(80, 1), description: text(300, 1),
      items: list(z.object({ question: text(200, 1), answer: text(1000, 1) }), 1, 30),
    }),
  },
  pageSeeker: {
    label: 'Page - For Job Seekers',
    description: 'Hero and benefit sections of the /seeker page.',
    schema: pageSchema,
  },
  pageCompanies: {
    label: 'Page - For Companies',
    description: 'Hero and benefit sections of the /companies page.',
    schema: pageSchema,
  },
  pageOverview: {
    label: 'Page - Overview',
    description: 'Hero, about, partners, capabilities and workflow headings of the /overview page.',
    schema: z.object({
      hero: z.object({ badge: text(80, 1), title: text(120, 1), description: text(300, 1) }),
      about: z.object({
        tag: text(40, 1), title: text(160, 1), body: text(800, 1),
        stats: list(z.object({ stat: text(20, 1), label: text(120, 1) }), 1, 8),
      }),
      partners: z.object({ label: text(120, 1), names: list(text(40, 1), 0, 12) }),
      capabilities: z.object({
        tag: text(40, 1), title: text(160, 1), description: text(300, 1),
        items: list(z.object({ tag: text(40, 1), title: text(80, 1), description: text(300, 1) }), 1, 9),
      }),
      workflow: z.object({ tag: text(40, 1), title: text(120, 1), description: text(400, 1) }),
      impact: z.object({ tag: text(40, 1), title: text(120, 1) }),
    }),
  },
} as const;

export type ContentKey = keyof typeof CONTENT_BLOCKS;
export const CONTENT_KEYS = Object.keys(CONTENT_BLOCKS) as ContentKey[];
export const isContentKey = (k: string): k is ContentKey => (CONTENT_KEYS as string[]).includes(k);
export const DEFAULTS = defaults as Record<ContentKey, unknown>;

/** Insert any block that is not in the database yet. Never overwrites admin edits. */
export async function seedContent() {
  for (const key of CONTENT_KEYS) {
    const parsed = CONTENT_BLOCKS[key].schema.safeParse(DEFAULTS[key]);
    if (!parsed.success) throw new Error(`Built-in default for "${key}" is invalid: ${parsed.error.issues[0]?.message}`);
    await prisma.siteContent.upsert({
      where: { key },
      create: { key, value: parsed.data as any, updatedBy: 'system' },
      update: {},
    });
  }
}

/** All blocks for the public site: database value if present and valid, otherwise the default. */
export async function loadPublicContent(): Promise<Record<string, unknown>> {
  const rows = await prisma.siteContent.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const out: Record<string, unknown> = {};
  for (const key of CONTENT_KEYS) {
    const parsed = CONTENT_BLOCKS[key].schema.safeParse(byKey.get(key));
    out[key] = parsed.success ? parsed.data : DEFAULTS[key];
  }
  return out;
}
