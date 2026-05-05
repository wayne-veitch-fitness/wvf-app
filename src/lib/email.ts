import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM  = process.env.RESEND_FROM  || 'WVF App <onboarding@resend.dev>'
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://wvf-app.vercel.app')
)

export function emailWrapper(title: string, body: string) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;padding:0 16px;">

    <!-- Header -->
    <div style="background:#20243D;padding:20px 24px;border-radius:12px 12px 0 0;">
      <span style="color:white;font-size:16px;font-weight:700;letter-spacing:0.02em;">Wayne Veitch Fitness</span>
    </div>

    <!-- Body -->
    <div style="background:white;border:1px solid #e5e7eb;border-top:none;padding:28px 24px;border-radius:0 0 12px 12px;">
      ${body}
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin:16px 0;">
      WVF Client App &nbsp;·&nbsp; This is an automated notification
    </p>
  </div>
</body>
</html>`
}
