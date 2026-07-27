const nodemailer = require("nodemailer");
const { ACTION_EXPIRY_MINUTES } = require("./accountAction");

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const sendOtpEmail = async (to, name, otp) => {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await getTransporter().sendMail({
    from,
    to,
    subject: "Verify your email - FinTrack",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Verify your email</h2>
        <p style="color: #4b5563;">Hi ${name},</p>
        <p style="color: #4b5563;">Use the code below to verify your email address. This code expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4338ca; text-align: center; margin: 24px 0;">${otp}</p>
        <p style="color: #9ca3af; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

const sendFeedbackEmail = async (user, message, attachments = []) => {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const to = process.env.FEEDBACK_TO_EMAIL || from;

  await getTransporter().sendMail({
    from,
    to,
    replyTo: user.email,
    subject: `FinTrack Feedback from ${user.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1f2937;">New feedback received</h2>
        <p style="color: #4b5563;"><strong>${user.name}</strong> (${user.email}) sent the following feedback:</p>
        <p style="color: #4b5563; white-space: pre-wrap; border-left: 3px solid #4338ca; padding-left: 12px;">${message}</p>
      </div>
    `,
    attachments: attachments.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype,
    })),
  });
};

const sendChangeEmailLink = async (to, name, link) => {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await getTransporter().sendMail({
    from,
    to,
    subject: "Confirm your email change - FinTrack",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Change your email address</h2>
        <p style="color: #4b5563;">Hi ${name},</p>
        <p style="color: #4b5563;">We received a request to change the email address on your FinTrack account. Click the button below to choose your new email. This link expires in ${ACTION_EXPIRY_MINUTES} minutes.</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${link}" style="background: #4338ca; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">Change Email</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

const sendResetPasswordLink = async (to, name, link) => {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await getTransporter().sendMail({
    from,
    to,
    subject: "Reset your password - FinTrack",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Reset your password</h2>
        <p style="color: #4b5563;">Hi ${name},</p>
        <p style="color: #4b5563;">We received a request to change the password on your FinTrack account. Click the button below to choose a new password. This link expires in ${ACTION_EXPIRY_MINUTES} minutes.</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${link}" style="background: #4338ca; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">Reset Password</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail, sendFeedbackEmail, sendChangeEmailLink, sendResetPasswordLink };
