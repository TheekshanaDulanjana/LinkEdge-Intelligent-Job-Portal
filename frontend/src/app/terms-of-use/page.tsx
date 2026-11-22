import type { Metadata } from 'next';
import LegalPage, { type LegalSection } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Use | SkillSync',
  description: 'The rules for using the SkillSync hiring platform.',
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'Agreement',
    paragraphs: [
      'These terms govern your use of SkillSync, a hiring platform built in Sri Lanka. By creating an account or using the site you agree to them and to our Privacy Policy. If you do not agree, please do not use the platform.',
    ],
  },
  {
    heading: 'Your account',
    list: [
      'You must be at least 18 years old and able to enter into a binding agreement.',
      'Each account has one role: job seeker or company. Give accurate information and keep it up to date.',
      'Keep your password secret. You are responsible for activity on your account, and you must tell us promptly if you suspect unauthorised use.',
      'Company accounts must be created by someone authorised to act for that company.',
    ],
  },
  {
    heading: 'What job seekers agree to',
    list: [
      'Your profile, CV and answers are true and are yours to share.',
      'You will not upload content that is unlawful, misleading, or contains malware or other people\'s private data.',
      'You understand that applying shares your profile and CV with that company.',
    ],
  },
  {
    heading: 'What companies agree to',
    list: [
      'Job posts are genuine, lawful and not discriminatory, and describe the role honestly.',
      'You will charge no fee to applicants and will not ask for payment, bank or identity-document details.',
      'You will use applicant data only for recruitment, and protect it as required by law, including the Personal Data Protection Act, No. 9 of 2022.',
    ],
  },
  {
    heading: 'Acceptable use',
    paragraphs: ['You must not:'],
    list: [
      'scrape, copy or resell data from the platform, or interfere with its operation;',
      'attempt to access accounts, systems or data you are not authorised to use;',
      'harass others, impersonate anyone or post spam;',
      'misuse the AI features, for example to generate harmful content or to overload the service.',
    ],
  },
  {
    heading: 'AI features',
    paragraphs: [
      'Match scores, skill gap reports and interview feedback are produced by automated systems and can be wrong or incomplete. They are provided as guidance, not as professional advice or a guarantee of any outcome. Companies remain solely responsible for their hiring decisions.',
    ],
  },
  {
    heading: 'Jobs and third parties',
    paragraphs: [
      'SkillSync is a platform that connects people. We do not employ job seekers, are not a party to any employment contract and do not guarantee that a job will be filled or that an applicant is suitable. Course suggestions link to third-party providers whose content and terms we do not control.',
    ],
  },
  {
    heading: 'Content and licence',
    paragraphs: [
      'You keep ownership of the content you submit. You give SkillSync a limited licence to store, process and display it as needed to run the service, including sharing your CV with companies you apply to. The SkillSync name, design and software belong to us and may not be copied without permission.',
    ],
  },
  {
    heading: 'Availability and changes',
    paragraphs: [
      'We work to keep the platform available but cannot promise it will always be uninterrupted or error free. We may change or remove features, and we may update these terms. Continuing to use SkillSync after a change means you accept the updated terms.',
    ],
  },
  {
    heading: 'Suspension and termination',
    paragraphs: [
      'You can close your account at any time by contacting us. We may suspend or remove accounts or content that breach these terms or put others at risk.',
    ],
  },
  {
    heading: 'Liability',
    paragraphs: [
      'To the fullest extent the law allows, SkillSync is provided "as is", and we are not liable for indirect or consequential loss, or for loss of opportunity or profit arising from your use of the platform. Nothing in these terms limits liability that cannot be limited by law.',
    ],
  },
  {
    heading: 'Governing law',
    paragraphs: ['These terms are governed by the laws of Sri Lanka, and the courts of Sri Lanka have jurisdiction over any dispute.'],
  },
  {
    heading: 'Contact',
    paragraphs: ['Questions about these terms: info.linkedge@gmail.com.'],
  },
];

export default function TermsOfUsePage() {
  return (
    <LegalPage
      tag="Legal"
      title="Terms of Use"
      intro="The simple ground rules for using SkillSync as a job seeker or as a company."
      updated="22 November 2026"
      sections={SECTIONS}
    />
  );
}
