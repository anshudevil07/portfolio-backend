import nodemailer from "nodemailer";

// Create transporter lazily so dotenv has already loaded
const getTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

export const sendPortfolioConfirmation = async ({ name, email, slug, editToken }) => {
  const portfolioUrl = `${process.env.PORTFOLIO_BASE_URL}/${slug}`;
  const editUrl = `${process.env.HOME_URL}/edit/${editToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="margin:0;padding:0;background:#0a0e17;font-family:'Segoe UI',sans-serif;color:#eae5ec;">
      <div style="max-width:560px;margin:40px auto;background:#0f1623;border:1px solid rgba(94,234,212,0.15);border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,rgba(94,234,212,0.1),rgba(34,211,238,0.05));padding:32px;text-align:center;border-bottom:1px solid rgba(94,234,212,0.1);">
          <div style="width:12px;height:12px;border-radius:50%;background:#5eead4;box-shadow:0 0 12px #5eead4;display:inline-block;margin-bottom:16px;"></div>
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;">Your Portfolio is Live! 🎉</h1>
        </div>
        <div style="padding:32px;">
          <p style="color:rgba(234,229,236,0.7);line-height:1.7;margin:0 0 24px;">
            Hey <strong style="color:#fff;">${name}</strong>, your 3D portfolio has been created and is live right now!
          </p>
          <div style="background:rgba(94,234,212,0.06);border:1px solid rgba(94,234,212,0.2);border-radius:10px;padding:16px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:12px;color:rgba(234,229,236,0.4);text-transform:uppercase;letter-spacing:2px;">Your Portfolio URL</p>
            <a href="${portfolioUrl}" style="color:#5eead4;font-size:14px;word-break:break-all;">${portfolioUrl}</a>
          </div>
          <a href="${portfolioUrl}" style="display:block;text-align:center;background:#5eead4;color:#0a0e17;padding:14px 24px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:24px;">
            View My Portfolio →
          </a>
          <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
            <p style="margin:0 0 8px;font-size:13px;color:rgba(234,229,236,0.5);">Want to update your portfolio later?</p>
            <a href="${editUrl}" style="color:#5eead4;font-size:13px;">Use your edit link →</a>
            <p style="margin:8px 0 0;font-size:11px;color:rgba(234,229,236,0.3);">Keep this email safe — this is the only way to edit your portfolio.</p>
          </div>
        </div>
        <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(234,229,236,0.3);">© 2026 PortfolioGen</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `🎉 Your portfolio is live, ${name}!`,
      html,
    });
    console.log(`✓ Confirmation email sent to ${email}`);
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
};

export const sendAdminNotification = async ({ name, email, slug }) => {
  const portfolioUrl = `${process.env.PORTFOLIO_BASE_URL}/${slug}`;
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER,
      subject: `New portfolio submitted: ${name}`,
      html: `
        <div style="font-family:sans-serif;padding:20px;background:#f9f9f9;">
          <h2 style="color:#0a0e17;">New Portfolio Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>URL:</strong> <a href="${portfolioUrl}">${portfolioUrl}</a></p>
        </div>
      `,
    });
    console.log(`✓ Admin notification sent`);
  } catch (err) {
    console.error("Admin email failed:", err.message);
  }
};
