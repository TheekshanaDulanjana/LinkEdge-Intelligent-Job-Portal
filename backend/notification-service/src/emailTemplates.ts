export const emailTemplates = {
  verificationCode: (name: string, code: string) => ({
    subject: 'Verify your email - Intelligent Job Portal',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px;">
        <h1 style="color:#1e293b;font-size:24px;margin-bottom:8px;">Verify your email</h1>
        <p style="color:#64748b;font-size:16px;">Hi ${name}, welcome to the Intelligent Job Portal.</p>
        <p style="color:#64748b;">Use the code below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#ffffff;border:2px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
          <p style="font-size:40px;font-weight:700;letter-spacing:12px;color:#6366f1;margin:0;">${code}</p>
        </div>
        <p style="color:#94a3b8;font-size:14px;">If you did not create an account, you can safely ignore this email.</p>
      </div>
    `,
  }),

  passwordReset: (name: string, resetLink: string) => ({
    subject: 'Reset your password - Intelligent Job Portal',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px;">
        <h1 style="color:#1e293b;font-size:24px;">Reset your password</h1>
        <p style="color:#64748b;">Hi ${name}, click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetLink}" style="background:#6366f1;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Reset Password</a>
        </div>
        <p style="color:#94a3b8;font-size:13px;">If you didn't request this, ignore this email. Your password won't change.</p>
      </div>
    `,
  }),

  interviewInvite: (
    seekerName: string,
    jobTitle: string,
    companyName: string,
    date: string,
    time: string,
    venue: string
  ) => ({
    subject: `Interview Invitation - ${jobTitle} at ${companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px;">
        <h1 style="color:#1e293b;font-size:22px;">You've been invited for an interview!</h1>
        <p style="color:#64748b;">Hi ${seekerName}, congratulations! <strong>${companyName}</strong> would like to interview you for the <strong>${jobTitle}</strong> position.</p>
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin:24px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#64748b;width:100px;">Date</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${date}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Time</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${time}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Venue</td><td style="padding:8px 0;font-weight:600;color:#1e293b;">${venue}</td></tr>
          </table>
        </div>
        <p style="color:#64748b;">Please confirm your attendance by replying to this email. We recommend logging into the portal to practice your interview beforehand.</p>
        <p style="color:#94a3b8;font-size:13px;">Best of luck!</p>
      </div>
    `,
  }),

  shortlisted: (
    seekerName: string,
    jobTitle: string,
    companyName: string
  ) => ({
    subject: `Great news! You've been shortlisted - ${jobTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px;">
        <h1 style="color:#1e293b;font-size:22px;">You've been shortlisted!</h1>
        <p style="color:#64748b;">Hi ${seekerName}, great news - <strong>${companyName}</strong> has shortlisted your application for the <strong>${jobTitle}</strong> position.</p>
        <p style="color:#64748b;">We'll be in touch soon with next steps. In the meantime, log in to the portal to keep your profile up to date.</p>
        <p style="color:#94a3b8;font-size:13px;">Best of luck!</p>
      </div>
    `,
  }),

  rejectionNotice: (
    seekerName: string,
    jobTitle: string,
    companyName: string,
    reason: string,
    aiMessage: string
  ) => ({
    subject: `Application Update — ${jobTitle} at ${companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px;">
        <h1 style="color:#1e293b;font-size:22px;">Application Status Update</h1>
        <p style="color:#64748b;">Hi ${seekerName}, thank you for applying for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
        <p style="color:#64748b;">After careful consideration, we will not be moving forward with your application at this time.</p>
        <div style="background:#fff7ed;border-left:4px solid #f97316;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;">
          <p style="color:#9a3412;font-weight:700;font-size:15px;margin:0 0 10px;">${reason}</p>
          <p style="color:#7c4a1e;margin:0;font-size:14px;line-height:1.6;">${aiMessage}</p>
        </div>
        <p style="color:#64748b;">We encourage you to continue developing in this area and to apply again for future roles that may be a better fit. Your profile shows real potential.</p>
      </div>
    `,
  }),

  applicationReceived: (
    companyName: string,
    seekerName: string,
    jobTitle: string
  ) => ({
    subject: `New Application - ${jobTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px;">
        <h1 style="color:#1e293b;font-size:22px;">New Application Received</h1>
        <p style="color:#64748b;">Hi ${companyName}, <strong>${seekerName}</strong> has applied for your <strong>${jobTitle}</strong> position.</p>
        <p style="color:#64748b;">Log in to the portal to review their application and CV.</p>
      </div>
    `,
  }),
};