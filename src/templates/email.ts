const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")

const layout = (bodyContent: string) => `
<!DOCTYPE html>
<html><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
        <tr><td align="center" style="background:linear-gradient(135deg,#5B4FE9,#7B6FFF);padding:40px 30px;color:white;">
          <h1 style="margin:0;font-size:32px;font-weight:700;">hr-workplace</h1>
        </td></tr>
        <tr><td style="padding:50px 40px;">${bodyContent}</td></tr>
        <tr><td style="background:#fafafa;padding:30px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;color:#888;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
          <p style="margin-top:16px;color:#999;font-size:12px;">© ${new Date().getFullYear()} hr-workplace. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

export const verificationEmailTemplate = (params: { fullName: string; verifyUrl: string }) =>
  layout(`
    <h2 style="margin:0 0 20px;color:#222;font-size:28px;">Welcome, ${escapeHtml(params.fullName)} 👋</h2>
    <p style="color:#555;font-size:16px;line-height:1.7;margin-bottom:24px;">
      Verify your email to activate your organization's account.
    </p>
    <div style="text-align:center;margin:40px 0;">
      <a href="${params.verifyUrl}" style="background:#5B4FE9;color:white;text-decoration:none;padding:16px 36px;border-radius:10px;display:inline-block;font-size:16px;font-weight:600;">
        Verify My Email
      </a>
    </div>
    <div style="background:#f5f4ff;border-left:4px solid #5B4FE9;padding:16px;border-radius:8px;margin:30px 0;">
      <p style="margin:0;color:#444;font-size:14px;">This link expires in <strong>24 hours</strong>.</p>
    </div>
    <p style="color:#666;font-size:14px;line-height:1.7;">If the button doesn't work, paste this URL:</p>
    <p style="word-break:break-all;color:#5B4FE9;font-size:13px;">${params.verifyUrl}</p>
  `)

export const passwordResetEmailTemplate = (params: { fullName: string; resetUrl: string }) =>
  layout(`
    <h2 style="margin:0 0 20px;color:#222;font-size:28px;">Reset your password</h2>
    <p style="color:#555;font-size:16px;line-height:1.7;margin-bottom:24px;">
      Hi ${escapeHtml(params.fullName)}, we received a request to reset your password.
    </p>
    <div style="text-align:center;margin:40px 0;">
      <a href="${params.resetUrl}" style="background:#5B4FE9;color:white;text-decoration:none;padding:16px 36px;border-radius:10px;display:inline-block;font-size:16px;font-weight:600;">
        Reset Password
      </a>
    </div>
    <div style="background:#fff5f5;border-left:4px solid #E05252;padding:16px;border-radius:8px;margin:30px 0;">
      <p style="margin:0;color:#444;font-size:14px;">This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email — your password won't change.</p>
    </div>
  `)
