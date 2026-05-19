import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendVerificationEmail(
  to: string,
  code: string
): Promise<boolean> {
  // Skip if SMTP not configured
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.log(`[DEV] Verification code for ${to}: ${code}`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"CodeSteppe" <${process.env.SMTP_EMAIL}>`,
      to,
      subject: "Баталгаажуулах код - CodeSteppe",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8b5cf6; margin: 0;">CodeSteppe</h1>
            <p style="color: #666; margin-top: 5px;">Coding Battle Arena</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 20px;">
            <p style="color: rgba(255,255,255,0.9); margin: 0 0 15px 0; font-size: 14px;">Таны баталгаажуулах код:</p>
            <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 15px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: white;">${code}</span>
            </div>
          </div>
          
          <p style="color: #666; font-size: 13px; text-align: center;">
            Энэ код 10 минутын дотор хүчинтэй.<br>
            Хэрэв та энэ хүсэлтийг илгээгээгүй бол үл тоомсорлоно уу.
          </p>
          
          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
            <p style="color: #999; font-size: 11px; margin: 0;">
              © ${new Date().getFullYear()} CodeSteppe. Бүх эрх хуулиар хамгаалагдсан.
            </p>
          </div>
        </div>
      `,
    });
    console.log(`Verification email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}
