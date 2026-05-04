export function renderPasswordResetHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:#020403;color:#e8f5ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:24px">
    <div style="background:#07110c;border-radius:10px;padding:32px;border:1px solid rgba(90,255,150,0.22);text-align:center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 18px">
        <tr>
          <td style="padding-right:10px;vertical-align:middle">
            <div style="width:18px;height:18px;border-radius:6px 2px 6px 2px;background:#39ff88;box-shadow:0 0 8px rgba(57,255,136,0.45)"></div>
          </td>
          <td style="vertical-align:middle">
            <span style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#39ff88;font-weight:700">xenoform.ai</span>
          </td>
        </tr>
      </table>
      <h1 style="margin:0 0 16px;font-size:20px;color:#e8f5ee;font-weight:600">Reset your password</h1>
      <p style="margin:0 0 24px;color:#8fa99a;font-size:14px;line-height:1.6">
        We received a request to reset your xenoform.ai password. Click the button below to choose a new one.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#39ff88;color:#02110a;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:0.01em">
        Reset password
      </a>
      <p style="margin:24px 0 0;color:#5f776b;font-size:12px;line-height:1.5">
        This link expires in 2 hours. If you didn\u2019t request this, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function renderPasswordResetText(resetUrl: string): string {
  return `Reset your xenoform.ai password\n\nVisit this link to choose a new password:\n${resetUrl}\n\nThis link expires in 2 hours. If you didn't request this, you can safely ignore this email.`;
}
