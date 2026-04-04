import * as nodemailer from 'nodemailer';
import { emailTemplates } from './emailTemplates';  

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`Email failed to ${to}:`, err);
    throw err;
  }
}

export const emailService = {
  async sendVerificationCode(to: string, name: string, code: string) {
    const { subject, html } = emailTemplates.verificationCode(name, code);
    await sendEmail(to, subject, html);
  },

  async sendPasswordReset(to: string, name: string, resetLink: string) {
    const { subject, html } = emailTemplates.passwordReset(name, resetLink);
    await sendEmail(to, subject, html);
  },

  async sendInterviewInvite(
    to: string,
    seekerName: string,
    jobTitle: string,
    companyName: string,
    date: string,
    time: string,
    venue: string
  ) {
    const { subject, html } = emailTemplates.interviewInvite(
      seekerName, jobTitle, companyName, date, time, venue
    );
    await sendEmail(to, subject, html);
  },

  async sendRejectionNotice(
    to: string,
    seekerName: string,
    jobTitle: string,
    companyName: string,
    reason: string,
    aiMessage: string
  ) {
    const { subject, html } = emailTemplates.rejectionNotice(
      seekerName, jobTitle, companyName, reason, aiMessage
    );
    await sendEmail(to, subject, html);
  },

  async sendApplicationReceived(
    to: string,
    companyName: string,
    seekerName: string,
    jobTitle: string
  ) {
    const { subject, html } = emailTemplates.applicationReceived(
      companyName, seekerName, jobTitle
    );
    await sendEmail(to, subject, html);
  },
};