import nodemailer from 'nodemailer'

// ─── Transport ────────────────────────────────────────────────────────────────

const smtpEnabled = process.env.SMTP_ENABLED === 'true'

const transporter = nodemailer.createTransport(
  smtpEnabled
    ? {
        host:   process.env.SMTP_HOST   ?? 'smtp.gmail.com',
        port:   Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER ?? '',
          pass: process.env.SMTP_PASS ?? '',
        },
      }
    : { jsonTransport: true }  // dev mode: log to console, never actually sends
)

const FROM    = process.env.EMAIL_FROM ?? 'EduTrack <noreply@edutrack.tz>'
const APP_URL = process.env.APP_URL    ?? 'http://localhost:3000'

// ─── Core send ────────────────────────────────────────────────────────────────

export const sendEmail = async (opts: {
  to:      string
  subject: string
  html:    string
}): Promise<void> => {
  try {
    const info = await transporter.sendMail({ from: FROM, ...opts })

    if (!smtpEnabled) {
      // In dev, nodemailer returns the JSON envelope — log the subject so devs
      // can confirm emails would fire without needing a real SMTP server.
      console.log(`[email] 📨 "${opts.subject}" → ${opts.to}`)
    } else {
      console.log(`[email] ✅ Sent "${opts.subject}" → ${opts.to} (id: ${(info as any).messageId})`)
    }
  } catch (err) {
    // Emails must never crash the main request flow
    console.error(`[email] ❌ Failed to send "${opts.subject}" → ${opts.to}:`, err)
  }
}

// ─── Shared layout wrapper ────────────────────────────────────────────────────

const layout = (body: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EduTrack</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a56db;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.5px;">
                📚 EduTrack
              </h1>
              <p style="margin:4px 0 0;color:#a5c0f7;font-size:13px;">School Management System</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f6f9;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                © ${new Date().getFullYear()} EduTrack · This is an automated message, please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

// ─── Button helper ────────────────────────────────────────────────────────────

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#1a56db;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">${label}</a>`

// ─── Templates ───────────────────────────────────────────────────────────────

// 1. Teacher registered — tell admin a new account needs review
export const teacherRegisteredEmail = (opts: {
  adminEmail:   string
  adminName:    string
  teacherName:  string
  teacherEmail: string
  schoolName:   string
}) =>
  sendEmail({
    to:      opts.adminEmail,
    subject: `New teacher registration — ${opts.teacherName}`,
    html: layout(`
      <h2 style="margin:0 0 8px;color:#111827;font-size:18px;">New Teacher Registration</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">Hello ${opts.adminName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;">
        A new teacher has registered and is waiting for your approval at <strong>${opts.schoolName}</strong>.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;width:35%;">Name</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;">${opts.teacherName}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Email</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;border-top:1px solid #e5e7eb;">${opts.teacherEmail}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">School</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;border-top:1px solid #e5e7eb;font-weight:600;">${opts.schoolName}</td>
        </tr>
      </table>

      <p style="color:#374151;font-size:14px;margin-top:24px;line-height:1.6;">
        Please log in to the EduTrack admin panel to review and approve or reject this registration.
      </p>

      ${btn(`${APP_URL}/admin/users/pending`, 'Review Registration')}
    `),
  })

// 2. Account approved — tell teacher they can now log in
export const accountApprovedEmail = (opts: {
  teacherEmail: string
  teacherName:  string
  schoolName:   string
}) =>
  sendEmail({
    to:      opts.teacherEmail,
    subject: 'Your EduTrack account has been approved',
    html: layout(`
      <h2 style="margin:0 0 8px;color:#111827;font-size:18px;">Account Approved ✅</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">Hello ${opts.teacherName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;">
        Great news! Your EduTrack account at <strong>${opts.schoolName}</strong> has been
        <span style="color:#059669;font-weight:700;">approved</span>. You can now log in and
        start using the system.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #d1fae5;border-radius:6px;overflow:hidden;background:#f0fdf4;">
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;width:35%;">Email</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;">${opts.teacherEmail}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-top:1px solid #d1fae5;">School</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;border-top:1px solid #d1fae5;font-weight:600;">${opts.schoolName}</td>
        </tr>
      </table>

      <p style="color:#374151;font-size:14px;margin-top:24px;line-height:1.6;">
        Use your registered email and the password you set during registration to log in.
      </p>

      ${btn(`${APP_URL}/login`, 'Log In Now')}
    `),
  })

// 3. Account rejected — tell teacher why (optional note)
export const accountRejectedEmail = (opts: {
  teacherEmail: string
  teacherName:  string
  schoolName:   string
  note?:        string
}) =>
  sendEmail({
    to:      opts.teacherEmail,
    subject: 'Your EduTrack registration was not approved',
    html: layout(`
      <h2 style="margin:0 0 8px;color:#111827;font-size:18px;">Registration Update</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">Hello ${opts.teacherName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;">
        We regret to inform you that your EduTrack registration at <strong>${opts.schoolName}</strong>
        was <span style="color:#dc2626;font-weight:700;">not approved</span> by the school administrator.
      </p>

      ${opts.note ? `
      <div style="margin-top:20px;padding:16px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:0 4px 4px 0;">
        <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">Administrator note:</p>
        <p style="margin:6px 0 0;font-size:14px;color:#7f1d1d;">${opts.note}</p>
      </div>` : ''}

      <p style="color:#374151;font-size:14px;margin-top:24px;line-height:1.6;">
        If you believe this is a mistake, please contact your school administrator directly.
      </p>
    `),
  })

// 4. Leave submitted — tell admin/principal a new request arrived
export const leaveSubmittedEmail = (opts: {
  adminEmail:  string
  adminName:   string
  teacherName: string
  startDate:   string
  endDate:     string
  days:        number
  reason:      string
}) =>
  sendEmail({
    to:      opts.adminEmail,
    subject: `Leave request from ${opts.teacherName}`,
    html: layout(`
      <h2 style="margin:0 0 8px;color:#111827;font-size:18px;">New Leave Request</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">Hello ${opts.adminName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;">
        <strong>${opts.teacherName}</strong> has submitted a leave request that requires your review.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;width:35%;">Teacher</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;">${opts.teacherName}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">From</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;border-top:1px solid #e5e7eb;">${opts.startDate}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">To</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;border-top:1px solid #e5e7eb;">${opts.endDate}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Working days</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;border-top:1px solid #e5e7eb;font-weight:600;">${opts.days}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Reason</td>
          <td style="padding:10px 16px;font-size:13px;color:#374151;border-top:1px solid #e5e7eb;">${opts.reason}</td>
        </tr>
      </table>

      ${btn(`${APP_URL}/admin/leaves`, 'Review Request')}
    `),
  })

// 5. Leave approved — tell teacher their leave is confirmed
export const leaveApprovedEmail = (opts: {
  teacherEmail: string
  teacherName:  string
  startDate:    string
  endDate:      string
  days:         number
  note?:        string
}) =>
  sendEmail({
    to:      opts.teacherEmail,
    subject: 'Your leave request has been approved',
    html: layout(`
      <h2 style="margin:0 0 8px;color:#111827;font-size:18px;">Leave Approved ✅</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">Hello ${opts.teacherName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;">
        Your leave request has been <span style="color:#059669;font-weight:700;">approved</span>.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #d1fae5;border-radius:6px;overflow:hidden;background:#f0fdf4;">
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;width:35%;">From</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;">${opts.startDate}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-top:1px solid #d1fae5;">To</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;border-top:1px solid #d1fae5;font-weight:600;">${opts.endDate}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-top:1px solid #d1fae5;">Working days</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;border-top:1px solid #d1fae5;font-weight:600;">${opts.days}</td>
        </tr>
      </table>

      ${opts.note ? `
      <div style="margin-top:20px;padding:16px;background:#ecfdf5;border-left:4px solid #059669;border-radius:0 4px 4px 0;">
        <p style="margin:0;font-size:13px;color:#065f46;font-weight:600;">Note from administrator:</p>
        <p style="margin:6px 0 0;font-size:14px;color:#064e3b;">${opts.note}</p>
      </div>` : ''}

      <p style="color:#374151;font-size:14px;margin-top:24px;line-height:1.6;">
        Your attendance will be automatically recorded as absent for these dates. Have a good rest!
      </p>
    `),
  })

// 6. Leave rejected — tell teacher their request was denied
export const leaveRejectedEmail = (opts: {
  teacherEmail: string
  teacherName:  string
  startDate:    string
  endDate:      string
  note?:        string
}) =>
  sendEmail({
    to:      opts.teacherEmail,
    subject: 'Your leave request was not approved',
    html: layout(`
      <h2 style="margin:0 0 8px;color:#111827;font-size:18px;">Leave Request Update</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">Hello ${opts.teacherName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;">
        Unfortunately, your leave request from <strong>${opts.startDate}</strong> to
        <strong>${opts.endDate}</strong> was
        <span style="color:#dc2626;font-weight:700;">not approved</span>.
      </p>

      ${opts.note ? `
      <div style="margin-top:20px;padding:16px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:0 4px 4px 0;">
        <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">Reason:</p>
        <p style="margin:6px 0 0;font-size:14px;color:#7f1d1d;">${opts.note}</p>
      </div>` : ''}

      <p style="color:#374151;font-size:14px;margin-top:24px;line-height:1.6;">
        If you have questions, please speak directly with your school administrator.
      </p>
    `),
  })
