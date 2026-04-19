export function renderPasswordResetHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#070b10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:24px">
    <div style="background:#111827;border-radius:10px;padding:32px;border:1px solid #2a3544;text-align:center">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;color:#22d3ee;font-weight:600">KAIROS</p>
      <h1 style="margin:0 0 16px;font-size:20px;color:#f8fafc">Reset your password</h1>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.5">
        We received a request to reset your Kairos password. Click the button below to choose a new one.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#22d3ee;color:#05080c;text-decoration:none;padding:12px 32px;border-radius:999px;font-size:14px;font-weight:600">
        Reset password
      </a>
      <p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.5">
        This link expires in 2 hours. If you didn\u2019t request this, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function renderPasswordResetText(resetUrl: string): string {
  return `Reset your Kairos password\n\nVisit this link to choose a new password:\n${resetUrl}\n\nThis link expires in 2 hours. If you didn't request this, you can safely ignore this email.`;
}
