import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
const SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

async function callNotificationService(endpoint: string, data: object) {
  try {
    await axios.post(`${NOTIFICATION_URL}${endpoint}`, data, {
      headers: { 'x-service-key': SERVICE_KEY },
      timeout: 8000,
    });
  } catch (e) {
    console.error(`Notification call failed [${endpoint}]:`, e);
  }
}

async function createInAppNotification(
  receiverId: string,
  type: string,
  title: string,
  message: string,
  metadata?: object
) {
  await prisma.notification.create({
    data: {
      receiverId: receiverId,
      type: type as any,
      title,
      message,
      metadata: metadata as any,
      isRead: false,
    },
  });
}

export const notificationHelper = {

  async newApplicationReceived(
    companyUserId: string,
    seekerName: string,
    jobTitle: string,
    companyEmail: string,
    companyName: string,
    applicationId: string,
    jobId: string
  ) {
    // In-app notification
    await createInAppNotification(
      companyUserId,
      'NEW_APPLICATION',
      'New Application Received',
      `${seekerName} applied for your ${jobTitle} position.`,
      { applicationId, jobId }
    );
    // Email notification
    await callNotificationService('/send/application-received', {
      to: companyEmail, companyName, seekerName, jobTitle,
    });
  },

  async applicationShortlisted(
    seekerUserId: string,
    seekerEmail: string,
    seekerName: string,
    jobTitle: string,
    companyName: string,
    applicationId: string
  ) {
    await createInAppNotification(
      seekerUserId,
      'APPLICATION_SHORTLISTED',
      'Application Shortlisted!',
      `Congratulations! You have been shortlisted for ${jobTitle} at ${companyName}.`,
      { applicationId }
    );
  },

  async interviewScheduled(
    seekerUserId: string,
    seekerEmail: string,
    seekerName: string,
    jobTitle: string,
    companyName: string,
    date: string,
    time: string,
    venue: string,
    applicationId: string
  ) {
    await createInAppNotification(
      seekerUserId,
      'INTERVIEW_SCHEDULED',
      'Interview Invitation!',
      `You have been invited for an interview for ${jobTitle} at ${companyName} on ${date} at ${time}.`,
      { applicationId, date, time, venue }
    );
    await callNotificationService('/send/interview-invite', {
      to: seekerEmail, seekerName, jobTitle, companyName, date, time, venue,
    });
  },

  async applicationRejected(
    seekerUserId: string,
    seekerEmail: string,
    seekerName: string,
    jobTitle: string,
    companyName: string,
    reason: string,
    aiMessage: string,
    applicationId: string
  ) {
    await createInAppNotification(
      seekerUserId,
      'APPLICATION_REJECTED',
      'Application Update',
      `Your application for ${jobTitle} at ${companyName} was not successful.`,
      { applicationId, reason }
    );
    await callNotificationService('/send/rejection', {
      to: seekerEmail, seekerName, jobTitle, companyName, reason, aiMessage,
    });
  },
};