export const FROM    = 'WVF App <noreply@mail.wvfitness.com.au>'
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://wvf-app.vercel.app')
)

export async function sendEmail({
  to, subject, html,
}: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping email')
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
  }
}

export function emailWrapper(body: string) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;padding:0 16px;">
    <div style="background:#20243D;padding:20px 24px;border-radius:12px 12px 0 0;">
      <span style="color:white;font-size:16px;font-weight:700;letter-spacing:0.02em;">Wayne Veitch Fitness</span>
    </div>
    <div style="background:white;border:1px solid #e5e7eb;border-top:none;padding:28px 24px;border-radius:0 0 12px 12px;">
      ${body}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin:16px 0;">
      WVF Client App &nbsp;·&nbsp; This is an automated notification
    </p>
  </div>
</body>
</html>`
}
