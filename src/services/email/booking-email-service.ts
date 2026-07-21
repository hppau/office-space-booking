import nodemailer from "nodemailer";

type BookingEmailData = {
  bookingId: number;
  bookingNumber: string;
  employeeName: string;
  employeeEmail: string;
  resourceName: string;
  resourceCode: string;
  officeName: string;
  floorName: string;
  startAt: Date;
  endAt: Date;
  reason: string;
  rejectionReason?: string | null;
};

type SendBookingEmailRequest = {
  type: "APPROVED" | "REJECTED";
  booking: BookingEmailData;
};

function getSmtpPort() {
  const rawPort = process.env.SMTP_PORT ?? "587";
  const port = Number(rawPort);

  return Number.isFinite(port) ? port : 587;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Singapore",
  }).format(date);
}

function createTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("SMTP email settings are missing.");
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: getSmtpPort(),
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

function getFromAddress() {
  return (
    process.env.SMTP_FROM ??
    process.env.SMTP_USER ??
    "Office Booking System"
  );
}

function buildApprovedEmail(booking: BookingEmailData) {
  const subject = `Booking Approved: ${booking.bookingNumber}`;

  const body = `
Hello ${booking.employeeName},

Your workspace booking has been approved.

Booking Details:
Booking Reference: ${booking.bookingNumber}
Space: ${booking.resourceCode} - ${booking.resourceName}
Location: ${booking.officeName} · ${booking.floorName}
Start: ${formatDateTime(booking.startAt)}
End: ${formatDateTime(booking.endAt)}
Reason: ${booking.reason}

Please use the booked space only during the approved time.

Thank you.
Office Space Booking System
`;

  return {
    subject,
    body,
  };
}

function buildRejectedEmail(booking: BookingEmailData) {
  const subject = `Booking Rejected: ${booking.bookingNumber}`;

  const body = `
Hello ${booking.employeeName},

Your workspace booking has been rejected.

Booking Details:
Booking Reference: ${booking.bookingNumber}
Space: ${booking.resourceCode} - ${booking.resourceName}
Location: ${booking.officeName} · ${booking.floorName}
Start: ${formatDateTime(booking.startAt)}
End: ${formatDateTime(booking.endAt)}
Reason: ${booking.reason}

Rejection Reason:
${booking.rejectionReason ?? "No reason was provided."}

You may create a new booking request if needed.

Thank you.
Office Space Booking System
`;

  return {
    subject,
    body,
  };
}

export async function sendBookingStatusEmail({
  type,
  booking,
}: SendBookingEmailRequest) {
  const transporter = createTransporter();

  const emailContent =
    type === "APPROVED"
      ? buildApprovedEmail(booking)
      : buildRejectedEmail(booking);

  await transporter.sendMail({
    from: getFromAddress(),
    to: booking.employeeEmail,
    subject: emailContent.subject,
    text: emailContent.body,
  });

  return emailContent;
}