import type { Metadata } from 'next';
import LegalPage, { type LegalSection } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy | SkillSync',
  description: 'How SkillSync collects, uses, stores and protects your personal data.',
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'Who we are',
    paragraphs: [
      'SkillSync is an online hiring platform built in Sri Lanka. It helps job seekers understand how their CV matches a job and practise interviews, and helps companies review and rank applicants. In this policy, "SkillSync", "we" and "us" mean the operator of the platform.',
      'We handle personal data in line with the Personal Data Protection Act, No. 9 of 2022 of Sri Lanka and the principles of lawfulness, purpose limitation, data minimisation, accuracy, security and accountability.',
    ],
  },
  {
    heading: 'What we collect',
    list: [
      'Account details: your name, email address, role (job seeker or company) and a hashed password. If you sign in with Google, we receive your name, email address and profile photo from Google.',
      'Profile details: skills, education, work experience, location, portfolio, GitHub or other links you choose to add, and a profile photo. For companies: company name, description, logo and cover image.',
      'CV files: the PDF documents you upload, and the text and skills we extract from them.',
      'Activity: jobs you view or apply to, application status and feedback, interview schedules, and your interview practice answers and scores.',
      'Technical data: IP address, browser type and security logs that help us prevent abuse and fix errors. We store a session token in your browser to keep you signed in.',
    ],
  },
  {
    heading: 'How we use your data',
    list: [
      'To create and manage your account and show you relevant jobs or applicants.',
      'To score a CV against a job description, show matched and missing skills, suggest courses and run interview practice.',
      'To let companies review the applications you send them, and to let you track their responses.',
      'To send service emails such as verification codes, password resets, application updates and interview invitations.',
      'To keep the platform secure, prevent fraud and abuse, and meet legal obligations.',
    ],
    paragraphs: ['We do not sell your personal data and we do not use it for third-party advertising.'],
  },
  {
    heading: 'AI features and automated scoring',
    paragraphs: [
      'Match scores, skill gap reports and interview feedback are produced with the help of automated systems, including a third-party AI model (Google Gemini). The text needed for the analysis, such as CV content or your interview answers, is sent to that service for processing.',
      'These outputs are a guide only. Companies make every hiring decision themselves, and no one is rejected by the platform without a human decision.',
    ],
  },
  {
    heading: 'Who can see your data',
    list: [
      'Companies can see your profile and CV only when you apply to one of their jobs. Your CV is stored as a private file and is not publicly accessible.',
      'Service providers who process data for us: cloud hosting and content delivery (Cloudflare), image storage (Cloudflare R2), email delivery (Brevo) and AI processing (Google). They may only use the data to provide their service to us.',
      'Authorities, where we are legally required to disclose information.',
    ],
  },
  {
    heading: 'Storage, security and retention',
    paragraphs: [
      'Passwords are stored as one-way hashes, connections are encrypted in transit, access between our internal services is authenticated, and we apply rate limits and file checks to reduce abuse.',
      'We keep your data while your account is active and for as long as needed to provide the service. When you ask us to delete your account, we delete or anonymise your personal data unless the law requires us to keep it. No system is perfectly secure, so please use a strong, unique password.',
    ],
  },
  {
    heading: 'Your rights',
    paragraphs: ['Subject to the law, you may ask us to:'],
    list: [
      'give you access to the personal data we hold about you;',
      'correct data that is wrong or incomplete (most details can be edited in your profile);',
      'delete your data or close your account;',
      'stop or restrict certain processing, or withdraw your consent where we rely on it.',
    ],
  },
  {
    heading: 'Cookies and local storage',
    paragraphs: [
      'We use essential browser storage to keep you signed in and to remember basic preferences. We do not use advertising cookies.',
    ],
  },
  {
    heading: "Children",
    paragraphs: ['SkillSync is intended for people aged 18 and over. If you believe a child has given us personal data, please contact us and we will remove it.'],
  },
  {
    heading: 'Changes to this policy',
    paragraphs: ['We may update this policy as the platform changes. We will change the date at the top and, for significant changes, notify you by email or on the site.'],
  },
  {
    heading: 'Contact us',
    paragraphs: ['For questions or requests about your personal data, email info.linkedge@gmail.com.'],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      tag="Legal"
      title="Privacy Policy"
      intro="What we collect, why we collect it, who sees it and the choices you have."
      updated="22 November 2026"
      sections={SECTIONS}
    />
  );
}
