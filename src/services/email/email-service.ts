import nodemailer from "nodemailer";

type SendVerificationEmailRequest = {
  to: string;
  fullName: string;
  verificationUrl: string;
};

function getSmtpPort() {
  const rawPort = process.env.SMTP_PORT ?? "587";
  const port = Number(rawPort);

  if (!Number.isFinite(port)) {
    return 587;
  }

  return port;
}

export async function sendVerificationEmail({
  to,
  fullName,
  verificationUrl,
}: SendVerificationEmailRequest) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM;

  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    throw new Error("SMTP email settings are missing.");
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: getSmtpPort(),
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject: "Verify your Office Booking account",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Verify your account</h2>
        <p>Hello ${fullName},</p>
        <p>Thank you for signing up for the Office Space Booking System.</p>
        <p>Please click the button below to verify your email address and activate your account.</p>
        <p>
          <a href="${verificationUrl}"
             style="display: inline-block; padding: 12px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">
            Verify Email
          </a>
        </p>
        <p>If the button does not work, copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `,
  });
}